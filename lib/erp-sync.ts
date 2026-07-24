import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// ============================================
// PRODUCTOS
// ============================================

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

// ============================================
// CLIENTES
// ============================================

const atributosClientes = [
  'ClienteID',
  'Nombre',
  'NombreLegal',
  'EsClienteGlobal',
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
  'CodigoDeProveedorParaElCliente',
  'Referencia',
  'HorarioDeAtencion',
  'HorarioDeEntrega',
  'CondicionAnteElIVA',
  'CondicionAnteElIVANombre',
  'ClaveTributaria',
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
  'Clasificacion1',
  'Clasificacion1Nombre',
  'Clasificacion2',
  'Clasificacion2Nombre',
  'Clasificacion3',
  'Clasificacion3Nombre',
  'Clasificacion4',
  'Clasificacion4Nombre',
  'Clasificacion5',
  'Clasificacion5Nombre',
  'Clasificacion6',
  'Clasificacion6Nombre',
  'Clasificacion7',
  'Clasificacion7Nombre',
  'Clasificacion8',
  'Clasificacion8Nombre',
  'Clasificacion9',
  'Clasificacion9Nombre',
  'Vendedor',
  'VendedorNombre',
  'ZonaDeVenta',
  'ZonaDeVentaNombre',
  'Cobrador',
  'CobradorNombre',
  'Transporte',
  'TransporteNombre',
  'BloqueadoParaNotasDePedido',
  'BloqueadoParaFacturar',
  'FechaDeAlta',
  'FechaDeBaja',
  'HabilitadoParaConsultasWeb',
  'FormatoDeImpresionPorCliente',
  'FormatoDeImpresionPorClienteNombre',
  'Vendedor2',
  'Vendedor2Nombre',
  'AtributoString1',
  'AtributoString2',
  'AtributoString3',
  'AtributoString4',
  'AtributoFecha1',
  'AtributoFecha2',
  'AtributoFecha3',
  'AtributoFecha4',
  'Clasificacion1PedidosYComprobantesVarios',
  'Clasificacion1PedidosYComprobantesVariosNombre',
  'Clasificacion2PedidosYComprobantesVarios',
  'Clasificacion2PedidosYComprobantesVariosNombre',
  'Clasificacion3PedidosYComprobantesVarios',
  'Clasificacion3PedidosYComprobantesVariosNombre',
  'Clasificacion4PedidosYComprobantesVarios',
  'Clasificacion4PedidosYComprobantesVariosNombre',
  'Clasificacion5PedidosYComprobantesVarios',
  'Clasificacion5PedidosYComprobantesVariosNombre',
  'Clasificacion6PedidosYComprobantesVarios',
  'Clasificacion6PedidosYComprobantesVariosNombre',
  'HabilitadoParaConciliacionConEmpresaCliente',
  'CodigoDeClienteExterno',
  'FechaDeProximaGestionDeCobranza',
  'ProximaGestionDeCobranza',
  'FormaDeGenerarComprobantesEnElSistemaDeContratos',
  'NodoOrigen',
  'NodoOrigenNombre',
  'Municipio',
  'MunicipioNombre',
  'SeConsideraParaTasaDeAbasto',
  'ControlaElCobroCorrelativoPorVencimiento',
  'VehiculoPorDefecto',
  'VehiculoPorDefectoNombre',
  'Distribuidor',
  'DistribuidorNombre',
  'ZonaDeDistribucion',
  'ZonaDeDistribucionNombre',
  'Calle',
  'NumeroCalle',
  'Piso',
  'Departamento',
  'Barrio',
  'DiasDeGraciaParaElCalculoDeDiasDeAtrasoDeRecibos',
  'SitioWeb',
  'DescripcionDeLaActividad',
  'FacturacionAnualEnMonedaLocal',
  'CantidadDeEmpleados',
  'EnvioComprobantesPorMailDireccionDeMail',
  'EnvioComprobantesPorMailAsuntoDelMail',
  'EnvioComprobantesPorMailCuerpoDelMail',
  'ObservacionDeProximaGestionDeCobranza',
  'CodigoDeCalle',
  'CodigoDeCalleNombre',
  'EnvioRecibosDeClientesPorMailDireccionDeMail',
  'EnvioRecibosDeClientesPorMailAsuntosDelMail',
  'EnvioRecibosDeClientesPorMailCuerpoDelMail',
  'TasaMensualParaCalculoDeInteres',
  'EmailBackup',
  'PersonaFisica',
  'PersFisFechaDeNacimiento',
  'PersFisPaisDeNacimiento',
  'PersFisPaisDeNacimientoNombre',
  'PersFisNacionalidad',
  'PersFisNacionalidadNombre',
  'PersFisSexo',
  'PersFisProfesion',
  'PersFisProfesionNombre',
  'PersFisTarjetaDeCredito',
  'PersFisTarjetaDeCreditoNombre',
  'PersFisFechaDeVencimientoDeTarjetaDeCredito',
  'PersFisTipoDeDocumento',
  'PersFisTipoDeDocumentoNombre',
  'PersFisNumeroDeDocumento',
  'PersFisNumeroDeTarjetaDeCredito',
  'Grupos',
  'FechaUltActualizacion',
  'UltimoAuditorCliente',
  'DatosDeVentas',
  'BloqueadoReservas',
  'BloqueadoContratos',
  'CalculaIngresosBrutos'
];

const SOAP_URL_PRODUCTOS = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';
const SOAP_URL_CLIENTES = 'http://wspirkastone.pypcloud.net:1881/ServicioCCOCliente.asmx';

// ============================================
// FUNCIONES AUXILIARES
// ============================================

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

function getTextFromNode(node: any, tagName: string): string | null {
  if (!node) return null;
  const child = node[tagName];
  if (Array.isArray(child) && child.length > 0) {
    return child[0] || null;
  }
  return child || null;
}

function findAllItems(obj: any, itemName: string): any[] {
  const results: any[] = [];
  if (!obj) return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findAllItems(item, itemName));
    }
    return results;
  }

  if (typeof obj === 'object') {
    if (obj.$ && obj.$[`${itemName}ID`] !== undefined) {
      results.push(obj);
    }
    if (obj[itemName]) {
      const items = Array.isArray(obj[itemName]) ? obj[itemName] : [obj[itemName]];
      for (const it of items) {
        if (it.$ && it.$[`${itemName}ID`] !== undefined) {
          results.push(it);
        } else {
          results.push(...findAllItems(it, itemName));
        }
      }
    }
    for (const key of Object.keys(obj)) {
      if (key !== itemName && obj[key] && typeof obj[key] === 'object') {
        results.push(...findAllItems(obj[key], itemName));
      }
    }
  }
  return results;
}

// ============================================
// FUNCIÓN DE SINCRONIZACIÓN DE PRODUCTOS
// ============================================

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
      throw new Error(`Error HTTP: ${response.status}`);
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

    const items = findAllItems(result, 'Articulo');
    console.log(`📦 Productos obtenidos: ${items.length}`);

    let procesados = 0;
    let errores = 0;

    for (const item of items) {
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
          pesoembaladounidadmedidastock: parseNumero(getAttr(item, 'PesoEmbaladoPorUnidadDeMedidaDeStock')),
          cantidadunidadmedidastockbulto: parseNumero(getAttr(item, 'CantidadPorUnidadDeMedidaDeStockPorBulto')),
          unidadmedidahomogeneastock: getAttr(item, 'UnidadDeMedidaHomogeneaDeStock'),
          factordeconversionunidadmedidahomogeneastock: parseNumero(getAttr(item, 'FactorDeConversionUnidadDeMedidaHomogeneaDeStock')),
          cuentadeactivo: getAttr(item, 'CuentaDeActivo'),
          seproduce: parseBooleano(getAttr(item, 'SeProduce')),
          mododeconsumodecomponentes: getAttr(item, 'ModoDeConsumoDeComponentes'),
          modalidadestockminimo: getAttr(item, 'ModalidadDeStockMinimo'),
          stockminimoparamodalidadcantidadfija: parseNumero(getAttr(item, 'StockMinimoParaModalidadPorCantidadFija')),
          administrapreciopromedioponderado: parseBooleano(getAttr(item, 'AdministraPrecioPromedioPonderado')),
          ajustacantidadesumstockcalculadasporsistema: parseBooleano(getAttr(item, 'AjustaCantidadesEnUMDeStockCalculadasPorElSistema')),
          porcentajemaximoajustecantidadumstock: parseNumero(getAttr(item, 'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock')),
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
          factordeconversioncot: parseNumero(getAttr(item, 'FactorDeConversionCOT')),
          volumenembaladounidadmedidastock: parseNumero(getAttr(item, 'VolumenEmbaladoPorUnidadDeMedidaDeStock')),
          unidadmedidaparadimensionesarticulo: getAttr(item, 'UnidadDeMedidaParaDimensionesDelArticulo'),
          largo: parseNumero(getAttr(item, 'Largo')),
          ancho: parseNumero(getAttr(item, 'Ancho')),
          alto: parseNumero(getAttr(item, 'Alto')),
          bloqueadoparaventa: parseBooleano(getAttr(item, 'BloqueadoParaVenta')),
          fechadebajaparaventas: parseFecha(getAttr(item, 'FechaDeBajaParaVentas')),
        };

        const columns = Object.keys(articulo);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

        const query = `
          INSERT INTO productos (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (articuloid) DO UPDATE SET
            ${updateSet},
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        await sql.query(query, Object.values(articulo));
        procesados++;

      } catch (error) {
        errores++;
        console.error(`❌ Error en producto ${getAttr(item, 'ArticuloID') || 'desconocido'}:`, error);
      }
    }

    console.log(`📊 Productos: ${procesados} procesados, ${errores} errores`);

  } catch (error) {
    console.error('❌ Error en syncProductos:', error);
    throw error;
  }
}

// ============================================
// FUNCIÓN DE SINCRONIZACIÓN DE CLIENTES
// ============================================

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
      <cli:Filtros />
    </cli:ObtenerClientes>
  </soap:Body>
</soap:Envelope>`;

    console.log('📤 XML de clientes enviado');

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
      throw new Error(`Error HTTP: ${response.status}`);
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

    const items = findAllItems(result, 'Cliente');
    console.log(`📦 Clientes obtenidos: ${items.length}`);

    if (items.length === 0) {
      console.error('❌ No se encontraron clientes en la respuesta');
      console.log('📄 Primeros 500 caracteres de la respuesta:', xmlText.substring(0, 500));
      return;
    }

    let procesados = 0;
    let errores = 0;

    for (const item of items) {
      try {
        const cliente = {
          clienteid: parseInt(getAttr(item, 'ClienteID') || '0'),
          nombre: getAttr(item, 'Nombre'),
          nombrelegal: getAttr(item, 'NombreLegal'),
          esclienteglobal: parseBooleano(getAttr(item, 'EsClienteGlobal')),
          domicilio: getAttr(item, 'Domicilio'),
          localidad: getAttr(item, 'Localidad'),
          codigopostal: getAttr(item, 'CodigoPostal'),
          provincia: getAttr(item, 'Provincia'),
          provincianombre: getAttr(item, 'ProvinciaNombre'),
          pais: getAttr(item, 'Pais'),
          paisnombre: getAttr(item, 'PaisNombre'),
          telefono: getAttr(item, 'Telefono'),
          fax: getAttr(item, 'Fax'),
          email: getAttr(item, 'Email'),
          observacion: getAttr(item, 'Observacion'),
          codigodeproveedorparaelcliente: getAttr(item, 'CodigoDeProveedorParaElCliente'),
          referencia: getAttr(item, 'Referencia'),
          horariodeatencion: getAttr(item, 'HorarioDeAtencion'),
          horariodeentrega: getAttr(item, 'HorarioDeEntrega'),
          condicionanteeliva: getAttr(item, 'CondicionAnteElIVA'),
          condicionanteelivanombre: getAttr(item, 'CondicionAnteElIVANombre'),
          clavetributaria: getAttr(item, 'ClaveTributaria'),
          ingresosbrutos: getAttr(item, 'IngresosBrutos'),
          contactodeventa: getAttr(item, 'ContactoDeVenta'),
          contactodecobros: getAttr(item, 'ContactoDeCobros'),
          condicionpago: getAttr(item, 'CondicionPago'),
          condicionpagonombre: getAttr(item, 'CondicionPagoNombre'),
          monedausualcuentacorriente: getAttr(item, 'MonedaUsualCuentaCorriente'),
          monedausualcuentacorrientenombre: getAttr(item, 'MonedaUsualCuentaCorrienteNombre'),
          cuentacliente: getAttr(item, 'CuentaCliente'),
          tipodecliente: getAttr(item, 'TipoDeCliente'),
          tipodeclientenombre: getAttr(item, 'TipoDeClienteNombre'),
          actividaddcliente: getAttr(item, 'ActividadDeCliente'),
          actividaddclientenombre: getAttr(item, 'ActividadDeClienteNombre'),
          clasificacion1: getAttr(item, 'Clasificacion1'),
          clasificacion1nombre: getAttr(item, 'Clasificacion1Nombre'),
          clasificacion2: getAttr(item, 'Clasificacion2'),
          clasificacion2nombre: getAttr(item, 'Clasificacion2Nombre'),
          clasificacion3: getAttr(item, 'Clasificacion3'),
          clasificacion3nombre: getAttr(item, 'Clasificacion3Nombre'),
          clasificacion4: getAttr(item, 'Clasificacion4'),
          clasificacion4nombre: getAttr(item, 'Clasificacion4Nombre'),
          clasificacion5: getAttr(item, 'Clasificacion5'),
          clasificacion5nombre: getAttr(item, 'Clasificacion5Nombre'),
          clasificacion6: getAttr(item, 'Clasificacion6'),
          clasificacion6nombre: getAttr(item, 'Clasificacion6Nombre'),
          clasificacion7: getAttr(item, 'Clasificacion7'),
          clasificacion7nombre: getAttr(item, 'Clasificacion7Nombre'),
          clasificacion8: getAttr(item, 'Clasificacion8'),
          clasificacion8nombre: getAttr(item, 'Clasificacion8Nombre'),
          clasificacion9: getAttr(item, 'Clasificacion9'),
          clasificacion9nombre: getAttr(item, 'Clasificacion9Nombre'),
          vendedor: getAttr(item, 'Vendedor'),
          vendedornombre: getAttr(item, 'VendedorNombre'),
          zonadeventa: getAttr(item, 'ZonaDeVenta'),
          zonadeventanombre: getAttr(item, 'ZonaDeVentaNombre'),
          cobrador: getAttr(item, 'Cobrador'),
          cobradornombre: getAttr(item, 'CobradorNombre'),
          transporte: getAttr(item, 'Transporte'),
          transportenombre: getAttr(item, 'TransporteNombre'),
          bloqueadoparanotasdepedido: parseBooleano(getAttr(item, 'BloqueadoParaNotasDePedido')),
          bloqueadoparafacturar: parseBooleano(getAttr(item, 'BloqueadoParaFacturar')),
          fechadealta: parseFecha(getAttr(item, 'FechaDeAlta')),
          fechadebaja: parseFecha(getAttr(item, 'FechaDeBaja')),
          habilitadoparaconsultasweb: parseBooleano(getAttr(item, 'HabilitadoParaConsultasWeb')),
          formatodeimpresionporcliente: getAttr(item, 'FormatoDeImpresionPorCliente'),
          formatodeimpresionporclientenombre: getAttr(item, 'FormatoDeImpresionPorClienteNombre'),
          vendedor2: getAttr(item, 'Vendedor2'),
          vendedor2nombre: getAttr(item, 'Vendedor2Nombre'),
          atributostring1: getAttr(item, 'AtributoString1'),
          atributostring2: getAttr(item, 'AtributoString2'),
          atributostring3: getAttr(item, 'AtributoString3'),
          atributostring4: getAttr(item, 'AtributoString4'),
          atributofecha1: parseFecha(getAttr(item, 'AtributoFecha1')),
          atributofecha2: parseFecha(getAttr(item, 'AtributoFecha2')),
          atributofecha3: parseFecha(getAttr(item, 'AtributoFecha3')),
          atributofecha4: parseFecha(getAttr(item, 'AtributoFecha4')),
          clasificacion1pedidosycomprobantesvarios: getAttr(item, 'Clasificacion1PedidosYComprobantesVarios'),
          clasificacion1pedidosycomprobantesvariosnombre: getAttr(item, 'Clasificacion1PedidosYComprobantesVariosNombre'),
          clasificacion2pedidosycomprobantesvarios: getAttr(item, 'Clasificacion2PedidosYComprobantesVarios'),
          clasificacion2pedidosycomprobantesvariosnombre: getAttr(item, 'Clasificacion2PedidosYComprobantesVariosNombre'),
          clasificacion3pedidosycomprobantesvarios: getAttr(item, 'Clasificacion3PedidosYComprobantesVarios'),
          clasificacion3pedidosycomprobantesvariosnombre: getAttr(item, 'Clasificacion3PedidosYComprobantesVariosNombre'),
          clasificacion4pedidosycomprobantesvarios: getAttr(item, 'Clasificacion4PedidosYComprobantesVarios'),
          clasificacion4pedidosycomprobantesvariosnombre: getAttr(item, 'Clasificacion4PedidosYComprobantesVariosNombre'),
          clasificacion5pedidosycomprobantesvarios: getAttr(item, 'Clasificacion5PedidosYComprobantesVarios'),
          clasificacion5pedidosycomprobantesvariosnombre: getAttr(item, 'Clasificacion5PedidosYComprobantesVariosNombre'),
          clasificacion6pedidosycomprobantesvarios: getAttr(item, 'Clasificacion6PedidosYComprobantesVarios'),
          clasificacion6pedidosycomprobantesvariosnombre: getAttr(item, 'Clasificacion6PedidosYComprobantesVariosNombre'),
          habilitadoparaconciliacionconempresacliente: parseBooleano(getAttr(item, 'HabilitadoParaConciliacionConEmpresaCliente')),
          codigodeclienteexterno: getAttr(item, 'CodigoDeClienteExterno'),
          fechadeproximagestiondecobranza: parseFecha(getAttr(item, 'FechaDeProximaGestionDeCobranza')),
          proximagestiondecobranza: getAttr(item, 'ProximaGestionDeCobranza'),
          formadegenerarcomprobantesenelsistemadecontratos: getAttr(item, 'FormaDeGenerarComprobantesEnElSistemaDeContratos'),
          nodoorigen: getAttr(item, 'NodoOrigen'),
          nodoorigennombre: getAttr(item, 'NodoOrigenNombre'),
          municipio: getAttr(item, 'Municipio'),
          municipionombre: getAttr(item, 'MunicipioNombre'),
          seconsideraparatasadeabasto: parseBooleano(getAttr(item, 'SeConsideraParaTasaDeAbasto')),
          controlaelcobrocorrelativoporvencimiento: parseBooleano(getAttr(item, 'ControlaElCobroCorrelativoPorVencimiento')),
          vehiculopordefecto: getAttr(item, 'VehiculoPorDefecto'),
          vehiculopordefectonombre: getAttr(item, 'VehiculoPorDefectoNombre'),
          distribuidor: getAttr(item, 'Distribuidor'),
          distribuidornombre: getAttr(item, 'DistribuidorNombre'),
          zonadedistribucion: getAttr(item, 'ZonaDeDistribucion'),
          zonadedistribucionnombre: getAttr(item, 'ZonaDeDistribucionNombre'),
          calle: getAttr(item, 'Calle'),
          numerocalle: parseNumero(getAttr(item, 'NumeroCalle')),
          piso: getAttr(item, 'Piso'),
          departamento: getAttr(item, 'Departamento'),
          barrio: getAttr(item, 'Barrio'),
          diasdegraciasparaelcalculodediasdeatrasoderecibos: parseNumero(getAttr(item, 'DiasDeGraciaParaElCalculoDeDiasDeAtrasoDeRecibos')),
          sitioweb: getAttr(item, 'SitioWeb'),
          descripciondelaactividad: getAttr(item, 'DescripcionDeLaActividad'),
          facturacionanualenmonedalocal: parseNumero(getAttr(item, 'FacturacionAnualEnMonedaLocal')),
          cantidaddeempleados: parseNumero(getAttr(item, 'CantidadDeEmpleados')),
          enviocomprobantespormaildirecciondemail: getAttr(item, 'EnvioComprobantesPorMailDireccionDeMail'),
          enviocomprobantespormailasuntodelmail: getAttr(item, 'EnvioComprobantesPorMailAsuntoDelMail'),
          enviocomprobantespormailcuerpodelmail: getAttr(item, 'EnvioComprobantesPorMailCuerpoDelMail'),
          observaciondeproximagestiondecobranza: getAttr(item, 'ObservacionDeProximaGestionDeCobranza'),
          codigodecalle: getAttr(item, 'CodigoDeCalle'),
          codigodecallenombre: getAttr(item, 'CodigoDeCalleNombre'),
          enviorecibosdeclientespormaildirecciondemail: getAttr(item, 'EnvioRecibosDeClientesPorMailDireccionDeMail'),
          enviorecibosdeclientespormailasuntosdelmail: getAttr(item, 'EnvioRecibosDeClientesPorMailAsuntosDelMail'),
          enviorecibosdeclientespormailcuerpodelmail: getAttr(item, 'EnvioRecibosDeClientesPorMailCuerpoDelMail'),
          tasamensualparacalculodeinteres: parseNumero(getAttr(item, 'TasaMensualParaCalculoDeInteres')),
          emailbackup: getAttr(item, 'EmailBackup'),
          personafisica: parseBooleano(getAttr(item, 'PersonaFisica')),
          persfisfechadenacimiento: parseFecha(getAttr(item, 'PersFisFechaDeNacimiento')),
          persfispaisdenacimiento: getAttr(item, 'PersFisPaisDeNacimiento'),
          persfispaisdenacimientonombre: getAttr(item, 'PersFisPaisDeNacimientoNombre'),
          persfisnacionalidad: getAttr(item, 'PersFisNacionalidad'),
          persfisnacionalidadnombre: getAttr(item, 'PersFisNacionalidadNombre'),
          persfissexo: getAttr(item, 'PersFisSexo'),
          persfisprofesion: getAttr(item, 'PersFisProfesion'),
          persfisprofesionnombre: getAttr(item, 'PersFisProfesionNombre'),
          persfistarjetadecredito: getAttr(item, 'PersFisTarjetaDeCredito'),
          persfistarjetadecreditonombre: getAttr(item, 'PersFisTarjetaDeCreditoNombre'),
          persfisfechadevencimientodetarjetadecredito: parseFecha(getAttr(item, 'PersFisFechaDeVencimientoDeTarjetaDeCredito')),
          persfistipodedocumento: getAttr(item, 'PersFisTipoDeDocumento'),
          persfistipodedocumentonombre: getAttr(item, 'PersFisTipoDeDocumentoNombre'),
          persfisnumerodedocumento: getAttr(item, 'PersFisNumeroDeDocumento'),
          persfisnumerodetarjetadecredito: getAttr(item, 'PersFisNumeroDeTarjetaDeCredito'),
          grupos: getAttr(item, 'Grupos'),
          fechaultactualizacion: parseFecha(getAttr(item, 'FechaUltActualizacion')),
          ultimoauditorcliente: getAttr(item, 'UltimoAuditorCliente'),
          datosdeventas: getAttr(item, 'DatosDeVentas'),
          bloqueadoreservas: parseBooleano(getAttr(item, 'BloqueadoReservas')),
          bloqueadocontratos: parseBooleano(getAttr(item, 'BloqueadoContratos')),
          calculaingresosbrutos: parseBooleano(getAttr(item, 'CalculaIngresosBrutos')),
        };

        const columns = Object.keys(cliente);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

        const query = `
          INSERT INTO clientes (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (clienteid) DO UPDATE SET
            ${updateSet},
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        await sql.query(query, Object.values(cliente));
        procesados++;

      } catch (error) {
        errores++;
        console.error(`❌ Error en cliente ${getAttr(item, 'ClienteID') || 'desconocido'}:`, error);
      }
    }

    console.log(`📊 Clientes: ${procesados} procesados, ${errores} errores`);

  } catch (error) {
    console.error('❌ Error en syncClientes:', error);
    throw error;
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export async function syncAll() {
  console.log('🔄 Iniciando sincronización completa...');
  
  await syncProductos();
  await syncClientes();
  
  console.log('✅ Sincronización completa finalizada');
}
