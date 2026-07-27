// lib/sync-notas-pedido.ts
import { sql } from './db';

const ERP_URL = "http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx";
const SOAP_ACTION = "http://plataforma.net.ar/ObtenerNotasDePedido";

// =====================================================
// FUNCIÓN PRINCIPAL: Sincronizar cabeceras de notas de pedido
// =====================================================
export async function syncNotasDePedido() {
  console.log('🔄 Iniciando sincronización de notas de pedido (cabeceras)...');

  try {
    const soapRequest = construirSoapRequest();
    
    console.log('📤 Enviando solicitud SOAP para notas de pedido...');
    console.log(`🔹 SOAPAction: ${SOAP_ACTION}`);

    const response = await fetch(ERP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': SOAP_ACTION,
      },
      body: soapRequest,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en notas de pedido:', errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('✅ Respuesta recibida para notas de pedido');

    const notas = extraerNotasDePedido(xmlText);
    
    if (notas.length === 0) {
      console.log('📭 No se encontraron notas de pedido en el período especificado.');
      return { procesados: 0, errores: 0 };
    }

    console.log(`📦 Notas de pedido obtenidas del ERP: ${notas.length}`);
    const resultado = await guardarNotasDePedido(notas);
    console.log(`✅ Sincronización de notas de pedido completada`);
    return resultado;

  } catch (error) {
    console.error('❌ Error en syncNotasDePedido:', error);
    throw error;
  }
}

// =====================================================
// CONSTRUIR SOLICITUD SOAP
// =====================================================
function construirSoapRequest(): string {
  const fechaDesde = new Date();
  fechaDesde.setMonth(fechaDesde.getMonth() - 2);
  const fechaDesdeStr = fechaDesde.toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://plataforma.net.ar/">
  <soap:Body>
    <ns:ObtenerNotasDePedido>
      <ns:AtributosVisibles>
        <ns:NotaDePedidoAtributos>Numero</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>FechaDeEmision</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Cliente</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>ClienteNombre</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Moneda</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>CondicionDePago</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>ImporteBrutoMonedaOrigen</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>ImporteTotalMonedaOrigen</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>EstadoDeAprobacion</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Division</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Tipo</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Observacion</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>FechaDeAlta</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Clasificacion1Pedido</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Clasificacion2Pedido</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Clasificacion3Pedido</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Clasificacion4Pedido</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Clasificacion5Pedido</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Clasificacion6Pedido</ns:NotaDePedidoAtributos>
      </ns:AtributosVisibles>
      <ns:Filtros>
        <ns:Filtro>
          <ns:Atributo>FechaDeAlta</ns:Atributo>
          <ns:Comparador>GreaterOrEqualsThan</ns:Comparador>
          <ns:Valor>${fechaDesdeStr}</ns:Valor>
        </ns:Filtro>
      </ns:Filtros>
    </ns:ObtenerNotasDePedido>
  </soap:Body>
</soap:Envelope>`;
}

// =====================================================
// EXTRAER NOTAS DE PEDIDO DEL XML
// =====================================================
function extraerNotasDePedido(xml: string): any[] {
  const notas: any[] = [];
  
  const resultMatch = xml.match(/<ObtenerNotasDePedidoResult>([\s\S]*?)<\/ObtenerNotasDePedidoResult>/);
  if (!resultMatch) {
    console.warn('⚠️ No se encontró ObtenerNotasDePedidoResult en la respuesta.');
    return [];
  }

  const innerXml = resultMatch[1];
  const notaMatches = innerXml.match(/<NotaDePedido([\s\S]*?)<\/NotaDePedido>/g);
  if (!notaMatches) {
    console.warn('⚠️ No se encontraron notas de pedido en la respuesta.');
    return [];
  }

  for (const match of notaMatches) {
    const nota: any = {};
    
    const numMatch = match.match(/<Numero>([^<]*)<\/Numero>/);
    const fechaMatch = match.match(/<FechaDeEmision>([^<]*)<\/FechaDeEmision>/);
    const clienteMatch = match.match(/<Cliente>([^<]*)<\/Cliente>/);
    const clienteNomMatch = match.match(/<ClienteNombre>([^<]*)<\/ClienteNombre>/);
    const monedaMatch = match.match(/<Moneda>([^<]*)<\/Moneda>/);
    const condPagoMatch = match.match(/<CondicionDePago>([^<]*)<\/CondicionDePago>/);
    const importeBrutoMatch = match.match(/<ImporteBrutoMonedaOrigen>([^<]*)<\/ImporteBrutoMonedaOrigen>/);
    const importeTotalMatch = match.match(/<ImporteTotalMonedaOrigen>([^<]*)<\/ImporteTotalMonedaOrigen>/);
    const estadoMatch = match.match(/<EstadoDeAprobacion>([^<]*)<\/EstadoDeAprobacion>/);
    const divisionMatch = match.match(/<Division>([^<]*)<\/Division>/);
    const tipoMatch = match.match(/<Tipo>([^<]*)<\/Tipo>/);
    const obsMatch = match.match(/<Observacion>([^<]*)<\/Observacion>/);
    const fechaAltaMatch = match.match(/<FechaDeAlta>([^<]*)<\/FechaDeAlta>/);
    
    // Clasificaciones (del 1 al 6)
    const clasif1 = match.match(/<Clasificacion1Pedido>([^<]*)<\/Clasificacion1Pedido>/);
    const clasif2 = match.match(/<Clasificacion2Pedido>([^<]*)<\/Clasificacion2Pedido>/);
    const clasif3 = match.match(/<Clasificacion3Pedido>([^<]*)<\/Clasificacion3Pedido>/);
    const clasif4 = match.match(/<Clasificacion4Pedido>([^<]*)<\/Clasificacion4Pedido>/);
    const clasif5 = match.match(/<Clasificacion5Pedido>([^<]*)<\/Clasificacion5Pedido>/);
    const clasif6 = match.match(/<Clasificacion6Pedido>([^<]*)<\/Clasificacion6Pedido>/);

    if (numMatch) nota.numero = parseInt(numMatch[1]);
    if (fechaMatch) nota.fecha_emision = new Date(fechaMatch[1]);
    if (clienteMatch) nota.cliente_id = parseInt(clienteMatch[1]);
    if (clienteNomMatch) nota.cliente_nombre = clienteNomMatch[1];
    if (monedaMatch) nota.moneda = monedaMatch[1];
    if (condPagoMatch) nota.condicion_pago = condPagoMatch[1];
    if (importeBrutoMatch) nota.importe_bruto = parseFloat(importeBrutoMatch[1]) || 0;
    if (importeTotalMatch) nota.importe_total = parseFloat(importeTotalMatch[1]) || 0;
    if (estadoMatch) nota.estado_aprobacion = estadoMatch[1];
    if (divisionMatch) nota.division = parseInt(divisionMatch[1]) || 0;
    if (tipoMatch) nota.tipo = tipoMatch[1];
    if (obsMatch) nota.observacion = obsMatch[1];
    if (fechaAltaMatch) nota.fecha_alta = new Date(fechaAltaMatch[1]);
    if (clasif1) nota.clasificacion1 = clasif1[1];
    if (clasif2) nota.clasificacion2 = clasif2[1];
    if (clasif3) nota.clasificacion3 = clasif3[1];
    if (clasif4) nota.clasificacion4 = clasif4[1];
    if (clasif5) nota.clasificacion5 = clasif5[1];
    if (clasif6) nota.clasificacion6 = clasif6[1];

    if (nota.numero) {
      notas.push(nota);
    }
  }

  return notas;
}

// =====================================================
// GUARDAR NOTAS DE PEDIDO EN NEON
// =====================================================
async function guardarNotasDePedido(notas: any[]) {
  if (notas.length === 0) {
    console.log('⚠️ No hay notas de pedido para guardar.');
    return { procesados: 0, errores: 0 };
  }

  console.log(`💾 Guardando ${notas.length} notas de pedido en Neon...`);
  let contador = 0;
  let errores = 0;

  for (const nota of notas) {
    try {
      await sql`
        INSERT INTO notas_pedido_cabecera (
          division,
          tipo,
          numero,
          fecha_emision,
          cliente_id,
          moneda,
          condicion_pago,
          importe_bruto,
          importe_total,
          estado_aprobacion,
          fecha_alta,
          observacion,
          cliente_nombre,
          clasificacion1,
          clasificacion2,
          clasificacion3,
          clasificacion4,
          clasificacion5,
          clasificacion6,
          ultima_sincronizacion
        ) VALUES (
          ${nota.division || 0},
          ${nota.tipo || null},
          ${nota.numero},
          ${nota.fecha_emision || null},
          ${nota.cliente_id || null},
          ${nota.moneda || null},
          ${nota.condicion_pago || null},
          ${nota.importe_bruto || 0},
          ${nota.importe_total || 0},
          ${nota.estado_aprobacion || null},
          ${nota.fecha_alta || null},
          ${nota.observacion || null},
          ${nota.cliente_nombre || null},
          ${nota.clasificacion1 || null},
          ${nota.clasificacion2 || null},
          ${nota.clasificacion3 || null},
          ${nota.clasificacion4 || null},
          ${nota.clasificacion5 || null},
          ${nota.clasificacion6 || null},
          NOW()
        )
        ON CONFLICT (numero, division) DO UPDATE SET
          tipo = EXCLUDED.tipo,
          fecha_emision = EXCLUDED.fecha_emision,
          cliente_id = EXCLUDED.cliente_id,
          moneda = EXCLUDED.moneda,
          condicion_pago = EXCLUDED.condicion_pago,
          importe_bruto = EXCLUDED.importe_bruto,
          importe_total = EXCLUDED.importe_total,
          estado_aprobacion = EXCLUDED.estado_aprobacion,
          fecha_alta = EXCLUDED.fecha_alta,
          observacion = EXCLUDED.observacion,
          cliente_nombre = EXCLUDED.cliente_nombre,
          clasificacion1 = EXCLUDED.clasificacion1,
          clasificacion2 = EXCLUDED.clasificacion2,
          clasificacion3 = EXCLUDED.clasificacion3,
          clasificacion4 = EXCLUDED.clasificacion4,
          clasificacion5 = EXCLUDED.clasificacion5,
          clasificacion6 = EXCLUDED.clasificacion6,
          ultima_sincronizacion = NOW()
      `;
      contador++;
    } catch (error) {
      errores++;
      console.error(`❌ Error al guardar nota de pedido ${nota.numero}:`, error);
    }
  }

  console.log(`✅ ${contador} notas de pedido guardadas/actualizadas en Neon.`);
  if (errores > 0) {
    console.warn(`⚠️ ${errores} notas de pedido tuvieron errores.`);
  }

  return { procesados: contador, errores };
}
