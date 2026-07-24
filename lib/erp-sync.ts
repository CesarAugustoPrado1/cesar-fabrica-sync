import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// Lista con atributos mínimos + 8 clasificaciones
const atributosBasicos = [
  'ArticuloID',
  'Nombre',
  'Descripcion',
  'UnidadDeMedidaDeStock',
  'SeVende',
  'SeCompra',
  'FechaDeAlta',
  'FechaUltActualizacion'
];

const atributosClasificaciones = [
  'Clasificacion1Articulos',
  'Clasificacion2Articulos',
  'Clasificacion3Articulos',
  'Clasificacion4Articulos',
  'Clasificacion5Articulos',
  'Clasificacion6Articulos',
  'Clasificacion7Articulos',
  'Clasificacion8Articulos'
];

const atributos = [...atributosBasicos, ...atributosClasificaciones];

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

function getAttr(node: any, attrName: string): string | null {
  if (!node || !node.$) return null;
  return node.$[attrName] || null;
}

function findNode(obj: any, nodeName: string): any | null {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findNode(item, nodeName);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === nodeName || key.includes(nodeName) || key.endsWith(nodeName)) {
        return obj[key];
      }
    }
    for (const key of Object.keys(obj)) {
      if (obj[key] && typeof obj[key] === 'object') {
        const found = findNode(obj[key], nodeName);
        if (found) return found;
      }
    }
  }
  return null;
}

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    const atributosXML = atributos.map(attr => 
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

    const result = await parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: false,
      ignoreAttrs: false,
      attrkey: '$',
      charkey: '_',
      trim: true,
    });

    const articulosNode = findNode(result, 'Articulos');
    if (!articulosNode) {
      console.error('❌ Estructura completa del resultado:', JSON.stringify(result, null, 2));
      throw new Error('No se encontró el nodo Articulos en la respuesta');
    }

    let articulos = articulosNode['Articulo'] || articulosNode['tns:Articulo'];
    if (!articulos) {
      console.error('❌ Claves en articulosNode:', Object.keys(articulosNode));
      throw new Error('No se encontraron nodos Articulo dentro de Articulos');
    }

    if (!Array.isArray(articulos)) {
      articulos = [articulos];
    }

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    let procesados = 0;
    let errores = 0;

    for (const item of articulos) {
      try {
        const articulo = {
          articuloid: parseInt(getAttr(item, 'ArticuloID') || '0'),
          nombre: getAttr(item, 'Nombre'),
          descripcion: getAttr(item, 'Descripcion'),
          unidadmedidastock: getAttr(item, 'UnidadDeMedidaDeStock'),
          sevende: parseBooleano(getAttr(item, 'SeVende')),
          secompra: parseBooleano(getAttr(item, 'SeCompra')),
          fechadealta: parseFecha(getAttr(item, 'FechaDeAlta')),
          fechaultactualizacion: parseFecha(getAttr(item, 'FechaUltActualizacion')),
          clasificacion1articulos: getAttr(item, 'Clasificacion1Articulos'),
          clasificacion2articulos: getAttr(item, 'Clasificacion2Articulos'),
          clasificacion3articulos: getAttr(item, 'Clasificacion3Articulos'),
          clasificacion4articulos: getAttr(item, 'Clasificacion4Articulos'),
          clasificacion5articulos: getAttr(item, 'Clasificacion5Articulos'),
          clasificacion6articulos: getAttr(item, 'Clasificacion6Articulos'),
          clasificacion7articulos: getAttr(item, 'Clasificacion7Articulos'),
          clasificacion8articulos: getAttr(item, 'Clasificacion8Articulos'),
        };

        const query = `
          INSERT INTO productos (
            articuloid, nombre, descripcion, unidadmedidastock,
            sevende, secompra, fechadealta, fechaultactualizacion,
            clasificacion1articulos, clasificacion2articulos,
            clasificacion3articulos, clasificacion4articulos,
            clasificacion5articulos, clasificacion6articulos,
            clasificacion7articulos, clasificacion8articulos,
            ultima_sincronizacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
          ON CONFLICT (articuloid) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            unidadmedidastock = EXCLUDED.unidadmedidastock,
            sevende = EXCLUDED.sevende,
            secompra = EXCLUDED.secompra,
            fechadealta = EXCLUDED.fechadealta,
            fechaultactualizacion = EXCLUDED.fechaultactualizacion,
            clasificacion1articulos = EXCLUDED.clasificacion1articulos,
            clasificacion2articulos = EXCLUDED.clasificacion2articulos,
            clasificacion3articulos = EXCLUDED.clasificacion3articulos,
            clasificacion4articulos = EXCLUDED.clasificacion4articulos,
            clasificacion5articulos = EXCLUDED.clasificacion5articulos,
            clasificacion6articulos = EXCLUDED.clasificacion6articulos,
            clasificacion7articulos = EXCLUDED.clasificacion7articulos,
            clasificacion8articulos = EXCLUDED.clasificacion8articulos,
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
          articulo.fechaultactualizacion,
          articulo.clasificacion1articulos,
          articulo.clasificacion2articulos,
          articulo.clasificacion3articulos,
          articulo.clasificacion4articulos,
          articulo.clasificacion5articulos,
          articulo.clasificacion6articulos,
          articulo.clasificacion7articulos,
          articulo.clasificacion8articulos,
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
