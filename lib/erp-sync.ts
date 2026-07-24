import { sql } from './db';
import { parseStringPromise } from 'xml2js';

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

    // Filtro con ArticuloID > 0 (para evitar error de referencia nula)
    const filtrosXML = `
      <Filtros>
        <Filtro>
          <Atributo>ArticuloID</Atributo>
          <Comparador>GreaterThan</Comparador>
          <Valor>0</Valor>
        </Filtro>
      </Filtros>
    `;

    // Construcción del XML SIN espacios extra ni saltos de línea problemáticos
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:art="http://plataforma.net.ar/">
  <soap:Body>
    <art:ObtenerArticulos>
      <art:AtributosVisibles>
        ${atributosXML}
      </art:AtributosVisibles>
      ${filtrosXML}
    </art:ObtenerArticulos>
  </soap:Body>
</soap:Envelope>`;

    console.log('📤 XML enviado:', soapEnvelope);

    console.log('📡 Enviando solicitud SOAP al ERP...');

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
      explicitArray: true,
      mergeAttrs: false,
      ignoreAttrs: true,
    });

    let articulos: any[] = [];
    
    try {
      const envelope = result['soap:Envelope'] || result;
      const body = envelope['soap:Body'] || envelope['s:Body'] || envelope;
      const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'] || body;
      
      let resultNode = responseNode?.['ObtenerArticulosResult']?.[0];
      if (!resultNode) {
        if (responseNode?.['Table']) {
          articulos = responseNode['Table'];
        } else {
          throw new Error('No se encontró ObtenerArticulosResult ni Table en la respuesta');
        }
      } else {
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

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

export async function syncAll() {
  await syncProductos();
}
