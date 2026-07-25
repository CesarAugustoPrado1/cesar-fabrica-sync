import { parseStringPromise } from 'xml2js';
import { sql } from './db';

export function parseFecha(valor: string | null): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

export function parseBooleano(valor: string | null): boolean | null {
  if (!valor) return null;
  const lower = valor.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'sí' || lower === 'si' || lower === 'yes';
}

export function parseNumero(valor: string | null): number | null {
  if (!valor) return null;
  const num = parseFloat(valor.replace(',', '.'));
  return isNaN(num) ? null : num;
}

export function getAttr(node: any, attrName: string): string | null {
  if (!node || !node.$) return null;
  return node.$[attrName] || null;
}

export function findAllItems(obj: any, itemName: string, idAttr: string): any[] {
  const results: any[] = [];
  if (!obj) return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findAllItems(item, itemName, idAttr));
    }
    return results;
  }

  if (typeof obj === 'object') {
    if (obj.$ && obj.$[idAttr] !== undefined) {
      results.push(obj);
    }
    if (obj[itemName]) {
      const items = Array.isArray(obj[itemName]) ? obj[itemName] : [obj[itemName]];
      for (const it of items) {
        if (it.$ && it.$[idAttr] !== undefined) {
          results.push(it);
        } else {
          results.push(...findAllItems(it, itemName, idAttr));
        }
      }
    }
    for (const key of Object.keys(obj)) {
      if (key !== itemName && obj[key] && typeof obj[key] === 'object') {
        results.push(...findAllItems(obj[key], itemName, idAttr));
      }
    }
  }
  return results;
}

export async function syncGenerico({
  nombre,
  url,
  atributos,
  soapAction,
  namespace,
  soapActionUrl,
  nodoItem,
  idAttr,
  tabla,
  idCol,
  mapear
}: {
  nombre: string;
  url: string;
  atributos: string[];
  soapAction: string;
  namespace: string;
  soapActionUrl: string;
  nodoItem: string;
  idAttr: string;
  tabla: string;
  idCol: string;
  mapear: (item: any) => any;
}) {
  try {
    const atributosXML = atributos.map(attr => 
      `<${nodoItem}Atributos>${attr}</${nodoItem}Atributos>`
    ).join('');

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ns="${namespace}">
  <soap:Body>
    <ns:${soapAction}>
      <ns:AtributosVisibles>
        ${atributosXML}
      </ns:AtributosVisibles>
      <ns:Filtros />
    </ns:${soapAction}>
  </soap:Body>
</soap:Envelope>`;

    console.log(`📤 Enviando solicitud SOAP para ${nombre}...`);
    console.log(`🔹 SOAPAction: ${soapActionUrl}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapActionUrl,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error en ${nombre}:`, errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`✅ Respuesta recibida para ${nombre}`);

    const result = await parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: false,
      ignoreAttrs: false,
      attrkey: '$',
      charkey: '_',
      trim: true,
    });

    const items = findAllItems(result, nodoItem, idAttr);
    console.log(`📦 ${nombre} obtenidos del ERP: ${items.length}`);

    if (items.length === 0) {
      console.warn(`⚠️ No se encontraron ${nombre} en la respuesta.`);
      return;
    }

    let procesados = 0;
    let errores = 0;

    for (const item of items) {
      try {
        const data = mapear(item);
        const columns = Object.keys(data);
        const values = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

        const query = `
          INSERT INTO ${tabla} (${columns.join(', ')})
          VALUES (${values})
          ON CONFLICT (${idCol}) DO UPDATE SET
            ${updateSet},
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        await sql.query(query, Object.values(data));
        procesados++;

        if (procesados % 100 === 0) {
          console.log(`📊 ${nombre} procesados: ${procesados}`);
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error procesando ${nombre}:`, error);
      }
    }

    console.log(`📊 Resumen ${nombre}:`);
    console.log(`   Procesados: ${procesados}`);
    console.log(`   Errores: ${errores}`);
    console.log(`✅ Sincronización de ${nombre} completada`);

  } catch (error) {
    console.error(`❌ Error en sync${nombre.charAt(0).toUpperCase() + nombre.slice(1)}:`, error);
    throw error;
  }
}
