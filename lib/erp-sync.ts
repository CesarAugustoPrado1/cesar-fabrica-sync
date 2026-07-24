import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// Lista mínima (la original que funcionaba)
const atributosMinimos = [
  'ArticuloID',
  'Nombre',
  'Descripcion',
  'UnidadDeMedidaDeStock',
  'SeVende',
  'SeCompra',
  'FechaDeAlta',
  'FechaUltActualizacion'
];

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';

function parseFecha(valor: string | null): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

function parseBooleano(valor: string | null): boolean | null {
  if (!valor) return null;
  const lower = valor.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'sí' || lower === 'si' || lower === 'yes';
}

function getTextFromNode(node: any, tagName: string): string | null {
  if (!node) return null;
  const child = node[tagName];
  if (Array.isArray(child) && child.length > 0) {
    return child[0] || null;
  }
  return child || null;
}

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    const atributosXML = atributosMinimos.map(attr => 
      `<ArticuloAtributos>${attr}</ArticuloAtributos>`
    ).join('');

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:art="http://plataforma.net.ar/">
  <soap:Body>
    <art:ObtenerArticulos>
      <art:AtributosVisibles>
        ${atributosXML}
      </art:AtributosVisibles>
      <art:Filtros />
    </art:ObtenerArticulos>
  </soap:Body>
</soap:Envelope>`;

    console.log('📤 XML enviado:', soapEnvelope);

    const response = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://plataforma.net.ar/ObtenerArticulos',
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cuerpo de la respuesta de error:', errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('✅ Respuesta recibida del ERP');

    // Parsear el XML
    const result = await parseStringPromise(xmlText, {
      explicitArray: true,
      mergeAttrs: false,
      ignoreAttrs: true,
    });

    // 1. Navegar hasta ObtenerArticulosResult
    const envelope = result['soap:Envelope'] || result;
    const body = envelope['soap:Body'] || envelope['s:Body'] || envelope;
    const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'] || body;
    const resultNode = responseNode?.['ObtenerArticulosResult']?.[0];

    if (!resultNode) {
      throw new Error('No se encontró el nodo ObtenerArticulosResult en la respuesta');
    }

    // 2. Buscar el nodo <Articulos> (puede ser con o sin namespace)
    const articulosNode = resultNode['Articulos'] || resultNode['art:Articulos'] || resultNode['tns:Articulos'];
    if (!articulosNode) {
      // Si no hay Articulos, intentar buscar directamente los <Articulo> en resultNode
      let articulosRaw = resultNode['Articulo'];
      if (!articulosRaw) {
        // Último intento: buscar en el nivel superior (algunas respuestas no tienen Articulos)
        articulosRaw = resultNode['Table'] || resultNode['NewDataSet']?.[0]?.['Table'];
      }
      if (!articulosRaw) {
        throw new Error('No se encontraron artículos en la respuesta');
      }
      // Si es un array, usarlo directamente
      const articulos = Array.isArray(articulosRaw) ? articulosRaw : [articulosRaw];
      console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);
      await procesarArticulos(articulos);
      return;
    }

    // 3. Extraer los artículos del nodo Articulos
    // El nodo Articulos puede tener elementos <Articulo> directamente
    let articulos = articulosNode['Articulo'];
    if (!articulos) {
      // Si no hay Articulo dentro de Articulos, intentar buscar en el nivel superior
      articulos = resultNode['Articulo'] || resultNode['Table'];
    }

    if (!articulos) {
      throw new Error('No se encontraron artículos en la respuesta');
    }

    // Asegurar que es un array
    if (!Array.isArray(articulos)) {
      articulos = [articulos];
    }

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    await procesarArticulos(articulos);

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

// Función auxiliar para procesar los artículos
async function procesarArticulos(articulos: any[]) {
  let procesados = 0;
  let errores = 0;

  for (const item of articulos) {
    try {
      // Extraer valores
      const articuloid = parseInt(getTextFromNode(item, 'ArticuloID') || '0');
      const nombre = getTextFromNode(item, 'Nombre');
      const descripcion = getTextFromNode(item, 'Descripcion');
      const unidadmedidastock = getTextFromNode(item, 'UnidadDeMedidaDeStock');
      const sevende = parseBooleano(getTextFromNode(item, 'SeVende'));
      const secompra = parseBooleano(getTextFromNode(item, 'SeCompra'));
      const fechadealta = parseFecha(getTextFromNode(item, 'FechaDeAlta'));
      const fechaultactualizacion = parseFecha(getTextFromNode(item, 'FechaUltActualizacion'));

      // Construir el objeto articulo (solo columnas que existen en la tabla)
      const articulo = {
        articuloid,
        nombre,
        descripcion,
        unidadmedidastock,
        sevende,
        secompra,
        fechadealta,
        fechaultactualizacion,
      };

      // Insertar o actualizar
      const query = `
        INSERT INTO productos (
          articuloid, nombre, descripcion, unidadmedidastock,
          sevende, secompra, fechadealta, fechaultactualizacion,
          ultima_sincronizacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (articuloid) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          descripcion = EXCLUDED.descripcion,
          unidadmedidastock = EXCLUDED.unidadmedidastock,
          sevende = EXCLUDED.sevende,
          secompra = EXCLUDED.secompra,
          fechadealta = EXCLUDED.fechadealta,
          fechaultactualizacion = EXCLUDED.fechaultactualizacion,
          ultima_sincronizacion = CURRENT_TIMESTAMP
      `;

      await sql(query, [
        articulo.articuloid,
        articulo.nombre,
        articulo.descripcion,
        articulo.unidadmedidastock,
        articulo.sevende,
        articulo.secompra,
        articulo.fechadealta,
        articulo.fechaultactualizacion
      ]);

      procesados++;
      if (procesados % 100 === 0) {
        console.log(`📊 Procesados ${procesados} artículos...`);
      }

    } catch (error) {
      errores++;
      console.error(`❌ Error procesando artículo:`, error);
    }
  }

  console.log(`📊 Resumen:`);
  console.log(`   Procesados: ${procesados}`);
  console.log(`   Errores: ${errores}`);
  console.log('✅ Sincronización completada');
}

export async function syncAll() {
  await syncProductos();
}
