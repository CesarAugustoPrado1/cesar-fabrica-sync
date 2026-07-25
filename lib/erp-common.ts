import { parseStringPromise } from 'xml2js';
import { sql } from './db';

// ==========================================
// Funciones auxiliares
// ==========================================

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

// ==========================================
// Búsqueda robusta de nodos (evita bucles)
// ==========================================

export function findAllItems(obj: any, itemName: string, idAttr: string): any[] {
  const results: any[] = [];
  const stack = [obj];
  const visited = new Set();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    // Evitar ciclos
    const key = JSON.stringify(current);
    if (visited.has(key)) continue;
    visited.add(key);

    // Caso 1: el objeto tiene el id como atributo
    if (current.$ && current.$[idAttr] !== undefined) {
      results.push(current);
      continue;
    }

    // Recorrer todas las claves del objeto
    for (const k of Object.keys(current)) {
      // Si la clave termina en itemName (ej. "Cliente", "tns:Cliente")
      if (k.endsWith(itemName)) {
        const items = Array.isArray(current[k]) ? current[k] : [current[k]];
        for (const it of items) {
          if (it && typeof it === 'object') {
            if ((it.$ && it.$[idAttr] !== undefined) || it[idAttr] !== undefined) {
              results.push(it);
            } else {
              stack.push(it);
            }
          }
        }
      } else {
        // Si no es el itemName, seguir explorando
        if (current[k] && typeof current[k] === 'object') {
          stack.push(current[k]);
        }
      }
    }
  }

  return results;
}

// ==========================================
// Función genérica de sincronización (optimizada)
// ==========================================

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
  limite = 1000,               // para pruebas
  usarFiltros = true,          // si false, envía <Filtros /> vacío
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
  limite?: number;
  usarFiltros?: boolean;
}) {
  try {
    // Construir XML de atributos
    const atributosXML = atributos.map(attr => 
      `<${nodoItem}Atributos>${attr}</${nodoItem}Atributos>`
    ).join('');

    // Construir nodo Filtros (vacío o con filtro)
    let filtrosXML = '';
    if (usarFiltros) {
      // Para clientes, normalmente se usa un filtro para no traer demasiados, pero lo dejamos opcional.
      // Por defecto enviamos filtro vacío.
      filtrosXML = `<ns:Filtros />`;
    } else {
      filtrosXML = `<ns:Filtros />`;
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ns="${namespace}">
  <soap:Body>
    <ns:${soapAction}>
      <ns:AtributosVisibles>
        ${atributosXML}
      </ns:AtributosVisibles>
      ${filtrosXML}
    </ns:${soapAction}>
  </soap:Body>
</soap:Envelope>`;

    console.log(`📤 Enviando solicitud SOAP para ${nombre}...`);
    console.log(`🔹 SOAPAction: ${soapActionUrl}`);
    console.log(`📄 XML Enviado:\n${soapEnvelope}`);

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

    // Log de estructura para depuración
    console.log(`📄 Estructura del resultado (primeros 500 caracteres):\n${JSON.stringify(result).slice(0, 500)}`);

    let items = findAllItems(result, nodoItem, idAttr);
    console.log(`📦 ${nombre} obtenidos del ERP: ${items.length}`);

    if (items.length > limite) {
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
    const lote = [];

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

    const batchSize = 100;
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

  } catch (error) {
    console.error(`❌ Error en sync${nombre.charAt(0).toUpperCase() + nombre.slice(1)}:`, error);
    throw error;
  }
}
