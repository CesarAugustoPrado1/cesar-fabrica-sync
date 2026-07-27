// lib/sync-notas-pedido-detalle.ts
import { sql } from './db';

const ERP_URL = "http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx";
// Usamos el método correcto para obtener el detalle de una nota específica
const SOAP_ACTION = "http://plataforma.net.ar/ObtenerItemsNotaPedido"; 

// =====================================================
// FUNCIÓN PRINCIPAL: Sincronizar detalle de notas de pedido
// =====================================================
export async function syncNotasPedidoDetalle() {
  console.log('🔄 Iniciando sincronización de detalle de notas de pedido...');

  try {
    // 1. Obtener TODAS las cabeceras de notas de pedido desde Neon
    const cabeceras = await sql`
      SELECT numero, division, tipo 
      FROM notas_pedido_cabecera 
      WHERE numero IS NOT NULL
    `;

    console.log(`📋 ${cabeceras.length} cabeceras de notas de pedido encontradas para procesar.`);

    if (cabeceras.length === 0) {
      console.log('⚠️ No hay cabeceras de notas de pedido para procesar.');
      return { procesados: 0, errores: 0 };
    }

    let totalDetalles = 0;
    let errores = 0;
    let notasSinDetalle = 0;

    // 2. Procesar cada cabecera para obtener su detalle
    for (const cabecera of cabeceras) {
      const { numero, division, tipo } = cabecera;
      console.log(`🔍 Procesando nota ${numero} (División: ${division}, Tipo: ${tipo})...`);

      try {
        // 2.1 Obtener el detalle para esta nota específica
        const detalles = await obtenerDetallePorNota(numero, division, tipo);
        
        if (detalles.length === 0) {
          notasSinDetalle++;
          // No es un error, solo significa que no tiene ítems.
          continue; 
        }

        // 2.2 Guardar los detalles en Neon
        const guardados = await guardarDetalles(detalles);
        totalDetalles += guardados;
        
      } catch (error) {
        errores++;
        console.error(`❌ Error al procesar nota ${numero}:`, error);
        // Continuamos con la siguiente nota
      }
    }

    console.log(`✅ Sincronización de detalle completada.`);
    console.log(`   - Total detalles guardados: ${totalDetalles}`);
    console.log(`   - Notas sin detalle (vacíos): ${notasSinDetalle}`);
    console.log(`   - Errores: ${errores}`);
    
    return { procesados: totalDetalles, errores };

  } catch (error) {
    console.error('❌ Error en syncNotasPedidoDetalle:', error);
    throw error;
  }
}

// =====================================================
// OBTENER DETALLE POR NOTA ESPECÍFICA (SOAP)
// =====================================================
async function obtenerDetallePorNota(numero: number, division: number, tipo: string): Promise<any[]> {
  // 🔥 Asegurar que los parámetros sean válidos
  if (!numero || isNaN(numero)) {
    console.warn(`⚠️ Número de nota inválido: ${numero}`);
    return [];
  }

  // Construir el XML SOAP para ObtenerItemsNotaPedido
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ns="http://plataforma.net.ar/">
  <soap:Body>
    <ns:ObtenerItemsNotaPedido>
      <ns:Numero>${numero}</ns:Numero>
      <ns:Division>${division || 0}</ns:Division>
      <ns:Tipo>${tipo || ''}</ns:Tipo>
    </ns:ObtenerItemsNotaPedido>
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
    console.error(`❌ Error HTTP para nota ${numero}:`, errorText);
    throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
  }

  const xmlText = await response.text();
  return extraerDetalles(xmlText, numero);
}

// =====================================================
// EXTRAER DETALLES DEL XML
// =====================================================
function extraerDetalles(xml: string, numeroNota: number): any[] {
  const detalles: any[] = [];

  // Buscar el nodo ObtenerItemsNotaPedidoResult
  const resultMatch = xml.match(/<ObtenerItemsNotaPedidoResult>([\s\S]*?)<\/ObtenerItemsNotaPedidoResult>/);
  if (!resultMatch) {
    console.warn(`⚠️ No se encontró ObtenerItemsNotaPedidoResult para la nota ${numeroNota}.`);
    return [];
  }

  const innerXml = resultMatch[1];
  // Buscar cada ItemNotaPedido (o el nombre que tenga el nodo)
  const detalleMatches = innerXml.match(/<ItemNotaPedido([\s\S]*?)<\/ItemNotaPedido>/g);
  if (!detalleMatches) {
    // A veces el detalle puede estar en un nodo diferente, intentamos con un fallback
    const fallbackMatches = innerXml.match(/<DetalleNotaPedido([\s\S]*?)<\/DetalleNotaPedido>/g);
    if (!fallbackMatches) {
      console.warn(`⚠️ No se encontraron ítems para la nota ${numeroNota}.`);
      return [];
    }
    // Si encontramos con el fallback, lo usamos
    for (const match of fallbackMatches) {
      const detalle = parsearItem(match);
      if (detalle) detalles.push(detalle);
    }
    return detalles;
  }

  for (const match of detalleMatches) {
    const detalle = parsearItem(match);
    if (detalle) detalles.push(detalle);
  }

  return detalles;
}

// =====================================================
// PARSEAR UN ITEM DE NOTA DE PEDIDO
// =====================================================
function parsearItem(match: string): any | null {
  const detalle: any = {};

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
    return detalle;
  }
  return null;
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
