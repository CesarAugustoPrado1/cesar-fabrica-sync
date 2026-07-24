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

// Función auxiliar para buscar un nodo en un objeto, probando múltiples nombres
function findNode(obj: any, ...names: string[]): any {
  if (!obj) return null;
  for (const name of names) {
    if (obj[name]) return obj[name];
  }
  return null;
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

    // 1. Verificar si hay un soap:Fault
    const envelope = findNode(result, 'soap:Envelope', 'Envelope');
    const body = findNode(envelope, 'soap:Body', 'Body');
    const fault = findNode(body, 'soap:Fault', 'Fault', 'SOAP-ENV:Fault');
    if (fault) {
      const faultCode = getTextFromNode(fault, 'faultcode') || 'desconocido';
      const faultString = getTextFromNode(fault, 'faultstring') || 'Error sin descripción';
      throw new Error(`SOAP Fault: ${faultCode} - ${faultString}`);
    }

    // 2. Buscar ObtenerArticulosResponse (sin prefijo)
    let responseNode = findNode(body, 'ObtenerArticulosResponse', 'tns:ObtenerArticulosResponse', 'art:ObtenerArticulosResponse');
    if (!responseNode) {
      // Si no hay ObtenerArticulosResponse, buscar directamente en body
      responseNode = body;
    }

    // 3. Buscar ObtenerArticulosResult (dentro del responseNode)
    let resultNode = findNode(responseNode, 'ObtenerArticulosResult', 'tns:ObtenerArticulosResult', 'art:ObtenerArticulosResult');
    if (!resultNode) {
      // Si no hay Result, buscar directamente en el body (sin envoltura)
      resultNode = body;
    }

    // 4. Buscar Articulos (puede estar en resultNode o directamente)
    let articulosNode = findNode(resultNode, 'Articulos', 'tns:Articulos', 'art:Articulos');
    if (!articulosNode) {
      // Si no hay Articulos, buscar en el nivel superior (body)
      articulosNode = findNode(body, 'Articulos', 'tns:Articulos', 'art:Articulos');
    }

    let articulos: any[] = [];
    if (articulosNode) {
      // Extraer los nodos Articulo
      let raw = findNode(articulosNode, 'Articulo', 'tns:Articulo', 'art:Articulo');
      if (raw) {
        articulos = Array.isArray(raw) ? raw : [raw];
      }
    }

    // 5. Si no se encontraron Articulos, intentar buscar directamente en el body
    if (articulos.length === 0) {
      const raw = findNode(body, 'Articulo', 'tns:Articulo', 'art:Articulo');
      if (raw) {
        articulos = Array.isArray(raw) ? raw : [raw];
      }
    }

    if (articulos.length === 0) {
      // Último intento: buscar cualquier nodo que tenga atributo ArticuloID
      const allKeys = Object.keys(body);
      for (const key of allKeys) {
        if (key.toLowerCase().includes('articulo')) {
          const candidate = body[key];
          if (Array.isArray(candidate)) {
            articulos = candidate;
            break;
          }
        }
      }
    }

    if (articulos.length === 0) {
      console.error('📄 Respuesta completa (primeros 500 caracteres):', xmlText.substring(0, 500));
      throw new Error('No se encontraron artículos en la respuesta');
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
      // Ahora los atributos de Articulo pueden estar como elementos o como atributos
      // Usamos getTextFromNode que busca elementos, y si no, intentamos con atributos
      let articuloid = parseInt(getTextFromNode(item, 'ArticuloID') || (item['$']?.['ArticuloID']) || '0');
      if (!articuloid || isNaN(articuloid)) {
        // Si el ID está en el atributo del nodo raíz
        articuloid = parseInt(item['$']?.['ArticuloID'] || '0');
      }

      const nombre = getTextFromNode(item, 'Nombre') || item['$']?.['Nombre'] || null;
      const descripcion = getTextFromNode(item, 'Descripcion') || item['$']?.['Descripcion'] || null;
      const unidadmedidastock = getTextFromNode(item, 'UnidadDeMedidaDeStock') || item['$']?.['UnidadDeMedidaDeStock'] || null;
      const sevende = parseBooleano(getTextFromNode(item, 'SeVende') || item['$']?.['SeVende']);
      const secompra = parseBooleano(getTextFromNode(item, 'SeCompra') || item['$']?.['SeCompra']);
      const fechadealta = parseFecha(getTextFromNode(item, 'FechaDeAlta') || item['$']?.['FechaDeAlta']);
      const fechaultactualizacion = parseFecha(getTextFromNode(item, 'FechaUltActualizacion') || item['$']?.['FechaUltActualizacion']);

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
}

export async function syncAll() {
  await syncProductos();
}
