import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// ============================================================
// 1. ATRIBUTOS DE PRODUCTOS
// ============================================================
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

// ============================================================
// 2. ATRIBUTOS DE CLIENTES (extraídos del WSDL)
// ============================================================
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
  'FechaUltActualizacion'
];

// ============================================================
// 3. FUNCIONES AUXILIARES
// ============================================================
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
    // Si el objeto tiene un atributo que identifica al nodo
    if (obj.$ && obj.$[`${nodeName}ID`] !== undefined) {
      results.push(obj);
    }
    // Si el objeto tiene una clave con el nombre del nodo
    if (obj[nodeName]) {
      const items = Array.isArray(obj[nodeName]) ? obj[nodeName] : [obj[nodeName]];
      for (const item of items) {
        if (item.$ && item.$[`${nodeName}ID`] !== undefined) {
          results.push(item);
        } else {
          results.push(...findAllNodes(item, nodeName));
        }
      }
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

// ============================================================
// 4. SYNC PRODUCTOS (idéntico al que funciona)
// ============================================================
export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de productos...');
  await syncGenerico('productos', 'Articulo', atributosProductos, SOAP_URL_PRODUCTOS, 'ObtenerArticulos');
}

// ============================================================
// 5. SYNC CLIENTES (idéntico a syncProductos pero con clientes)
// ============================================================
export async function syncClientes() {
  console.log('🔄 Iniciando sincronización de clientes...');
  await syncGenerico('clientes', 'Cliente', atributosClientes, SOAP_URL_CLIENTES, 'ObtenerClientes');
}

// ============================================================
// 6. FUNCIÓN GENÉRICA DE SINCRONIZACIÓN
// ============================================================
async function syncGenerico(
  tabla: string,
  nodoRaiz: string,
  atributos: string[],
  soapUrl: string,
  soapAction: string
) {
  try {
    const atributosXML = atributos.map(attr => 
      `<${nodoRaiz}Atributos>${attr}</${nodoRaiz}Atributos>`
    ).join('');

    // Determinar el namespace correcto según el servicio
    let namespace = 'art';
    let actionUrl = 'http://plataforma.net.ar/';
    let filtrosXML = '';
    
    if (tabla === 'productos') {
      namespace = 'art';
      actionUrl = 'http://plataforma.net.ar/';
      filtrosXML = `<art:Filtros />`;
    } else if (tabla === 'clientes') {
      namespace = 'cli';
      actionUrl = 'http://wsplataforma.intecsoft.com.ar/';
      filtrosXML = `<cli:Filtros />`;
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:${namespace}="${actionUrl}">
  <soap:Body>
    <${namespace}:${soapAction}>
      <${namespace}:AtributosVisibles>
        ${atributosXML}
      </${namespace}:AtributosVisibles>
      ${filtrosXML}
    </${namespace}:${soapAction}>
  </soap:Body>
</soap:Envelope>`;

    console.log(`📤 XML enviado para ${tabla}:`, soapEnvelope);

    const response = await fetch(soapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `${actionUrl}${soapAction}`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Cuerpo de la respuesta de error para ${tabla}:`, errorText);
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`✅ Respuesta recibida del ERP para ${tabla}`);

    const result = await parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: false,
      ignoreAttrs: false,
      attrkey: '$',
      charkey: '_',
      trim: true,
    });

    // Buscar todos los nodos de la raíz (Articulo o Cliente)
    const items = findAllNodes(result, nodoRaiz);
    
    if (items.length === 0) {
      console.error(`❌ Estructura completa del resultado para ${tabla}:`, JSON.stringify(result, null, 2));
      throw new Error(`No se encontraron ${nodoRaiz}s en la respuesta`);
    }

    console.log(`📦 ${nodoRaiz}s obtenidos del ERP: ${items.length}`);

    let procesados = 0;
    let errores = 0;

    for (const item of items) {
      try {
        const registro: any = {};
        
        // Extraer todos los atributos del nodo
        for (const attr of atributos) {
          const key = attr.toLowerCase();
          const value = getAttr(item, attr);
          
          // Convertir según el tipo de dato
          if (key.includes('fecha') || key.includes('date')) {
            registro[key] = parseFecha(value);
          } else if (key.includes('bloqueado') || key.includes('habilitado') || key.includes('controla') || 
                     key.includes('administra') || key.includes('se') || key.includes('es')) {
            registro[key] = parseBooleano(value);
          } else if (key.includes('numero') || key.includes('cantidad') || key.includes('factor') || 
                     key.includes('monto') || key.includes('porcentaje') || key.includes('tasa')) {
            registro[key] = value ? parseFloat(value) : null;
          } else {
            registro[key] = value || null;
          }
        }

        // Agregar campo obligatorio según la tabla
        if (tabla === 'productos') {
          registro.articuloid = parseInt(registro.articuloid || '0');
        } else if (tabla === 'clientes') {
          registro.clienteid = parseInt(registro.clienteid || '0');
        }

        const columns = Object.keys(registro);
        const values = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

        const query = `
          INSERT INTO ${tabla} (${columns.join(', ')})
          VALUES (${values})
          ON CONFLICT (${tabla === 'productos' ? 'articuloid' : 'clienteid'}) DO UPDATE SET
            ${updateSet},
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        await sql.query(query, Object.values(registro));

        procesados++;
        if (procesados % 100 === 0) {
          console.log(`📊 Procesados ${procesados} ${nodoRaiz}s...`);
        }

      } catch (error) {
        errores++;
        console.error(`❌ Error procesando ${nodoRaiz}:`, error);
      }
    }

    console.log(`📊 Resumen para ${tabla}:`);
    console.log(`   Procesados: ${procesados}`);
    console.log(`   Errores: ${errores}`);
    console.log(`✅ Sincronización de ${tabla} completada`);

  } catch (error) {
    console.error(`❌ Error en sync de ${tabla}:`, error);
    throw error;
  }
}

// ============================================================
// 7. FUNCIÓN PRINCIPAL
// ============================================================
export async function syncAll() {
  await syncProductos();
  await syncClientes();
}
