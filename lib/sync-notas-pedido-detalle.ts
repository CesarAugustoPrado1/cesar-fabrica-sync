// lib/sync-notas-pedido-detalle.ts
import { sql } from './db';

const ERP_URL = "http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx";
const SOAP_ACTION = "http://plataforma.net.ar/ObtenerDetalleNotaPedido";

// =====================================================
// FUNCIÓN PRINCIPAL: Sincronizar detalle de notas de pedido
// =====================================================
export async function syncNotasPedidoDetalle() {
  console.log('🔄 Iniciando sincronización de detalle de notas de pedido...');

  try {
    // 1. Obtener todos los clientes desde Neon
    const clientes = await sql`SELECT cliente_id FROM clientes WHERE cliente_id IS NOT NULL`;
    console.log(`📋 ${clientes.length} clientes encontrados para procesar.`);

    if (clientes.length === 0) {
      console.log('⚠️ No hay clientes para procesar.');
      return { procesados: 0, errores: 0 };
    }

    let totalDetalles = 0;
    let errores = 0;

    // 2. Procesar cada cliente
    for (const row of clientes) {
      const clienteId = row.cliente_id;
      console.log(`🔍 Procesando cliente ${clienteId}...`);

      try {
        const detalles = await obtenerDetallePorCliente(clienteId);
        if (detalles.length > 0) {
          const guardados = await guardarDetalles(detalles);
          totalDetalles += guardados;
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error al procesar cliente ${clienteId}:`, error);
        // Continuamos con el siguiente cliente
      }
    }

    console.log(`✅ Sincronización de detalle completada. Total detalles: ${totalDetalles}, Errores: ${errores}`);
    return { procesados: totalDetalles, errores };

  } catch (error) {
    console.error('❌ Error en syncNotasPedidoDetalle:', error);
    throw error;
  }
}

// =====================================================
// OBTENER DETALLE POR CLIENTE (SOAP)
// =====================================================
async function obtenerDetallePorCliente(clienteId: number): Promise<any[]> {
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://plataforma.net.ar/">
  <soap:Body>
    <ns:ObtenerDetalleNotaPedido>
      <ns:ClienteId>${clienteId}</ns:ClienteId>
      <ns:EstadoRemision>Todos</ns:EstadoRemision>
    </ns:ObtenerDetalleNotaPedido>
  </soap:Body>
</soap:Envelope>`;

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
    console.error(`❌ Error HTTP para cliente ${clienteId}:`, errorText);
    throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
  }

  const xmlText = await response.text();
  return extraerDetalles(xmlText, clienteId);
}

// =====================================================
// EXTRAER DETALLES DEL XML
// =====================================================
function extraerDetalles(xml: string, clienteId: number): any[] {
  const detalles: any[] = [];

  // Buscar el nodo ObtenerDetalleNotaPedidoResult
  const resultMatch = xml.match(/<ObtenerDetalleNotaPedidoResult>([\s\S]*?)<\/ObtenerDetalleNotaPedidoResult>/);
  if (!resultMatch) {
    console.warn(`⚠️ No se encontró ObtenerDetalleNotaPedidoResult para cliente ${clienteId}.`);
    return [];
  }

  const innerXml = resultMatch[1];
  // Buscar cada DetalleNotaPedido
  const detalleMatches = innerXml.match(/<DetalleNotaPedido([\s\S]*?)<\/DetalleNotaPedido>/g);
  if (!detalleMatches) {
    console.warn(`⚠️ No se encontraron detalles para cliente ${clienteId}.`);
    return [];
  }

  for (const match of detalleMatches) {
    const detalle: any = {};

    // Extraer campos según la estructura de la tabla
    const divisionMatch = match.match(/<Division>([^<]*)<\/Division>/);
    const tipoMatch = match.match(/<Tipo>([^<]*)<\/Tipo>/);
    const numeroMatch = match.match(/<Numero>([^<]*)<\/Numero>/);
    const renglonMatch = match.match(/<Renglon>([^<]*)<\/Renglon>/);
    const articuloIdMatch = match.match(/<ArticuloId>([^<]*)<\/ArticuloId>/);
    const cantidadMatch = match.match(/<CantidadPedida>([^<]*)<\/CantidadPedida>/);
    const precioMatch = match.match(/<PrecioNeto>([^<]*)<\/PrecioNeto>/);
    const unidadMatch = match.match(/<UnidadDeMedida>([^<]*)<\/UnidadDeMedida>/);
    const articuloNombreMatch = match.match(/<ArticuloNombre>([^<]*)<\/ArticuloNombre>/);

    if (divisionMatch) detalle.division = parseInt(divisionMatch[1]) || 0;
    if (tipoMatch) detalle.tipo = tipoMatch[1];
    if (numeroMatch) detalle.numero = parseInt(numeroMatch[1]);
    if (renglonMatch) detalle.renglon = parseInt(renglonMatch[1]) || 0;
    if (articuloIdMatch) detalle.articulo_id = parseInt(articuloIdMatch[1]);
    if (cantidadMatch) detalle.cantidad_pedida = parseFloat(cantidadMatch[1]) || 0;
    if (precioMatch) detalle.precio_neto = parseFloat(precioMatch[1]) || 0;
    if (unidadMatch) detalle.unidad_medida = unidadMatch[1];
    if (articuloNombreMatch) detalle.articulo_nombre = articuloNombreMatch[1];

    if (detalle.numero && detalle.renglon) {
      detalles.push(detalle);
    }
  }

  return detalles;
}

// =====================================================
// GUARDAR DETALLES EN NEON
// =====================================================
async function guardarDetalles(detalles: any[]) {
  if (detalles.length === 0) return 0;

  let contador = 0;

  for (const detalle of detalles) {
    try {
      await sql`
        INSERT INTO notas_pedido_detalle (
          division,
          tipo,
          numero,
          renglon,
          articulo_id,
          cantidad_pedida,
          precio_neto,
          unidad_medida,
          articulo_nombre,
          ultima_sincronizacion
        ) VALUES (
          ${detalle.division || 0},
          ${detalle.tipo || null},
          ${detalle.numero},
          ${detalle.renglon || 0},
          ${detalle.articulo_id || null},
          ${detalle.cantidad_pedida || 0},
          ${detalle.precio_neto || 0},
          ${detalle.unidad_medida || null},
          ${detalle.articulo_nombre || null},
          NOW()
        )
        ON CONFLICT (division, tipo, numero, renglon) DO UPDATE SET
          articulo_id = EXCLUDED.articulo_id,
          cantidad_pedida = EXCLUDED.cantidad_pedida,
          precio_neto = EXCLUDED.precio_neto,
          unidad_medida = EXCLUDED.unidad_medida,
          articulo_nombre = EXCLUDED.articulo_nombre,
          ultima_sincronizacion = NOW()
      `;
      contador++;
    } catch (error) {
      console.error(`❌ Error al guardar detalle (${detalle.numero}-${detalle.renglon}):`, error);
    }
  }

  return contador;
}
