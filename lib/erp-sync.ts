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

// Obtener valor de un nodo o atributo
function getValueFromNode(node: any, tagName: string, attrName?: string): string | null {
  if (!node) return null;
  // Si es un objeto y tiene el atributo, devolverlo
  if (attrName && node.$ && node.$[attrName] !== undefined) {
    return node.$[attrName];
  }
  // Si tiene hijos, buscar el tagName
  if (node[tagName]) {
    const child = node[tagName];
    if (Array.isArray(child) && child.length > 0) {
      // Si el hijo tiene un atributo, devolverlo
      if (child[0].$ && child[0].$[attrName || '']) {
        return child[0].$[attrName || ''];
      }
      // Si el hijo tiene texto
      if (child[0]._ !== undefined) {
        return child[0]._;
      }
      return child[0] || null;
    }
    return child || null;
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
      mergeAttrs: true,    // Para fusionar atributos en el objeto
      ignoreAttrs: false,  // Para mantener atributos en $
    });

    // 1. Verificar si hay un soap:Fault
    const envelope = result['soap:Envelope'] || result['Envelope'] || result;
    const body = envelope['soap:Body'] || envelope['Body'] || envelope;
    const fault = body['soap:Fault'] || body['Fault'] || body['SOAP-ENV:Fault'];
    if (fault) {
      const faultCode = fault['faultcode']?.[0] || 'desconocido';
      const faultString = fault['faultstring']?.[0] || 'Error sin descripción';
      throw new Error(`SOAP Fault: ${faultCode} - ${faultString}`);
    }

    // 2. Buscar ObtenerArticulosResponse (puede tener namespace)
    const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'] || body['art:ObtenerArticulosResponse'];
    if (!responseNode) {
      throw new Error('No se encontró ObtenerArticulosResponse en la respuesta');
    }

    // Obtener el resultado
    const resultNode = responseNode[0]?.['ObtenerArticulosResult']?.[0] || responseNode[0]?.['tns:ObtenerArticulosResult']?.[0];
    if (!resultNode) {
      throw new Error('No se encontró ObtenerArticulosResult en la respuesta');
    }

    // Buscar Articulos (sin namespace, ya que viene con xmlns="")
    let articulosNode = resultNode['Articulos'] || resultNode['tns:Articulos'] || resultNode['art:Articulos'];
    if (!articulosNode) {
      // Si no hay Articulos, buscar Table (estructura alternativa)
      const tableNode = resultNode['Table'] || resultNode['tns:Table'] || resultNode['art:Table'];
      if (tableNode) {
        articulosNode = { 'Articulo': tableNode };
      } else {
        throw new Error('No se encontró el nodo Articulos en la respuesta');
      }
    }

    // Extraer los artículos
    let articulos = articulosNode[0]?.['Articulo'] || articulosNode[0]?.['tns:Articulo'] || articulosNode[0]?.['art:Articulo'];
    if (!articulos) {
      // Si no hay Articulo, intentar usar el propio nodo como lista
      articulos = articulosNode[0] || articulosNode;
    }

    if (!articulos) {
      throw new Error('No se encontraron artículos en la respuesta');
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
        // Extraer valores (como atributo o como hijo)
        const articuloid = parseInt(
          (item.$ && item.$.ArticuloID) || 
          getValueFromNode(item, 'ArticuloID') || 
          '0'
        );
        
        const nombre = 
          (item.$ && item.$.Nombre) || 
          getValueFromNode(item, 'Nombre') || 
          null;
        
        const descripcion = 
          (item.$ && item.$.Descripcion) || 
          getValueFromNode(item, 'Descripcion') || 
          null;
        
        const unidadmedidastock = 
          (item.$ && item.$.UnidadDeMedidaDeStock) || 
          getValueFromNode(item, 'UnidadDeMedidaDeStock') || 
          null;
        
        const sevende = parseBooleano(
          (item.$ && item.$.SeVende) || 
          getValueFromNode(item, 'SeVende') || 
          null
        );
        
        const secompra = parseBooleano(
          (item.$ && item.$.SeCompra) || 
          getValueFromNode(item, 'SeCompra') || 
          null
        );
        
        const fechadealta = parseFecha(
          (item.$ && item.$.FechaDeAlta) || 
          getValueFromNode(item, 'FechaDeAlta') || 
          null
        );
        
        const fechaultactualizacion = parseFecha(
          (item.$ && item.$.FechaUltActualizacion) || 
          getValueFromNode(item, 'FechaUltActualizacion') || 
          null
        );

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
