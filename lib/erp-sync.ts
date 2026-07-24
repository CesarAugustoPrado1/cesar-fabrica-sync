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

// Extrae el valor de un atributo de un nodo
function getAttr(node: any, attrName: string): string | null {
  if (!node || !node.$) return null;
  return node.$[attrName] || null;
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
      ignoreAttrs: false,  // Importante: mantener atributos
    });

    // 1. Obtener el Body y buscar ObtenerArticulosResponse sin prefijos
    const envelope = result['soap:Envelope'] || result['Envelope'] || result;
    const body = envelope['soap:Body'] || envelope['Body'] || envelope;

    // 2. Buscar ObtenerArticulosResponse (sin prefijo)
    const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'];
    if (!responseNode) {
      // Mostrar las claves disponibles para depuración
      const keys = Object.keys(body);
      console.error('❌ Claves disponibles en body:', keys);
      throw new Error('No se encontró ObtenerArticulosResponse en la respuesta');
    }

    // 3. Obtener ObtenerArticulosResult
    const resultNode = responseNode[0]?.['ObtenerArticulosResult']?.[0];
    if (!resultNode) {
      console.error('❌ Claves en responseNode:', Object.keys(responseNode[0] || {}));
      throw new Error('No se encontró ObtenerArticulosResult en la respuesta');
    }

    // 4. Obtener Articulos
    const articulosNode = resultNode['Articulos']?.[0];
    if (!articulosNode) {
      console.error('❌ Claves en resultNode:', Object.keys(resultNode));
      throw new Error('No se encontró Articulos en la respuesta');
    }

    // 5. Extraer los artículos (cada uno es un objeto con atributos)
    let articulos = articulosNode['Articulo'];
    if (!articulos) {
      console.error('❌ Claves en articulosNode:', Object.keys(articulosNode));
      throw new Error('No se encontraron nodos Articulo dentro de Articulos');
    }

    if (!Array.isArray(articulos)) {
      articulos = [articulos];
    }

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    // Procesar los artículos
    let procesados = 0;
    let errores = 0;

    for (const item of articulos) {
      try {
        // Extraer valores desde ATRIBUTOS (no desde elementos hijos)
        const articuloid = parseInt(getAttr(item, 'ArticuloID') || '0');
        const nombre = getAttr(item, 'Nombre');
        const descripcion = getAttr(item, 'Descripcion');
        const unidadmedidastock = getAttr(item, 'UnidadDeMedidaDeStock');
        const sevende = parseBooleano(getAttr(item, 'SeVende'));
        const secompra = parseBooleano(getAttr(item, 'SeCompra'));
        const fechadealta = parseFecha(getAttr(item, 'FechaDeAlta'));
        const fechaultactualizacion = parseFecha(getAttr(item, 'FechaUltActualizacion'));

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
          articuloid,
          nombre,
          descripcion,
          unidadmedidastock,
          sevende,
          secompra,
          fechadealta,
          fechaultactualizacion
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

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

export async function syncAll() {
  await syncProductos();
}
