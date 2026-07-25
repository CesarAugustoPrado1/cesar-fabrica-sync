import { syncGenerico, parseFecha, parseNumero, getAttr, findAllItems } from './erp-common';
import { sql } from './db';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx';

// Atributos de cabecera que vamos a pedir
const atributosCabecera = [
    'Division', 'Tipo', 'Numero', 'FechaDeEmision', 'Cliente', 'Moneda',
    'CondicionDePago', 'ImporteBrutoMonedaOrigen', 'ImporteTotalMonedaOrigen',
    'EstadoDeAprobacion', 'FechaDeAlta', 'Observacion', 'ClienteNombre',
    'Clasificacion1Pedido', 'Clasificacion2Pedido', 'Clasificacion3Pedido',
    'Clasificacion4Pedido', 'Clasificacion5Pedido', 'Clasificacion6Pedido',
    'Detalle' // Necesario para obtener los renglones
];

// Atributos que se piden al ERP (todos los que necesites)
const atributos = atributosCabecera;

export async function syncNotasDePedido() {
    console.log('🔄 Iniciando sincronización de notas de pedido (2026)...');

    try {
        // Construir filtro para año 2026
        const filtrosXML = `
            <ns:Filtros>
                <ns:Filtro>
                    <ns:Atributo>FechaDeEmision</ns:Atributo>
                    <ns:Comparador>GreaterOrEqualsThan</ns:Comparador>
                    <ns:Valor>2026-01-01T00:00:00</ns:Valor>
                </ns:Filtro>
                <ns:Filtro>
                    <ns:Atributo>FechaDeEmision</ns:Atributo>
                    <ns:Comparador>LowerOrEqualsThan</ns:Comparador>
                    <ns:Valor>2026-12-31T23:59:59</ns:Valor>
                </ns:Filtro>
            </ns:Filtros>
        `;

        const atributosXML = atributos.map(attr =>
            `<NotaDePedidoAtributos>${attr}</NotaDePedidoAtributos>`
        ).join('');

        const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ns="http://plataforma.net.ar/">
  <soap:Body>
    <ns:ObtenerNotasDePedido>
      <ns:AtributosVisibles>
        ${atributosXML}
      </ns:AtributosVisibles>
      ${filtrosXML}
    </ns:ObtenerNotasDePedido>
  </soap:Body>
</soap:Envelope>`;

        console.log('📤 Enviando solicitud SOAP para notas de pedido...');
        console.log(`🔹 SOAPAction: http://plataforma.net.ar/ObtenerNotasDePedido`);

        const response = await fetch(SOAP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://plataforma.net.ar/ObtenerNotasDePedido',
            },
            body: soapEnvelope,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en notas de pedido:', errorText);
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const xmlText = await response.text();
        console.log('✅ Respuesta recibida para notas de pedido');

        const { parseStringPromise } = await import('xml2js');
        const result = await parseStringPromise(xmlText, {
            explicitArray: false,
            mergeAttrs: false,
            ignoreAttrs: false,
            attrkey: '$',
            charkey: '_',
            trim: true,
        });

        // Buscar las notas de pedido en la respuesta
        const notas = findAllItems(result, 'NotaDePedido', 'Numero');
        console.log(`📦 Notas de pedido obtenidas del ERP: ${notas.length}`);

        if (notas.length === 0) {
            console.warn('⚠️ No se encontraron notas de pedido para 2026.');
            return;
        }

        let procesadosCabecera = 0;
        let procesadosDetalle = 0;
        let errores = 0;

        for (const nota of notas) {
            try {
                // Extraer cabecera
                const cabecera = {
                    division: parseInt(getAttr(nota, 'Division') || '0'),
                    tipo: getAttr(nota, 'Tipo'),
                    numero: parseInt(getAttr(nota, 'Numero') || '0'),
                    fecha_emision: parseFecha(getAttr(nota, 'FechaDeEmision')),
                    cliente_id: parseInt(getAttr(nota, 'Cliente') || '0'),
                    moneda: getAttr(nota, 'Moneda'),
                    condicion_pago: getAttr(nota, 'CondicionDePago'),
                    importe_bruto: parseNumero(getAttr(nota, 'ImporteBrutoMonedaOrigen')),
                    importe_total: parseNumero(getAttr(nota, 'ImporteTotalMonedaOrigen')),
                    estado_aprobacion: getAttr(nota, 'EstadoDeAprobacion'),
                    fecha_alta: parseFecha(getAttr(nota, 'FechaDeAlta')),
                    observacion: getAttr(nota, 'Observacion'),
                    cliente_nombre: getAttr(nota, 'ClienteNombre'),
                    clasificacion1: getAttr(nota, 'Clasificacion1Pedido'),
                    clasificacion2: getAttr(nota, 'Clasificacion2Pedido'),
                    clasificacion3: getAttr(nota, 'Clasificacion3Pedido'),
                    clasificacion4: getAttr(nota, 'Clasificacion4Pedido'),
                    clasificacion5: getAttr(nota, 'Clasificacion5Pedido'),
                    clasificacion6: getAttr(nota, 'Clasificacion6Pedido'),
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
                    // Detalle puede ser un array o un objeto
                    let items = Array.isArray(detalleNode) ? detalleNode : [detalleNode];
                    // Cada item puede tener varios renglones
                    for (const item of items) {
                        // El item puede tener un array de Renglones
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
        console.error('❌ Error en syncNotasDePedido:', error);
        throw error;
    }
}
