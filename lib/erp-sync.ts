import { sql } from './db';

// Lista MÍNIMA (la original que funcionaba con 1,118 artículos)
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

// URL del servicio SOAP
const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';

// Función auxiliar para parsear fechas
function parseFecha(valor: string | null): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

// Función auxiliar para parsear booleanos
function parseBooleano(valor: string | null): boolean | null {
  if (!valor) return null;
  const lower = valor.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'sí' || lower === 'si' || lower === 'yes';
}

// Función para obtener el valor de un nodo XML
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
    // 1. Construir el SOAP envelope con atributos mínimos y Filtros vacío
    const atributosXML = atributosMinimos.map(attr => 
      `<ArticuloAtributos>${attr}</ArticuloAtributos>`
    ).join('');

    const soapEnvelope = `
      <?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                     xmlns:art="http://plataforma.net.ar/">
        <soap:Body>
          <art:ObtenerArticulos>
            <art:AtributosVisibles>
              ${atributosXML}
            </art:AtributosVisibles>
            <art:Filtros />
          </art:ObtenerArticulos>
        </soap:Body>
      </soap:Envelope>
    `;

    console.log('📡 Enviando solicitud SOAP al ERP...');

    // 2. Hacer la solicitud HTTP
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

    // 3. Parsear el XML de respuesta
    const { parseStringPromise } = await import('xml2js');
    
    const result = await parseStringPromise(xmlText, {
      explicitArray: true,
      mergeAttrs: false,
      ignoreAttrs: true,
    });

    // 4. Navegar hasta los artículos (maneja ambas estructuras: con y sin NewDataSet)
    let articulos: any[] = [];
    
    try {
      // Buscar el nodo ObtenerArticulosResponse
      const envelope = result['soap:Envelope'] || result;
      const body = envelope['soap:Body'] || envelope['s:Body'] || envelope;
      const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'] || body;
      
      // Obtener el resultado
      let resultNode = responseNode?.['ObtenerArticulosResult']?.[0];
      if (!resultNode) {
        // Si no hay ObtenerArticulosResult, buscar directamente Table
        if (responseNode?.['Table']) {
          articulos = responseNode['Table'];
        } else {
          throw new Error('No se encontró ObtenerArticulosResult ni Table en la respuesta');
        }
      } else {
        // Buscar NewDataSet -> Table
        const newDataSet = resultNode['NewDataSet']?.[0];
        if (newDataSet?.['Table']) {
          articulos = newDataSet['Table'];
        } else if (resultNode['Table']) {
          articulos = resultNode['Table'];
        } else {
          throw new Error('No se encontraron artículos en la respuesta');
        }
      }
    } catch (err) {
      console.error('Error al parsear la estructura del XML:', err);
      throw err;
    }

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    // 5. Procesar cada artículo
    let procesados = 0;
    let errores = 0;

    for (const item of articulos) {
      try {
        const articulo = {
          articuloid: parseInt(getTextFromNode(item, 'ArticuloID') || '0'),
          nombre: getTextFromNode(item, 'Nombre'),
          descripcion: getTextFromNode(item, 'Descripcion'),
          unidadmedidastock: getTextFromNode(item, 'UnidadDeMedidaDeStock'),
          sevende: parseBooleano(getTextFromNode(item, 'SeVende')),
          secompra: parseBooleano(getTextFromNode(item, 'SeCompra')),
          fechadealta: parseFecha(getTextFromNode(item, 'FechaDeAlta')),
          fechaultactualizacion: parseFecha(getTextFromNode(item, 'FechaUltActualizacion')),
        };

        // 6. Insertar o actualizar con SQL seguro
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

    console.log(`📊 Resumen de sincronización de artículos:`);
    console.log(`   Procesados: ${procesados}`);
    console.log(`   Errores: ${errores}`);
    console.log('✅ Sincronización de artículos completada');

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

export async function syncAll() {
  await syncProductos();
}
