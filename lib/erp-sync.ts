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

// Función auxiliar para parsear fechas (maneja null o valores inválidos)
function parseFecha(valor: string | null): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

// Función auxiliar para parsear números
function parseNumero(valor: string | null): number | null {
  if (!valor) return null;
  const num = parseFloat(valor);
  return isNaN(num) ? null : num;
}

// Función auxiliar para parsear booleanos (acepta 'true', '1', 'Sí', etc.)
function parseBooleano(valor: string | null): boolean | null {
  if (!valor) return null;
  const lower = valor.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'sí' || lower === 'si' || lower === 'yes';
}

// Función para obtener el valor de un nodo XML (búsqueda por nombre de etiqueta)
function getTextFromNode(node: any, tagName: string): string | null {
  if (!node) return null;
  const child = node[tagName];
  if (Array.isArray(child) && child.length > 0) {
    return child[0] || null;
  }
  return child || null;
}

// Función principal de sincronización de artículos (USANDO LISTA MÍNIMA)
export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    // 1. Construir el SOAP envelope con los ATRIBUTOS MÍNIMOS
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

    // 3. Capturar error 400 con el cuerpo de la respuesta
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cuerpo de la respuesta de error:', errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('✅ Respuesta recibida del ERP');

    // 4. Parsear el XML de respuesta (usamos xml2js)
    const { parseStringPromise } = await import('xml2js');
    
    const result = await parseStringPromise(xmlText, {
      explicitArray: true,
      mergeAttrs: false,
      ignoreAttrs: true,
    });

    // 5. Navegar hasta los artículos
    let articulos: any[] = [];
    try {
      const envelope = result['soap:Envelope'] || result['soap:Envelope'] || result;
      const body = envelope['soap:Body'] || envelope['s:Body'] || envelope;
      const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'];
      const resultNode = responseNode?.[0]?.['ObtenerArticulosResult']?.[0];
      const newDataSet = resultNode?.['NewDataSet']?.[0];
      
      if (newDataSet && newDataSet['Table']) {
        articulos = newDataSet['Table'];
      } else if (resultNode && resultNode['Table']) {
        articulos = resultNode['Table'];
      } else {
        throw new Error('No se encontraron artículos en la respuesta XML');
      }
    } catch (err) {
      console.error('Error al parsear la estructura del XML:', err);
      throw err;
    }

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    // 6. Procesar cada artículo (SOLO los atributos mínimos)
    let insertados = 0;
    let actualizados = 0;
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

        // 7. Insertar o actualizar en la base de datos (SOLO columnas existentes)
        const query = `
          INSERT INTO productos (
            articuloid, nombre, descripcion, unidadmedidastock,
            sevende, secompra, fechadealta, fechaultactualizacion,
            ultima_sincronizacion
          ) VALUES (
            ${articulo.articuloid}, 
            ${articulo.nombre ? `'${articulo.nombre.replace(/'/g, "''")}'` : null},
            ${articulo.descripcion ? `'${articulo.descripcion.replace(/'/g, "''")}'` : null},
            ${articulo.unidadmedidastock ? `'${articulo.unidadmedidastock.replace(/'/g, "''")}'` : null},
            ${articulo.sevende !== null ? articulo.sevende : null},
            ${articulo.secompra !== null ? articulo.secompra : null},
            ${articulo.fechadealta ? `'${articulo.fechadealta.toISOString()}'` : null},
            ${articulo.fechaultactualizacion ? `'${articulo.fechaultactualizacion.toISOString()}'` : null},
            CURRENT_TIMESTAMP
          )
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

        await sql.unsafe(query);
        insertados++;
        console.log(`✅ Artículo ${articulo.articuloid} - ${articulo.nombre} procesado correctamente`);
        
      } catch (error) {
        errores++;
        console.error(`❌ Error procesando artículo:`, error);
      }
    }

    console.log(`📊 Resumen de sincronización de artículos:`);
    console.log(`   Insertados/actualizados: ${insertados}`);
    console.log(`   Errores: ${errores}`);
    console.log('✅ Sincronización de artículos completada');

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

// Función para sincronizar todos los tipos de datos (por ahora solo productos)
export async function syncAll() {
  await syncProductos();
  // Aquí agregaremos clientes, ventas, etc.
}
