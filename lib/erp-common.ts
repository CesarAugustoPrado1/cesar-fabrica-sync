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

export function getAttr(node: Record<string, unknown> | null | undefined, attrName: string): string | null {
  if (!node || typeof node !== 'object' || !('$' in node)) return null;
  const attrs = node.$ as Record<string, unknown> | undefined;
  return typeof attrs?.[attrName] === 'string' ? String(attrs[attrName]) : null;
}

// Versión mejorada con logs internos
export function findAllItems(obj: unknown, itemName: string, idAttr: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const stack: unknown[] = [obj];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    const key = JSON.stringify(current);
    if (visited.has(key)) continue;
    visited.add(key);

    const currentRecord = current as Record<string, unknown>;

    // 1. Si el objeto tiene el id como atributo, es un item
    if (currentRecord.$ && typeof currentRecord.$ === 'object' && (currentRecord.$ as Record<string, unknown>)[idAttr] !== undefined) {
      results.push(currentRecord);
      continue;
    }

    // 2. Si el objeto tiene una clave que termina en itemName (ej. 'Cliente', 'tns:Cliente')
    for (const k of Object.keys(currentRecord)) {
      if (k.endsWith(itemName)) {
        const items = Array.isArray(currentRecord[k]) ? currentRecord[k] : [currentRecord[k]];
        for (const it of items) {
          if (it && typeof it === 'object') {
            const record = it as Record<string, unknown>;
            if ((record.$ && typeof record.$ === 'object' && (record.$ as Record<string, unknown>)[idAttr] !== undefined) || record[idAttr] !== undefined) {
              results.push(record);
            } else {
              stack.push(it);
            }
          }
        }
      }
    }

    // 3. Buscar en propiedades hijas (excepto las ya procesadas)
    for (const k of Object.keys(currentRecord)) {
      if (k !== itemName && currentRecord[k] && typeof currentRecord[k] === 'object') {
        stack.push(currentRecord[k]);
      }
    }
  }

  console.log(`🔍 findAllItems encontró ${results.length} elementos con ${idAttr}`);
  return results;
}

// Función genérica con logs y límite
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
  mapear,
  limite = 100 // 👈 Límite para pruebas (cambiar a 0 para sin límite)
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
  mapear: (item: Record<string, unknown>) => Record<string, unknown>;
  limite?: number;
}) {
  try {
    const atributosXML = atributos.map(attr => 
      `<${nodoItem}Atributos>${attr}</${nodoItem}Atributos>`
    ).join('');

    // ⚠️ IMPORTANTE: Incluir <Filtros /> vacío para evitar NullReferenceException
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
    console.log(`📄 XML enviado (primeros 300 caracteres): ${soapEnvelope.slice(0, 300)}...`);

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

    // Log de estructura completa para depuración
    console.log(`📄 Estructura del resultado (primeros 500 caracteres):`, JSON.stringify(result).slice(0, 500));

    let items = findAllItems(result, nodoItem, idAttr);
    console.log(`📦 ${nombre} obtenidos del ERP: ${items.length}`);

    // Limitar para pruebas
    if (limite > 0 && items.length > limite) {
      console.log(`⚠️ Aplicando límite de ${limite} registros para pruebas.`);
      items = items.slice(0, limite);
    }

    if (items.length === 0) {
      console.warn(`⚠️ No se encontraron ${nombre} en la respuesta.`);
      return;
    }

    console.log(`🔄 Procesando ${items.length} ${nombre}...`);

    let procesados = 0;
    let errores = 0;
    const lote: Record<string, unknown>[] = [];

    for (const item of items) {
      try {
        const data = mapear(item);
        if (!data[idCol]) {
          console.warn(`⚠️ ${nombre} sin ${idCol}, omitiendo...`);
          continue;
        }
        lote.push(data);
      } catch (error) {
        errores++;
        console.error(`❌ Error mapeando ${nombre}:`, error);
      }
    }

    console.log(`📦 ${lote.length} ${nombre} listos para insertar.`);

    // Insertar en lotes de 50 para mejor rendimiento
    const batchSize = 50;
    for (let i = 0; i < lote.length; i += batchSize) {
      const batch = lote.slice(i, i + batchSize);
      try {
        await sql.query('BEGIN');
        for (const data of batch) {
          const columns = Object.keys(data);
          const values = columns.map((_, idx) => `$${idx + 1}`).join(', ');
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
        }
        await sql.query('COMMIT');
        console.log(`📊 ${nombre} procesados: ${procesados}/${lote.length}`);
      } catch (error) {
        await sql.query('ROLLBACK');
        console.error(`❌ Error en lote de ${nombre}:`, error);
        errores += batch.length;
      }
    }

    console.log(`📊 Resumen ${nombre}:`);
    console.log(`   Procesados: ${procesados}`);
    console.log(`   Errores: ${errores}`);
    console.log(`✅ Sincronización de ${nombre} completada`);

    return { procesados, errores };
  } catch (error) {
    console.error(`❌ Error en sync${nombre.charAt(0).toUpperCase() + nombre.slice(1)}:`, error);
    throw error;
  }
}
