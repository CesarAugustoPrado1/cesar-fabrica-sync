// lib/sync-notas-pedido.ts
import { sql } from './db';
import type { SyncResult } from './sync/runner';

const ERP_URL = "http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx";
const SOAP_ACTION = "http://plataforma.net.ar/ObtenerNotasDePedido";

// =====================================================
// FUNCIÓN PRINCIPAL: Sincronizar notas de pedido (cabeceras)
// =====================================================
export async function syncNotasDePedido(): Promise<SyncResult> {
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
        <ns:NotaDePedidoAtributos>ImporteTotalMonedaOrigen</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>EstadoDeAprobacion</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Division</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Tipo</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>Observacion</ns:NotaDePedidoAtributos>
        <ns:NotaDePedidoAtributos>FechaDeAlta</ns:NotaDePedidoAtributos>
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
    const importeMatch = match.match(/<ImporteTotalMonedaOrigen>([^<]*)<\/ImporteTotalMonedaOrigen>/);
    const estadoMatch = match.match(/<EstadoDeAprobacion>([^<]*)<\/EstadoDeAprobacion>/);
    const divisionMatch = match.match(/<Division>([^<]*)<\/Division>/);
    const tipoMatch = match.match(/<Tipo>([^<]*)<\/Tipo>/);
    const obsMatch = match.match(/<Observacion>([^<]*)<\/Observacion>/);
    const fechaAltaMatch = match.match(/<FechaDeAlta>([^<]*)<\/FechaDeAlta>/);

    if (numMatch) nota.numero = parseInt(numMatch[1]);
    if (fechaMatch) nota.fecha_emision = new Date(fechaMatch[1]);
    if (clienteMatch) nota.cliente_id = parseInt(clienteMatch[1]);
    if (clienteNomMatch) nota.cliente_nombre = clienteNomMatch[1];
    if (importeMatch) nota.importe_total = parseFloat(importeMatch[1]) || 0;
    if (estadoMatch) nota.estado_aprobacion = estadoMatch[1];
    if (divisionMatch) nota.division = parseInt(divisionMatch[1]) || 0;
    if (tipoMatch) nota.tipo = tipoMatch[1];
    if (obsMatch) nota.observacion = obsMatch[1];
    if (fechaAltaMatch) nota.fecha_alta = new Date(fechaAltaMatch[1]);

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
          importe_total,
          estado_aprobacion,
          fecha_alta,
          observacion,
          cliente_nombre,
          ultima_sincronizacion
        ) VALUES (
          ${nota.division || 0},
          ${nota.tipo || null},
          ${nota.numero},
          ${nota.fecha_emision || null},
          ${nota.cliente_id || null},
          ${nota.importe_total || 0},
          ${nota.estado_aprobacion || null},
          ${nota.fecha_alta || null},
          ${nota.observacion || null},
          ${nota.cliente_nombre || null},
          NOW()
        )
        ON CONFLICT (numero, division) DO UPDATE SET
          tipo = EXCLUDED.tipo,
          fecha_emision = EXCLUDED.fecha_emision,
          cliente_id = EXCLUDED.cliente_id,
          importe_total = EXCLUDED.importe_total,
          estado_aprobacion = EXCLUDED.estado_aprobacion,
          fecha_alta = EXCLUDED.fecha_alta,
          observacion = EXCLUDED.observacion,
          cliente_nombre = EXCLUDED.cliente_nombre,
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
