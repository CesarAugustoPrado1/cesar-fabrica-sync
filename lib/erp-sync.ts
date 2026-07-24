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

    // 1. Verificar si hay un soap:Fault
    const envelope = result['soap:Envelope'] || result['Envelope'] || result;
    const body = envelope['soap:Body'] || envelope['Body'] || envelope;
    const fault = body['soap:Fault'] || body['Fault'] || body['SOAP-ENV:Fault'];
    if (fault) {
      const faultCode = getTextFromNode(fault, 'faultcode') || 'desconocido';
      const faultString = getTextFromNode(fault, 'faultstring') || 'Error sin descripción';
      throw new Error(`SOAP Fault: ${faultCode} - ${faultString}`);
    }

    // 2. Buscar ObtenerArticulosResponse
    const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'] || body;
    const resultNode = responseNode?.['ObtenerArticulosResult']?.[0];

    if (!resultNode) {
      // Si no hay ObtenerArticulosResult, buscar directamente <Articulos> o <Table>
      const articulosNode = body['Articulos'] || body['tns:Articulos'] || body['art:Articulos'];
      if (articulosNode) {
        // Extraer artículos de <Articulos>
        let articulos = articulosNode['Articulo'] || articulosNode['tns:Articulo'] || articulosNode['art:Articulo'];
        if (!articulos) {
          throw new Error('No se encontraron nodos <Articulo> dentro de <Articulos>');
        }
        if (!Array.isArray(articulos)) articulos = [articulos];
        console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);
        await procesarArticulos(articulos);
        return;
      }

      // Buscar <Table> directamente (algunas respuestas no tienen envoltura)
      const tableNode = body['Table'] || body['tns:Table'] || body['art:Table'];
      if (tableNode) {
        const articulos = Array.isArray(tableNode) ? tableNode : [tableNode];
        console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);
        await procesarArticulos(articulos);
        return;
      }

      throw new Error('No se encontró ObtenerArticulosResult ni estructura de artículos en la respuesta');
    }

    // 3. Si tenemos resultNode, buscar <Articulos> o <Table> dentro de él
    let articulos: any[] = [];
    const articulosNode = resultNode['Articulos'] || resultNode['tns:Articulos'] || resultNode['art:Articulos'];
    if (articulosNode) {
      let raw = articulosNode['Articulo'] || articulosNode['tns:Articulo'] || articulosNode['art:Articulo'];
      if (raw) {
        articulos = Array.isArray(raw) ? raw : [raw];
      }
    }

    if (articulos.length === 0) {
      // Buscar <Table> dentro de resultNode
      const tableNode = resultNode['Table'] || resultNode['tns:Table'] || resultNode['art:Table'];
      if (tableNode) {
        articulos = Array.isArray(tableNode) ? tableNode : [tableNode];
      }
    }

    if (articulos.length === 0) {
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
      // Extraer valores
      const articuloid = parseInt(getTextFromNode(item, 'ArticuloID') || '0');
      const nombre = getTextFromNode(item, 'Nombre');
      const descripcion = getTextFromNode(item, 'Descripcion');
      const unidadmedidastock = getTextFromNode(item, 'UnidadDeMedidaDeStock');
      const sevende = parseBooleano(getTextFromNode(item, 'SeVende'));
      const secompra = parseBooleano(getTextFromNode(item, 'SeCompra'));
      const fechadealta = parseFecha(getTextFromNode(item, 'FechaDeAlta'));
      const fechaultactualizacion = parseFecha(getTextFromNode(item, 'FechaUltActualizacion'));

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
