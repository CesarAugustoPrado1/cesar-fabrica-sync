import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// --- ATRIBUTOS DE PRODUCTOS (ya los tienes) ---
const atributosProductos = [
  'ArticuloID',
  'Nombre',
  'Descripcion',
  'UnidadDeMedidaDeStock',
  'SeVende',
  'SeCompra',
  'FechaDeAlta',
  'FechaUltActualizacion',
  'Clasificacion1Articulos',
  'Clasificacion2Articulos',
  'Clasificacion3Articulos',
  'Clasificacion4Articulos',
  'Clasificacion5Articulos',
  'Clasificacion6Articulos',
  'Clasificacion7Articulos',
  'Clasificacion8Articulos',
  'Clasificacion9Articulos',
  'Clasificacion10Articulos',
  'Clasificacion11Articulos',
  'Clasificacion12Articulos',
  'Clasificacion13Articulos',
  'Clasificacion14Articulos',
  'Clasificacion15Articulos',
  'Clasificacion16Articulos',
  'Clasificacion1ArticulosNombre',
  'Clasificacion2ArticulosNombre',
  'Clasificacion3ArticulosNombre',
  'Clasificacion4ArticulosNombre',
  'Clasificacion5ArticulosNombre',
  'Clasificacion6ArticulosNombre',
  'Clasificacion7ArticulosNombre',
  'Clasificacion8ArticulosNombre',
  'Clasificacion9ArticulosNombre',
  'Clasificacion10ArticulosNombre',
  'Clasificacion11ArticulosNombre',
  'Clasificacion12ArticulosNombre',
  'Clasificacion13ArticulosNombre',
  'Clasificacion14ArticulosNombre',
  'Clasificacion15ArticulosNombre',
  'Clasificacion16ArticulosNombre',
  'SeControlaStock',
  'SeAdministraConPartidas',
  'SeAdministraConNumerosDeSerie',
  'SeAdministraPorTalles',
  'FechaDeBaja',
  'BloqueadoParaMovimientosDeStock',
  'GeneraMovimientosDeStock',
  'PesoEmbaladoPorUnidadDeMedidaDeStock',
  'CantidadPorUnidadDeMedidaDeStockPorBulto',
  'UnidadDeMedidaHomogeneaDeStock',
  'FactorDeConversionUnidadDeMedidaHomogeneaDeStock',
  'CuentaDeActivo',
  'SeProduce',
  'ModoDeConsumoDeComponentes',
  'ModalidadDeStockMinimo',
  'StockMinimoParaModalidadPorCantidadFija',
  'AdministraPrecioPromedioPonderado',
  'AjustaCantidadesEnUMDeStockCalculadasPorElSistema',
  'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock',
  'SeCosteaPorCierreMensual',
  'Talle',
  'Color',
  'DivisionParaAsientoDeCosteoPorCierre',
  'EspecieDeGranoONCCA',
  'TipoDeGranoONCCA',
  'VariedadDeGrano',
  'CuentaDeAnticipoLiquidacionCompraCereal',
  'CodigoDeProductoCOT',
  'UnidadDeMedidaCOT',
  'FactorDeConversionCOT',
  'VolumenEmbaladoPorUnidadDeMedidaDeStock',
  'UnidadDeMedidaParaDimensionesDelArticulo',
  'Largo',
  'Ancho',
  'Alto',
  'BloqueadoParaVenta',
  'FechaDeBajaParaVentas'
];

// --- ATRIBUTOS DE CLIENTES ---
const atributosClientes = [
  'ClienteID',
  'Nombre',
  'NombreLegal',
  'Domicilio',
  'Localidad',
  'CodigoPostal',
  'Provincia',
  'ProvinciaNombre',
  'Pais',
  'PaisNombre',
  'Telefono',
  'Fax',
  'Email',
  'Observacion',
  'CondicionAnteElIVA',
  'CondicionAnteElIVANombre',
  'IngresosBrutos',
  'ContactoDeVenta',
  'ContactoDeCobros',
  'CondicionPago',
  'CondicionPagoNombre',
  'MonedaUsualCuentaCorriente',
  'MonedaUsualCuentaCorrienteNombre',
  'CuentaCliente',
  'TipoDeCliente',
  'TipoDeClienteNombre',
  'ActividadDeCliente',
  'ActividadDeClienteNombre',
  'Vendedor',
  'VendedorNombre',
  'ZonaDeVenta',
  'ZonaDeVentaNombre',
  'Cobrador',
  'CobradorNombre',
  'BloqueadoParaNotasDePedido',
  'BloqueadoParaFacturar',
  'FechaDeAlta',
  'FechaDeBaja',
  'HabilitadoParaConsultasWeb',
  'FechaUltActualizacion'
];

const SOAP_URL_PRODUCTOS = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';
const SOAP_URL_CLIENTES = 'http://wspirkastone.pypcloud.net:1881/ServicioCCOCliente.asmx';

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

function parseNumero(valor: string | null): number | null {
  if (!valor) return null;
  const num = parseFloat(valor);
  return isNaN(num) ? null : num;
}

function getAttr(node: any, attrName: string): string | null {
  if (!node || !node.$) return null;
  return node.$[attrName] || null;
}

function findAllNodes(obj: any, nodeName: string): any[] {
  const results: any[] = [];
  if (!obj) return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findAllNodes(item, nodeName));
    }
    return results;
  }

  if (typeof obj === 'object') {
    // Si el objeto tiene la clave exacta
    if (obj[nodeName]) {
      const items = Array.isArray(obj[nodeName]) ? obj[nodeName] : [obj[nodeName]];
      results.push(...items);
    }
    // Buscar recursivamente en todas las propiedades
    for (const key of Object.keys(obj)) {
      if (key !== nodeName && obj[key] && typeof obj[key] === 'object') {
        results.push(...findAllNodes(obj[key], nodeName));
      }
    }
  }
  return results;
}

function findNodesWithAttribute(obj: any, attrName: string): any[] {
  const results: any[] = [];
  if (!obj) return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findNodesWithAttribute(item, attrName));
    }
    return results;
  }

  if (typeof obj === 'object') {
    // Si el objeto tiene el atributo buscado, es un nodo válido
    if (obj.$ && obj.$[attrName] !== undefined) {
      results.push(obj);
    }
    // Buscar recursivamente en todas las propiedades
    for (const key of Object.keys(obj)) {
      if (obj[key] && typeof obj[key] === 'object') {
        results.push(...findNodesWithAttribute(obj[key], attrName));
      }
    }
  }
  return results;
}

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de productos...');

  try {
    const atributosXML = atributosProductos.map(attr => 
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

    console.log('📤 Enviando solicitud SOAP para productos...');
    const response = await fetch(SOAP_URL_PRODUCTOS, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://plataforma.net.ar/ObtenerArticulos',
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP en productos:', errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('✅ Respuesta de productos recibida');

    const result = await parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: false,
      ignoreAttrs: false,
      attrkey: '$',
      charkey: '_',
      trim: true,
    });

    const articulos = findNodesWithAttribute(result, 'ArticuloID');
    if (articulos.length === 0) {
      throw new Error('No se encontraron artículos en la respuesta');
    }

    console.log(`📦 Productos obtenidos: ${articulos.length}`);
    await procesarItems(articulos, 'productos', 'ArticuloID');
    console.log('✅ Sincronización de productos completada');

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

export async function syncClientes() {
  console.log('🔄 Iniciando sincronización de clientes...');

  try {
    const atributosXML = atributosClientes.map(attr => 
      `<ClienteAtributos>${attr}</ClienteAtributos>`
    ).join('');

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cli="http://wsplataforma.intecsoft.com.ar/">
  <soap:Body>
    <cli:ObtenerClientes>
      <cli:AtributosVisibles>
        ${atributosXML}
      </cli:AtributosVisibles>
    </cli:ObtenerClientes>
  </soap:Body>
</soap:Envelope>`;

    console.log('📤 Enviando solicitud SOAP para clientes...');
    const response = await fetch(SOAP_URL_CLIENTES, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://wsplataforma.intecsoft.com.ar/ObtenerClientes',
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP en clientes:', errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('✅ Respuesta de clientes recibida');

    const result = await parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: false,
      ignoreAttrs: false,
      attrkey: '$',
      charkey: '_',
      trim: true,
    });

    // Buscar nodos con atributo ClienteID
    const clientes = findNodesWithAttribute(result, 'ClienteID');
    if (clientes.length === 0) {
      console.error('❌ Estructura completa:', JSON.stringify(result, null, 2));
      throw new Error('No se encontraron clientes en la respuesta');
    }

    console.log(`📦 Clientes obtenidos: ${clientes.length}`);
    await procesarItems(clientes, 'clientes', 'ClienteID');
    console.log('✅ Sincronización de clientes completada');

  } catch (error) {
    console.error('❌ Error en syncClientes:', error);
    throw error;
  }
}

async function procesarItems(items: any[], tabla: string, idAttr: string) {
  let procesados = 0;
  let errores = 0;

  for (const item of items) {
    try {
      // Obtener el ID
      const id = getAttr(item, idAttr);
      if (!id) {
        errores++;
        continue;
      }

      // Obtener todos los atributos del nodo
      const attrMap: Record<string, any> = {};
      if (item.$) {
        for (const key of Object.keys(item.$)) {
          const value = item.$[key];
          // Determinar el tipo de dato según el nombre del atributo
          if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date')) {
            attrMap[key.toLowerCase()] = parseFecha(value);
          } else if (key.toLowerCase().includes('bloqueado') || key.toLowerCase().includes('habilitado')) {
            attrMap[key.toLowerCase()] = parseBooleano(value);
          } else if (key.toLowerCase().includes('peso') || key.toLowerCase().includes('cantidad') || key.toLowerCase().includes('factor') || key.toLowerCase().includes('stock')) {
            attrMap[key.toLowerCase()] = parseNumero(value);
          } else {
            attrMap[key.toLowerCase()] = value || null;
          }
        }
      }

      // Agregar el ID con el nombre correcto
      const idField = idAttr.toLowerCase();
      attrMap[idField] = parseInt(id);

      // Construir la query dinámica
      const columns = Object.keys(attrMap);
      if (columns.length === 0) {
        errores++;
        continue;
      }

      const values = columns.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

      const query = `
        INSERT INTO ${tabla} (${columns.join(', ')})
        VALUES (${values})
        ON CONFLICT (${idField}) DO UPDATE SET
          ${updateSet},
          ultima_sincronizacion = CURRENT_TIMESTAMP
      `;

      await sql(query, Object.values(attrMap));
      procesados++;

      if (procesados % 100 === 0) {
        console.log(`📊 Procesados ${procesados} ${tabla}...`);
      }

    } catch (error) {
      errores++;
      console.error(`❌ Error procesando ${tabla}:`, error);
    }
  }

  console.log(`📊 Resumen de ${tabla}: Procesados: ${procesados}, Errores: ${errores}`);
}

export async function syncAll() {
  await syncProductos();
  await syncClientes();
}
