// lib/sync-notas-pedido-detalle.ts
import { sql } from './db';

// =====================================================
// TIPO: Cabecera de nota de pedido (estructura mínima)
// =====================================================
export interface NotaPedidoCabecera {
  Division: number;
  Tipo: string;
  Numero: number;
  ClienteId?: number;
  // ... otros campos que puedan existir
}

// =====================================================
// 1. OBTENER DETALLE DE UNA NOTA (vía SOAP)
// =====================================================
export async function obtenerDetallePorNota(cabecera: NotaPedidoCabecera) {
  const { Division, Tipo, Numero, ClienteId } = cabecera;

  if (!ClienteId) {
    console.warn(`⚠️ Nota ${Numero} no tiene ClienteId. No se puede obtener detalle.`);
    return [];
  }

  console.log(`🔍 Procesando nota ${Numero} (Cliente: ${ClienteId})...`);

  const soapRequest = `
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerDetalleNotaPedido xmlns="http://plataforma.net.ar/">
      <ClienteId>${ClienteId}</ClienteId>
      <EstadoRemision>Todos</EstadoRemision>
    </ObtenerDetalleNotaPedido>
  </soap:Body>
</soap:Envelope>`;

  try {
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
    const items = extraerItemsDesdeXML(xml, Division, Tipo, Numero);
    return items;
  } catch (error) {
    console.error(`❌ Error al obtener detalle de nota ${Numero}:`, error);
    return [];
  }
}

// =====================================================
// 2. EXTRAER ÍTEMS DEL XML (FILTRADOS POR CABECERA)
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

  // Buscar todas las notas de pedido dentro del resultado
  const notaMatches = innerXml.match(/<NotaPedido>([\s\S]*?)<\/NotaPedido>/g);
  if (!notaMatches) {
    console.warn('⚠️ No se encontraron NotaPedido en la respuesta.');
    return [];
  }

  for (const notaMatch of notaMatches) {
    const item: any = {};

    // Extraer campos básicos usando regex
    const divMatch = notaMatch.match(/<Division>([^<]*)<\/Division>/);
    const tipoMatch = notaMatch.match(/<Tipo>([^<]*)<\/Tipo>/);
    const numMatch = notaMatch.match(/<Numero>([^<]*)<\/Numero>/);
    const renglonMatch = notaMatch.match(/<Renglon>([^<]*)<\/Renglon>/);
    const articuloIdMatch = notaMatch.match(/<ArticuloId>([^<]*)<\/ArticuloId>/);
    const articuloEmpresaMatch = notaMatch.match(/<ArticuloEmpresa>([^<]*)<\/ArticuloEmpresa>/);
    const articuloNombreMatch = notaMatch.match(/<ArticuloNombre>([^<]*)<\/ArticuloNombre>/);
    const cantPedidaMatch = notaMatch.match(/<CantidadPedida>([^<]*)<\/CantidadPedida>/);
    const cantFacturadaMatch = notaMatch.match(/<CantidadFacturada>([^<]*)<\/CantidadFacturada>/);
    const cantEntregadaMatch = notaMatch.match(/<CantidadEntregada>([^<]*)<\/CantidadEntregada>/);
    const precioNetoMatch = notaMatch.match(/<PrecioNeto_SI>([^<]*)<\/PrecioNeto_SI>/);
    const unidadMedidaMatch = notaMatch.match(/<UnidadDeMedida>([^<]*)<\/UnidadDeMedida>/);

    if (divMatch) item.Division = parseInt(divMatch[1]);
    if (tipoMatch) item.Tipo = tipoMatch[1];
    if (numMatch) item.Numero = parseInt(numMatch[1]);
    if (renglonMatch) item.Renglon = parseInt(renglonMatch[1]);
    if (articuloIdMatch) item.ArticuloId = parseInt(articuloIdMatch[1]);
    if (articuloEmpresaMatch) item.ArticuloEmpresa = articuloEmpresaMatch[1];
    if (articuloNombreMatch) item.ArticuloNombre = articuloNombreMatch[1];
    if (cantPedidaMatch) item.CantidadPedida = parseFloat(cantPedidaMatch[1]);
    if (cantFacturadaMatch) item.CantidadFacturada = parseFloat(cantFacturadaMatch[1]);
    if (cantEntregadaMatch) item.CantidadEntregada = parseFloat(cantEntregadaMatch[1]);
    if (precioNetoMatch) item.PrecioNeto_SI = parseFloat(precioNetoMatch[1]);
    if (unidadMedidaMatch) item.UnidadDeMedida = unidadMedidaMatch[1];

    // Solo agregar si coincide con la cabecera que estamos procesando
    if (item.Division === division && item.Tipo === tipo && item.Numero === numero) {
      items.push(item);
    }
  }

  if (items.length > 0) {
    console.log(`✅ ${items.length} ítems encontrados para nota ${numero}`);
  }
  return items;
}

// =====================================================
// 3. GUARDAR ÍTEMS DE DETALLE EN NEON
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
          ultima_sincronizacion
        ) VALUES (
          ${item.Division},
          ${item.Tipo},
          ${item.Numero},
          ${item.Renglon},
          ${item.ArticuloId || null},
          ${item.ArticuloEmpresa || null},
          ${item.ArticuloNombre || null},
          ${item.CantidadPedida || 0},
          ${item.CantidadFacturada || 0},
          ${item.CantidadEntregada || 0},
          ${item.PrecioNeto_SI || 0},
          ${item.UnidadDeMedida || null},
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
          ultima_sincronizacion = NOW()
      `;
      contador++;
    } catch (error) {
      errores++;
      console.error(`❌ Error al guardar ítem ${item.Renglon} de nota ${item.Numero}:`, error);
    }
  }

  console.log(`✅ ${contador} ítems de detalle guardados/actualizados en Neon.`);
  if (errores > 0) {
    console.warn(`⚠️ ${errores} ítems tuvieron errores.`);
  }
}

// =====================================================
// 4. FUNCIÓN PRINCIPAL: SINCRONIZAR DETALLE DE NOTAS DE PEDIDO
// =====================================================
export async function syncNotasPedidoDetalle() {
  console.log('🔄 Iniciando sincronización de detalle de notas de pedido...');

  // 1. Obtener todas las cabeceras de notas de pedido desde Neon
  const cabeceras = await sql<NotaPedidoCabecera[]>`
    SELECT division, tipo, numero, cliente_id AS "ClienteId"
    FROM notas_pedido_cabecera
    WHERE cliente_id IS NOT NULL
  `;

  if (cabeceras.length === 0) {
    console.log('⚠️ No hay cabeceras de notas de pedido para procesar.');
    return;
  }

  console.log(`📋 ${cabeceras.length} cabeceras de notas de pedido encontradas.`);

  let totalItems = 0;
  let notasConError = 0;

  // 2. Procesar cada cabecera
  for (const cabecera of cabeceras) {
    try {
      const items = await obtenerDetallePorNota(cabecera);
      if (items.length > 0) {
        await guardarDetalleEnNeon(items);
        totalItems += items.length;
      }
    } catch (error) {
      notasConError++;
      console.error(`❌ Error al procesar nota ${cabecera.Numero}:`, error);
    }
  }

  console.log(`✅ Sincronización de detalle de notas de pedido completada.`);
  console.log(`📊 Total de ítems sincronizados: ${totalItems}`);
  if (notasConError > 0) {
    console.warn(`⚠️ ${notasConError} notas tuvieron errores.`);
  }
}
