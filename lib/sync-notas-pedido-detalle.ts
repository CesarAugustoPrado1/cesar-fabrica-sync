// lib/sync-notas-pedido-detalle.ts
import { sql } from './db';

// =====================================================
// 1. FUNCIÓN PRINCIPAL: Sincronizar detalle de notas de pedido
// =====================================================
export async function syncNotasPedidoDetalle() {
  console.log('🔄 Iniciando sincronización de detalle de notas de pedido...');

  // Obtener todas las cabeceras que tienen ClienteId
  const cabeceras = await sql`
    SELECT division, tipo, numero, clienteid
    FROM notas_pedido_cabecera
    WHERE clienteid IS NOT NULL
    ORDER BY numero
  `;

  if (!cabeceras || cabeceras.length === 0) {
    console.log('⚠️ No se encontraron cabeceras con ClienteId.');
    return;
  }

  console.log(`📋 ${cabeceras.length} cabeceras encontradas.`);

  let totalItems = 0;
  let notasConError = 0;

  for (const cabecera of cabeceras) {
    try {
      const items = await obtenerDetallePorNota(cabecera);
      if (items.length > 0) {
        await guardarDetalleEnNeon(items);
        totalItems += items.length;
      }
    } catch (error) {
      notasConError++;
      console.error(`❌ Error al procesar nota ${cabecera.numero}:`, error);
    }
  }

  console.log(`✅ Sincronización de detalle completada. Total ítems: ${totalItems}, Notas con error: ${notasConError}`);
}

// =====================================================
// 2. OBTENER DETALLE POR NOTA (usando ClienteId)
// =====================================================
export async function obtenerDetallePorNota(cabecera: any) {
  const { division, tipo, numero, clienteid } = cabecera;

  if (!clienteid) {
    console.warn(`⚠️ Nota ${numero} no tiene ClienteId.`);
    return [];
  }

  console.log(`🔍 Procesando nota ${numero} (Cliente: ${clienteid})...`);

  const soapRequest = `
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerDetalleNotaPedido xmlns="http://plataforma.net.ar/">
      <ClienteId>${clienteid}</ClienteId>
      <EstadoRemision>Todos</EstadoRemision>
    </ObtenerDetalleNotaPedido>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(
    "http://wspirkastone.pypcloud.net:1881/ServicioVENTNotaDePedido.asmx",
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://plataforma.net.ar/ObtenerDetalleNotaPedido"',
      },
      body: soapRequest,
    }
  );

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status} - ${await response.text()}`);
  }

  const xml = await response.text();
  const items = extraerItemsDesdeXML(xml, division, tipo, numero);
  return items;
}

// =====================================================
// 3. EXTRAER ÍTEMS DEL XML (adaptado a la estructura real)
// =====================================================
function extraerItemsDesdeXML(xml: string, division: number, tipo: string, numero: number): any[] {
  const items: any[] = [];

  // Buscar el contenido de ObtenerDetalleNotaPedidoResult
  const resultMatch = xml.match(/<ObtenerDetalleNotaPedidoResult>([\s\S]*?)<\/ObtenerDetalleNotaPedidoResult>/);
  if (!resultMatch) {
    console.warn('⚠️ No se encontró ObtenerDetalleNotaPedidoResult en la respuesta.');
    return [];
  }

  const innerXml = resultMatch[1];

  // Buscar todos los elementos <DetalleNotaPedido>
  const detalleMatches = innerXml.match(/<DetalleNotaPedido>([\s\S]*?)<\/DetalleNotaPedido>/g);
  if (!detalleMatches) {
    console.warn('⚠️ No se encontraron elementos DetalleNotaPedido en la respuesta.');
    return [];
  }

  for (const match of detalleMatches) {
    const item: any = {};

    // Extraer campos usando regex (con nombres exactos del XML)
    const divMatch = match.match(/<Division>([^<]*)<\/Division>/);
    const tipoMatch = match.match(/<Tipo>([^<]*)<\/Tipo>/);
    const numMatch = match.match(/<Numero>([^<]*)<\/Numero>/);
    const renglonMatch = match.match(/<Renglon>([^<]*)<\/Renglon>/);
    const articuloIdMatch = match.match(/<ArticuloId>([^<]*)<\/ArticuloId>/);
    const articuloEmpresaMatch = match.match(/<ArticuloEmpresa>([^<]*)<\/ArticuloEmpresa>/);
    const articuloNombreMatch = match.match(/<ArticuloNombre>([^<]*)<\/ArticuloNombre>/);
    const cantPedidaMatch = match.match(/<CantidadPedida>([^<]*)<\/CantidadPedida>/);
    const cantFacturadaMatch = match.match(/<CantidadFacturada>([^<]*)<\/CantidadFacturada>/);
    const cantEntregadaMatch = match.match(/<CantidadEntregada>([^<]*)<\/CantidadEntregada>/);
    const precioNetoMatch = match.match(/<PrecioNeto_SI>([^<]*)<\/PrecioNeto_SI>/);
    const unidadMedidaMatch = match.match(/<UnidadDeMedida>([^<]*)<\/UnidadDeMedida>/);
    const fechaEntregaMatch = match.match(/<FechaEntrega>([^<]*)<\/FechaEntrega>/);
    const clienteIdMatch = match.match(/<ClienteId>([^<]*)<\/ClienteId>/);

    // Asignar valores (usando nombres en minúscula para coincidir con la BD)
    if (divMatch) item.division = parseInt(divMatch[1]);
    if (tipoMatch) item.tipo = tipoMatch[1];
    if (numMatch) item.numero = parseInt(numMatch[1]);
    if (renglonMatch) item.renglon = parseInt(renglonMatch[1]);
    if (articuloIdMatch) item.articulo_id = parseInt(articuloIdMatch[1]);
    if (articuloEmpresaMatch) item.articulo_empresa = articuloEmpresaMatch[1];
    if (articuloNombreMatch) item.articulo_nombre = articuloNombreMatch[1];
    if (cantPedidaMatch) item.cantidad_pedida = parseFloat(cantPedidaMatch[1]);
    if (cantFacturadaMatch) item.cantidad_facturada = parseFloat(cantFacturadaMatch[1]);
    if (cantEntregadaMatch) item.cantidad_entregada = parseFloat(cantEntregadaMatch[1]);
    if (precioNetoMatch) item.precio_neto = parseFloat(precioNetoMatch[1]);
    if (unidadMedidaMatch) item.unidad_medida = unidadMedidaMatch[1];
    if (fechaEntregaMatch) item.fecha_entrega = fechaEntregaMatch[1];
    if (clienteIdMatch) item.cliente_id = parseInt(clienteIdMatch[1]);

    // 🔥 Solo agregar si coincide con la cabecera que estamos procesando
    if (item.division === division && item.tipo === tipo && item.numero === numero) {
      items.push(item);
    }
  }

  console.log(`✅ ${items.length} ítems encontrados para nota ${numero}`);
  return items;
}

// =====================================================
// 4. GUARDAR ÍTEMS EN NEON
// =====================================================
export async function guardarDetalleEnNeon(items: any[]) {
  if (items.length === 0) return;

  console.log(`💾 Guardando ${items.length} ítems de detalle en Neon...`);
  let contador = 0;
  let errores = 0;

  for (const item of items) {
    try {
      await sql`
        INSERT INTO notas_pedido_detalle (
          division,
          tipo,
          numero,
          renglon,
          articulo_id,
          articulo_empresa,
          articulo_nombre,
          cantidad_pedida,
          cantidad_facturada,
          cantidad_entregada,
          precio_neto,
          unidad_medida,
          fecha_entrega,
          cliente_id,
          ultima_sincronizacion
        ) VALUES (
          ${item.division},
          ${item.tipo},
          ${item.numero},
          ${item.renglon},
          ${item.articulo_id || null},
          ${item.articulo_empresa || null},
          ${item.articulo_nombre || null},
          ${item.cantidad_pedida || 0},
          ${item.cantidad_facturada || 0},
          ${item.cantidad_entregada || 0},
          ${item.precio_neto || 0},
          ${item.unidad_medida || null},
          ${item.fecha_entrega || null},
          ${item.cliente_id || null},
          NOW()
        )
        ON CONFLICT (division, tipo, numero, renglon) DO UPDATE SET
          articulo_id = EXCLUDED.articulo_id,
          articulo_empresa = EXCLUDED.articulo_empresa,
          articulo_nombre = EXCLUDED.articulo_nombre,
          cantidad_pedida = EXCLUDED.cantidad_pedida,
          cantidad_facturada = EXCLUDED.cantidad_facturada,
          cantidad_entregada = EXCLUDED.cantidad_entregada,
          precio_neto = EXCLUDED.precio_neto,
          unidad_medida = EXCLUDED.unidad_medida,
          fecha_entrega = EXCLUDED.fecha_entrega,
          cliente_id = EXCLUDED.cliente_id,
          ultima_sincronizacion = NOW()
      `;
      contador++;
    } catch (error) {
      errores++;
      console.error(`❌ Error al guardar ítem ${item.renglon} de nota ${item.numero}:`, error);
    }
  }

  console.log(`✅ ${contador} ítems de detalle guardados/actualizados en Neon.`);
  if (errores > 0) {
    console.warn(`⚠️ ${errores} ítems tuvieron errores.`);
  }
}
