import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// ========== ATRIBUTOS DE PRODUCTOS ==========
const atributosProductos = [
  'ArticuloID', 'Nombre', 'Descripcion', 'UnidadDeMedidaDeStock',
  'SeVende', 'SeCompra', 'FechaDeAlta', 'FechaUltActualizacion',
  'Clasificacion1Articulos', 'Clasificacion2Articulos', 'Clasificacion3Articulos',
  'Clasificacion4Articulos', 'Clasificacion5Articulos', 'Clasificacion6Articulos',
  'Clasificacion7Articulos', 'Clasificacion8Articulos', 'Clasificacion9Articulos',
  'Clasificacion10Articulos', 'Clasificacion11Articulos', 'Clasificacion12Articulos',
  'Clasificacion13Articulos', 'Clasificacion14Articulos', 'Clasificacion15Articulos',
  'Clasificacion16Articulos', 'Clasificacion1ArticulosNombre',
  'Clasificacion2ArticulosNombre', 'Clasificacion3ArticulosNombre',
  'Clasificacion4ArticulosNombre', 'Clasificacion5ArticulosNombre',
  'Clasificacion6ArticulosNombre', 'Clasificacion7ArticulosNombre',
  'Clasificacion8ArticulosNombre', 'Clasificacion9ArticulosNombre',
  'Clasificacion10ArticulosNombre', 'Clasificacion11ArticulosNombre',
  'Clasificacion12ArticulosNombre', 'Clasificacion13ArticulosNombre',
  'Clasificacion14ArticulosNombre', 'Clasificacion15ArticulosNombre',
  'Clasificacion16ArticulosNombre', 'SeControlaStock', 'SeAdministraConPartidas',
  'SeAdministraConNumerosDeSerie', 'SeAdministraPorTalles', 'FechaDeBaja',
  'BloqueadoParaMovimientosDeStock', 'GeneraMovimientosDeStock',
  'PesoEmbaladoPorUnidadDeMedidaDeStock', 'CantidadPorUnidadDeMedidaDeStockPorBulto',
  'UnidadDeMedidaHomogeneaDeStock', 'FactorDeConversionUnidadDeMedidaHomogeneaDeStock',
  'CuentaDeActivo', 'SeProduce', 'ModoDeConsumoDeComponentes',
  'ModalidadDeStockMinimo', 'StockMinimoParaModalidadPorCantidadFija',
  'AdministraPrecioPromedioPonderado', 'AjustaCantidadesEnUMDeStockCalculadasPorElSistema',
  'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock', 'SeCosteaPorCierreMensual',
  'Talle', 'Color', 'DivisionParaAsientoDeCosteoPorCierre',
  'EspecieDeGranoONCCA', 'TipoDeGranoONCCA', 'VariedadDeGrano',
  'CuentaDeAnticipoLiquidacionCompraCereal', 'CodigoDeProductoCOT',
  'UnidadDeMedidaCOT', 'FactorDeConversionCOT',
  'VolumenEmbaladoPorUnidadDeMedidaDeStock', 'UnidadDeMedidaParaDimensionesDelArticulo',
  'Largo', 'Ancho', 'Alto', 'BloqueadoParaVenta', 'FechaDeBajaParaVentas'
];

// ========== ATRIBUTOS DE CLIENTES ==========
const atributosClientes = [
  'ClienteID', 'Nombre', 'NombreLegal', 'Domicilio', 'Localidad',
  'CodigoPostal', 'Provincia', 'Pais', 'Telefono', 'Fax', 'Email',
  'Observacion', 'CondicionAnteElIVA', 'ClaveTributaria', 'IngresosBrutos',
  'ContactoDeVenta', 'ContactoDeCobros', 'CondicionPago',
  'MonedaUsualCuentaCorriente', 'CuentaCliente', 'TipoDeCliente',
  'ActividadDeCliente', 'Clasificacion1', 'Clasificacion2', 'Clasificacion3',
  'Clasificacion4', 'Clasificacion5', 'Clasificacion6', 'Clasificacion7',
  'Clasificacion8', 'Clasificacion9', 'Vendedor', 'ZonaDeVenta',
  'Cobrador', 'Transporte', 'BloqueadoParaNotasDePedido',
  'BloqueadoParaFacturar', 'FechaDeAlta', 'FechaDeBaja',
  'HabilitadoParaConsultasWeb', 'FormatoDeImpresionPorCliente',
  'Vendedor2', 'FechaUltActualizacion'
];

const SOAP_URL_PRODUCTOS = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';
const SOAP_URL_CLIENTES = 'http://wspirkastone.pypcloud.net:1881/ServicioCCOCliente.asmx';

// ========== FUNCIONES AUXILIARES ==========
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

function findAllItems(obj: any, itemName: string, idAttr: string): any[] {
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

// ========== SINCRONIZACIÓN DE PRODUCTOS ==========
export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de productos...');
  await syncGenerico({
    nombre: 'productos',
    url: SOAP_URL_PRODUCTOS,
    atributos: atributosProductos,
    soapAction: 'ObtenerArticulos',
    nodoItem: 'Articulo',
    idAttr: 'ArticuloID',
    tabla: 'productos',
    idCol: 'articuloid',
    mapear: (item: any) => ({
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
      clasificacion9articulos: getAttr(item, 'Clasificacion9Articulos'),
      clasificacion10articulos: getAttr(item, 'Clasificacion10Articulos'),
      clasificacion11articulos: getAttr(item, 'Clasificacion11Articulos'),
      clasificacion12articulos: getAttr(item, 'Clasificacion12Articulos'),
      clasificacion13articulos: getAttr(item, 'Clasificacion13Articulos'),
      clasificacion14articulos: getAttr(item, 'Clasificacion14Articulos'),
      clasificacion15articulos: getAttr(item, 'Clasificacion15Articulos'),
      clasificacion16articulos: getAttr(item, 'Clasificacion16Articulos'),
      clasificacion1articulosnombre: getAttr(item, 'Clasificacion1ArticulosNombre'),
      clasificacion2articulosnombre: getAttr(item, 'Clasificacion2ArticulosNombre'),
      clasificacion3articulosnombre: getAttr(item, 'Clasificacion3ArticulosNombre'),
      clasificacion4articulosnombre: getAttr(item, 'Clasificacion4ArticulosNombre'),
      clasificacion5articulosnombre: getAttr(item, 'Clasificacion5ArticulosNombre'),
      clasificacion6articulosnombre: getAttr(item, 'Clasificacion6ArticulosNombre'),
      clasificacion7articulosnombre: getAttr(item, 'Clasificacion7ArticulosNombre'),
      clasificacion8articulosnombre: getAttr(item, 'Clasificacion8ArticulosNombre'),
      clasificacion9articulosnombre: getAttr(item, 'Clasificacion9ArticulosNombre'),
      clasificacion10articulosnombre: getAttr(item, 'Clasificacion10ArticulosNombre'),
      clasificacion11articulosnombre: getAttr(item, 'Clasificacion11ArticulosNombre'),
      clasificacion12articulosnombre: getAttr(item, 'Clasificacion12ArticulosNombre'),
      clasificacion13articulosnombre: getAttr(item, 'Clasificacion13ArticulosNombre'),
      clasificacion14articulosnombre: getAttr(item, 'Clasificacion14ArticulosNombre'),
      clasificacion15articulosnombre: getAttr(item, 'Clasificacion15ArticulosNombre'),
      clasificacion16articulosnombre: getAttr(item, 'Clasificacion16ArticulosNombre'),
      secontrolastock: parseBooleano(getAttr(item, 'SeControlaStock')),
      seadministraconpartidas: parseBooleano(getAttr(item, 'SeAdministraConPartidas')),
      seadministraconnumerosdeserie: parseBooleano(getAttr(item, 'SeAdministraConNumerosDeSerie')),
      seadministraportalles: parseBooleano(getAttr(item, 'SeAdministraPorTalles')),
      fechadebaja: parseFecha(getAttr(item, 'FechaDeBaja')),
      bloqueadoparamovimientosstock: parseBooleano(getAttr(item, 'BloqueadoParaMovimientosDeStock')),
      generamovimientosstock: parseBooleano(getAttr(item, 'GeneraMovimientosDeStock')),
      pesoembaladounidadmedidastock: parseFloat(getAttr(item, 'PesoEmbaladoPorUnidadDeMedidaDeStock') || '0'),
      cantidadunidadmedidastockbulto: parseFloat(getAttr(item, 'CantidadPorUnidadDeMedidaDeStockPorBulto') || '0'),
      unidadmedidahomogeneastock: getAttr(item, 'UnidadDeMedidaHomogeneaDeStock'),
      factordeconversionunidadmedidahomogeneastock: parseFloat(getAttr(item, 'FactorDeConversionUnidadDeMedidaHomogeneaDeStock') || '0'),
      cuentadeactivo: getAttr(item, 'CuentaDeActivo'),
      seproduce: parseBooleano(getAttr(item, 'SeProduce')),
      mododeconsumodecomponentes: getAttr(item, 'ModoDeConsumoDeComponentes'),
      modalidadestockminimo: getAttr(item, 'ModalidadDeStockMinimo'),
      stockminimoparamodalidadcantidadfija: parseFloat(getAttr(item, 'StockMinimoParaModalidadPorCantidadFija') || '0'),
      administrapreciopromedioponderado: parseBooleano(getAttr(item, 'AdministraPrecioPromedioPonderado')),
      ajustacantidadesumstockcalculadasporsistema: parseBooleano(getAttr(item, 'AjustaCantidadesEnUMDeStockCalculadasPorElSistema')),
      porcentajemaximoajustecantidadumstock: parseFloat(getAttr(item, 'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock') || '0'),
      secosteaporcierremensual: parseBooleano(getAttr(item, 'SeCosteaPorCierreMensual')),
      talle: getAttr(item, 'Talle'),
      color: getAttr(item, 'Color'),
      divisionparaasientodecosteoporcierre: getAttr(item, 'DivisionParaAsientoDeCosteoPorCierre'),
      especiedegranooncca: getAttr(item, 'EspecieDeGranoONCCA'),
      tipodegranooncca: getAttr(item, 'TipoDeGranoONCCA'),
      variedaddedegrano: getAttr(item, 'VariedadDeGrano'),
      cuentadeanticipoliquidacioncompracereal: getAttr(item, 'CuentaDeAnticipoLiquidacionCompraCereal'),
      codigodeproductocot: getAttr(item, 'CodigoDeProductoCOT'),
      unidadmedidacot: getAttr(item, 'UnidadDeMedidaCOT'),
      factordeconversioncot: parseFloat(getAttr(item, 'FactorDeConversionCOT') || '0'),
      volumenembaladounidadmedidastock: parseFloat(getAttr(item, 'VolumenEmbaladoPorUnidadDeMedidaDeStock') || '0'),
      unidadmedidaparadimensionesarticulo: getAttr(item, 'UnidadDeMedidaParaDimensionesDelArticulo'),
      largo: parseFloat(getAttr(item, 'Largo') || '0'),
      ancho: parseFloat(getAttr(item, 'Ancho') || '0'),
      alto: parseFloat(getAttr(item, 'Alto') || '0'),
      bloqueadoparaventa: parseBooleano(getAttr(item, 'BloqueadoParaVenta')),
      fechadebajaparaventas: parseFecha(getAttr(item, 'FechaDeBajaParaVentas')),
    })
  });
}

// ========== SINCRONIZACIÓN DE CLIENTES ==========
export async function syncClientes() {
  console.log('🔄 Iniciando sincronización de clientes...');
  await syncGenerico({
    nombre: 'clientes',
    url: SOAP_URL_CLIENTES,
    atributos: atributosClientes,
    soapAction: 'ObtenerClientes',
    nodoItem: 'Cliente',
    idAttr: 'ClienteID',
    tabla: 'clientes',
    idCol: 'clienteid',
    mapear: (item: any) => ({
      clienteid: parseInt(getAttr(item, 'ClienteID') || '0'),
      nombre: getAttr(item, 'Nombre'),
      nombrelegal: getAttr(item, 'NombreLegal'),
      domicilio: getAttr(item, 'Domicilio'),
      localidad: getAttr(item, 'Localidad'),
      codigopostal: getAttr(item, 'CodigoPostal'),
      provincia: getAttr(item, 'Provincia'),
      pais: getAttr(item, 'Pais'),
      telefono: getAttr(item, 'Telefono'),
      fax: getAttr(item, 'Fax'),
      email: getAttr(item, 'Email'),
      observacion: getAttr(item, 'Observacion'),
      condicionanteeliva: getAttr(item, 'CondicionAnteElIVA'),
      clavetributaria: getAttr(item, 'ClaveTributaria'),
      ingresosbrutos: getAttr(item, 'IngresosBrutos'),
      contactodeventa: getAttr(item, 'ContactoDeVenta'),
      contactodecobros: getAttr(item, 'ContactoDeCobros'),
      condicionpago: getAttr(item, 'CondicionPago'),
      monedausualcuentacorriente: getAttr(item, 'MonedaUsualCuentaCorriente'),
      cuentacliente: getAttr(item, 'CuentaCliente'),
      tipodecliente: getAttr(item, 'TipoDeCliente'),
      actividaddecliente: getAttr(item, 'ActividadDeCliente'),
      clasificacion1: getAttr(item, 'Clasificacion1'),
      clasificacion2: getAttr(item, 'Clasificacion2'),
      clasificacion3: getAttr(item, 'Clasificacion3'),
      clasificacion4: getAttr(item, 'Clasificacion4'),
      clasificacion5: getAttr(item, 'Clasificacion5'),
      clasificacion6: getAttr(item, 'Clasificacion6'),
      clasificacion7: getAttr(item, 'Clasificacion7'),
      clasificacion8: getAttr(item, 'Clasificacion8'),
      clasificacion9: getAttr(item, 'Clasificacion9'),
      vendedor: getAttr(item, 'Vendedor'),
      zonadeventa: getAttr(item, 'ZonaDeVenta'),
      cobrador: getAttr(item, 'Cobrador'),
      transporte: getAttr(item, 'Transporte'),
      bloqueadoparanotasdepedido: parseBooleano(getAttr(item, 'BloqueadoParaNotasDePedido')),
      bloqueadoparafacturar: parseBooleano(getAttr(item, 'BloqueadoParaFacturar')),
      fechadealta: parseFecha(getAttr(item, 'FechaDeAlta')),
      fechadebaja: parseFecha(getAttr(item, 'FechaDeBaja')),
      habilitadoparaconsultasweb: parseBooleano(getAttr(item, 'HabilitadoParaConsultasWeb')),
      formatodeimpresionporcliente: getAttr(item, 'FormatoDeImpresionPorCliente'),
      vendedor2: getAttr(item, 'Vendedor2'),
      fechaultactualizacion: parseFecha(getAttr(item, 'FechaUltActualizacion')),
    })
  });
}

// ========== FUNCIÓN GENÉRICA DE SINCRONIZACIÓN ==========
async function syncGenerico({
  nombre,
  url,
  atributos,
  soapAction,
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
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:art="http://plataforma.net.ar/">
  <soap:Body>
    <art:Obtener${soapAction}>
      <art:AtributosVisibles>
        ${atributosXML}
      </art:AtributosVisibles>
      <art:Filtros />
    </art:Obtener${soapAction}>
  </soap:Body>
</soap:Envelope>`;

    console.log(`📤 Enviando solicitud SOAP para ${nombre}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `http://plataforma.net.ar/Obtener${soapAction}`,
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

// ========== SINCIONIZAR TODO ==========
export async function syncAll() {
  await syncProductos();
  await syncClientes();
}
