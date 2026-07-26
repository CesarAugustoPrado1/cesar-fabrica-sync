import { parseFecha, parseNumero, getAttr } from './erp-common';
import { sql } from './db';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx';

// Función para obtener fechas de los últimos 2 meses
function getUltimosDosMeses() {
    const ahora = new Date();
    const desde = new Date(ahora);
    desde.setMonth(ahora.getMonth() - 2);
    const desdeStr = desde.toISOString().split('.')[0];
    const hastaStr = ahora.toISOString().split('.')[0];
    return { desde: desdeStr, hasta: hastaStr };
}

// Función auxiliar para extraer el array de NotaDePedido de la respuesta
function extraerNotasDePedido(result: any): any[] {
    try {
        const envelope = result['soap:Envelope'];
        if (!envelope) return [];
        const body = envelope['soap:Body'];
        if (!body) return [];
        const response = body['ObtenerNotasDePedidoResponse'];
        if (!response) return [];
        const resultNode = response['ObtenerNotasDePedidoResult'];
        if (!resultNode) return [];
        const notasDePedidoNode = resultNode['NotasDePedido'];
        if (!notasDePedidoNode) return [];
        let notas = notasDePedidoNode['NotaDePedido'];
        if (!notas) return [];
        if (!Array.isArray(notas)) notas = [notas];
        return notas;
    } catch (e) {
        console.error('❌ Error extrayendo notas:', e);
        return [];
    }
}

export async function syncNotasDePedido() {
    console.log('🔄 Iniciando sincronización de notas de pedido (últimos 2 meses)...');

    try {
        const { desde, hasta } = getUltimosDosMeses();
        console.log(`📅 Período: ${desde} → ${hasta}`);

        // Construir filtro para últimos 2 meses (sin atributos visibles)
        const filtrosXML = `
            <ns:Filtros>
                <ns:Filtro>
                    <ns:Atributo>FechaDeEmision</ns:Atributo>
                    <ns:Comparador>GreaterOrEqualsThan</ns:Comparador>
                    <ns:Valor>${desde}</ns:Valor>
                </ns:Filtro>
                <ns:Filtro>
                    <ns:Atributo>FechaDeEmision</ns:Atributo>
                    <ns:Comparador>LowerOrEqualsThan</ns:Comparador>
                    <ns:Valor>${hasta}</ns:Valor>
                </ns:Filtro>
            </ns:Filtros>
        `;

        // XML sin la sección AtributosVisibles
        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ns="http://plataforma.net.ar/">
  <soap:Body>
    <ns:ObtenerNotasDePedido>
      ${filtrosXML}
    </ns:ObtenerNotasDePedido>
  </soap:Body>
</soap:Envelope>`;

        console.log('📤 Enviando solicitud SOAP para notas de pedido...');
        console.log(`🔹 SOAPAction: http://plataforma.net.ar/ObtenerNotasDePedido`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        try {
            const response = await fetch(SOAP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'http://plataforma.net.ar/ObtenerNotasDePedido',
                },
                body: soapEnvelope,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error en notas de pedido:', errorText);
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }

            const xmlText = await response.text();
            console.log('✅ Respuesta recibida para notas de pedido');

            // Guardar respuesta cruda para depuración
            const fs = await import('fs');
            fs.writeFileSync('debug-notas-pedido.xml', xmlText);
            console.log('💾 Respuesta completa guardada en debug-notas-pedido.xml');

            // Parsear XML a JSON
            const { parseStringPromise } = await import('xml2js');
            const result = await parseStringPromise(xmlText, {
                explicitArray: false,
                mergeAttrs: false,
                ignoreAttrs: false,
                attrkey: '$',
                charkey: '_',
                trim: true,
            });

            // Extraer manualmente las notas de pedido
            const notas = extraerNotasDePedido(result);
            console.log(`📦 Notas de pedido obtenidas del ERP: ${notas.length}`);

            if (notas.length === 0) {
                console.warn('⚠️ No se encontraron notas de pedido en el período.');
                return;
            }

            // Mostrar el primer elemento para ver qué atributos tiene
            if (notas.length > 0) {
                console.log('🔍 Ejemplo de atributos en la primera nota:', JSON.stringify(notas[0].$, null, 2));
            }

            let procesadosCabecera = 0;
            let procesadosDetalle = 0;
            let errores = 0;

            for (const nota of notas) {
                try {
                    // Obtener el identificador compuesto
                    const idCompuesto = getAttr(nota, 'NotaDePedido');
                    if (!idCompuesto) {
                        console.warn('⚠️ Nota sin identificador, saltando...');
                        continue;
                    }

                    // Parsear el ID compuesto: formato "division-tipo-numero"
                    const partes = idCompuesto.split('-');
                    if (partes.length !== 3) {
                        console.warn(`⚠️ ID compuesto inválido: ${idCompuesto}, saltando...`);
                        continue;
                    }

                    const division = parseInt(partes[0]) || 0;
                    const tipo = partes[1] || '';
                    const numero = parseInt(partes[2]) || 0;

                    // Extraer los demás atributos (si existen) del objeto nota.$
                    const attr = nota.$ || {};

                    const cabecera = {
                        division: division,
                        tipo: tipo,
                        numero: numero,
                        fecha_emision: parseFecha(getAttr(attr, 'FechaDeEmision')),
                        cliente_id: parseInt(getAttr(attr, 'Cliente') || '0'),
                        moneda: getAttr(attr, 'Moneda'),
                        condicion_pago: getAttr(attr, 'CondicionDePago'),
                        importe_bruto: parseNumero(getAttr(attr, 'ImporteBrutoMonedaOrigen')),
                        importe_total: parseNumero(getAttr(attr, 'ImporteTotalMonedaOrigen')),
                        estado_aprobacion: getAttr(attr, 'EstadoDeAprobacion'),
                        fecha_alta: parseFecha(getAttr(attr, 'FechaDeAlta')),
                        observacion: getAttr(attr, 'Observacion'),
                        cliente_nombre: getAttr(attr, 'ClienteNombre'),
                        clasificacion1: getAttr(attr, 'Clasificacion1Pedido'),
                        clasificacion2: getAttr(attr, 'Clasificacion2Pedido'),
                        clasificacion3: getAttr(attr, 'Clasificacion3Pedido'),
                        clasificacion4: getAttr(attr, 'Clasificacion4Pedido'),
                        clasificacion5: getAttr(attr, 'Clasificacion5Pedido'),
                        clasificacion6: getAttr(attr, 'Clasificacion6Pedido'),
                    };

                    // Insertar o actualizar cabecera
                    const columnsCab = Object.keys(cabecera);
                    const valuesCab = columnsCab.map((_, i) => `$${i + 1}`).join(', ');
                    const updateSetCab = columnsCab.map(col => `${col} = EXCLUDED.${col}`).join(', ');

                    const queryCab = `
                        INSERT INTO notas_pedido_cabecera (${columnsCab.join(', ')})
                        VALUES (${valuesCab})
                        ON CONFLICT (division, tipo, numero) DO UPDATE SET
                            ${updateSetCab},
                            ultima_sincronizacion = CURRENT_TIMESTAMP
                    `;

                    await sql.query(queryCab, Object.values(cabecera));
                    procesadosCabecera++;

                    // Procesar detalle (si existe)
                    const detalleNode = nota['Detalle'];
                    if (detalleNode) {
                        let items = Array.isArray(detalleNode) ? detalleNode : [detalleNode];
                        for (const item of items) {
                            let renglones = item['Renglon'] || item['RenglonDeVenta'];
                            if (!renglones) continue;
                            if (!Array.isArray(renglones)) renglones = [renglones];

                            for (const renglon of renglones) {
                                try {
                                    const detalle = {
                                        division: cabecera.division,
                                        tipo: cabecera.tipo,
                                        numero: cabecera.numero,
                                        renglon: parseInt(getAttr(renglon, 'Renglon') || '0'),
                                        articulo_id: parseInt(getAttr(renglon, 'ArticuloID') || '0'),
                                        cantidad_pedida: parseNumero(getAttr(renglon, 'CantidadPedida')),
                                        precio_neto: parseNumero(getAttr(renglon, 'PrecioNeto_SI')),
                                        unidad_medida: getAttr(renglon, 'UnidadDeMedida'),
                                        articulo_nombre: getAttr(renglon, 'ArticuloNombre'),
                                    };

                                    const columnsDet = Object.keys(detalle);
                                    const valuesDet = columnsDet.map((_, i) => `$${i + 1}`).join(', ');
                                    const updateSetDet = columnsDet.map(col => `${col} = EXCLUDED.${col}`).join(', ');

                                    const queryDet = `
                                        INSERT INTO notas_pedido_detalle (${columnsDet.join(', ')})
                                        VALUES (${valuesDet})
                                        ON CONFLICT (division, tipo, numero, renglon) DO UPDATE SET
                                            ${updateSetDet},
                                            ultima_sincronizacion = CURRENT_TIMESTAMP
                                    `;

                                    await sql.query(queryDet, Object.values(detalle));
                                    procesadosDetalle++;
                                } catch (error) {
                                    errores++;
                                    console.error(`❌ Error procesando renglón ${cabecera.division}-${cabecera.tipo}-${cabecera.numero}:`, error);
                                }
                            }
                        }
                    }

                    if (procesadosCabecera % 50 === 0) {
                        console.log(`📊 Cabeceras procesadas: ${procesadosCabecera}, Detalles: ${procesadosDetalle}`);
                    }

                } catch (error) {
                    errores++;
                    console.error(`❌ Error procesando nota de pedido:`, error);
                }
            }

            console.log(`📊 Resumen notas de pedido:`);
            console.log(`   Cabeceras procesadas: ${procesadosCabecera}`);
            console.log(`   Detalles procesados: ${procesadosDetalle}`);
            console.log(`   Errores: ${errores}`);
            console.log('✅ Sincronización de notas de pedido completada');

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }

    } catch (error) {
        console.error('❌ Error en syncNotasDePedido:', error);
        throw error;
    }
}
