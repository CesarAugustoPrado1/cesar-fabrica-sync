// lib/erp-sync.ts
import { sql } from './db';

// =====================================================
// FUNCIÓN AUXILIAR: VALIDAR FECHAS
// =====================================================
function validarFecha(fecha: any): Date | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  return d;
}

// =====================================================
// FUNCIÓN: GUARDAR ARTÍCULOS EN NEON
// =====================================================
export async function guardarArticulosEnNeon(articulos: any[]) {
  if (articulos.length === 0) {
    console.log('⚠️ No hay artículos para guardar.');
    return;
  }

  console.log('💾 Guardando artículos en Neon...');
  let contador = 0;
  let errores = 0;

  for (const articulo of articulos) {
    try {
      const fechaCreacion = validarFecha(articulo.fecha_creacion);
      const fechaActualizacion = validarFecha(articulo.fecha_actualizacion);

      await sql`
        INSERT INTO productos (
          erp_id,
          sku,
          nombre,
          descripcion,
          unidad_medida,
          fecha_creacion,
          fecha_actualizacion,
          ultima_sincronizacion
        ) VALUES (
          ${articulo.erp_id},
          ${articulo.sku || null},
          ${articulo.nombre},
          ${articulo.descripcion || null},
          ${articulo.unidad_medida || null},
          ${fechaCreacion},
          ${fechaActualizacion},
          NOW()
        )
        ON CONFLICT (erp_id) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          descripcion = EXCLUDED.descripcion,
          unidad_medida = EXCLUDED.unidad_medida,
          fecha_actualizacion = EXCLUDED.fecha_actualizacion,
          ultima_sincronizacion = NOW()
      `;
      contador++;
    } catch (error) {
      errores++;
      console.error(`❌ Error al guardar artículo ${articulo.erp_id}:`, error);
    }
  }

  console.log(`✅ ${contador} artículos guardados/actualizados en Neon.`);
  if (errores > 0) {
    console.warn(`⚠️ ${errores} artículos tuvieron errores.`);
  }
}

// =====================================================
// FUNCIÓN: OBTENER ARTÍCULOS DEL ERP (vía SOAP)
// =====================================================
export async function obtenerArticulosDesdeERP() {
  const ERP_URL = "http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx";
  const SOAP_ACTION = "http://plataforma.net.ar/ObtenerArticulos";

  console.log('🔄 Conectando al ERP...');
  
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerArticulos xmlns="http://plataforma.net.ar/">
      <AtributosVisibles>
        <ArticuloAtributos>ArticuloID</ArticuloAtributos>
        <ArticuloAtributos>Nombre</ArticuloAtributos>
        <ArticuloAtributos>Descripcion</ArticuloAtributos>
        <ArticuloAtributos>UnidadDeMedidaDeStock</ArticuloAtributos>
        <ArticuloAtributos>SeVende</ArticuloAtributos>
        <ArticuloAtributos>SeCompra</ArticuloAtributos>
        <ArticuloAtributos>FechaDeAlta</ArticuloAtributos>
        <ArticuloAtributos>FechaUltActualizacion</ArticuloAtributos>
      </AtributosVisibles>
      <Filtros />
    </ObtenerArticulos>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(ERP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': SOAP_ACTION,
      },
      body: soapRequest,
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('✅ Conexión al ERP exitosa. Procesando datos...');

    const articulos = extraerArticulosDesdeXML(xmlText);
    console.log(`📊 Se encontraron ${articulos.length} artículos.`);
    return articulos;

  } catch (error) {
    console.error('❌ Error al obtener artículos del ERP:', error);
    throw error;
  }
}

// =====================================================
// FUNCIÓN AUXILIAR: EXTRAER ARTÍCULOS DEL XML
// =====================================================
function extraerArticulosDesdeXML(xml: string): any[] {
  const articulos: any[] = [];
  
  const matches = xml.match(/<Articulo([\s\S]*?)<\/Articulo>/g);
  
  if (!matches) {
    console.warn('⚠️ No se encontraron artículos en la respuesta.');
    return [];
  }

  for (const match of matches) {
    const articulo: any = {};
    
    const idMatch = match.match(/<ArticuloID>([^<]*)<\/ArticuloID>/);
    const nombreMatch = match.match(/<Nombre>([^<]*)<\/Nombre>/);
    const descMatch = match.match(/<Descripcion>([^<]*)<\/Descripcion>/);
    const unidadMatch = match.match(/<UnidadDeMedidaDeStock>([^<]*)<\/UnidadDeMedidaDeStock>/);
    const seVendeMatch = match.match(/<SeVende>([^<]*)<\/SeVende>/);
    const seCompraMatch = match.match(/<SeCompra>([^<]*)<\/SeCompra>/);
    const fechaAltaMatch = match.match(/<FechaDeAlta>([^<]*)<\/FechaDeAlta>/);
    const fechaActualizacionMatch = match.match(/<FechaUltActualizacion>([^<]*)<\/FechaUltActualizacion>/);

    if (idMatch) articulo.erp_id = parseInt(idMatch[1]);
    if (nombreMatch) articulo.nombre = nombreMatch[1] || '';
    if (descMatch) articulo.descripcion = descMatch[1] || '';
    if (unidadMatch) articulo.unidad_medida = unidadMatch[1] || '';
    if (seVendeMatch) articulo.se_vende = seVendeMatch[1] === 'true';
    if (seCompraMatch) articulo.se_compra = seCompraMatch[1] === 'true';
    if (fechaAltaMatch) articulo.fecha_creacion = fechaAltaMatch[1];
    if (fechaActualizacionMatch) articulo.fecha_actualizacion = fechaActualizacionMatch[1];

    if (articulo.erp_id) {
      articulos.push(articulo);
    }
  }

  return articulos;
}