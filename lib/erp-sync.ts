import { sql } from './db';

// Lista completa de atributos de artículo extraída del WSDL de ServicioSTOCArticulo
const atributosCompletos = [
  'ArticuloID',
  'Nombre',
  'ArticuloEmpresa',
  'ArticuloParaImpresion',
  'TipoDeArticulo',
  'Descripcion',
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
  'UnidadDeMedidaDeStock',
  'CodigoDeBarraPorUnidadDeMedidaDeStock',
  'SeControlaStock',
  'SeAdministraConPartidas',
  'SeAdministraConNumerosDeSerie',
  'SeAdministraPorTalles',
  'SeVende',
  'SeCompra',
  'FechaDeAlta',
  'FechaDeBaja',
  'BloqueadoParaMovimientosDeStock',
  'PesoEmbaladoPorUnidadDeMedidaDeStock',
  'CantidadPorUnidadDeMedidaDeStockPorBulto',
  'UnidadDeMedidaHomogeneaDeStock',
  'FactorDeConversionUnidadDeMedidaHomogeneaDeStock',
  'CuentaDeActivo',
  'SeProduce',
  'ModoDeConsumoDeComponentes',
  'ModalidadDeStockMinimo',
  'StockMinimoParaModalidadPorCantidadFija',
  'GeneraMovimientosDeStock',
  'ClasificadorVariablePorUnidadDeMedidaDeArticulo',
  'PorcentajeDeDesvioMaximoParaAjusteManualDeConsAutoDeOF',
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
  'FechaDeBajaParaVentas',
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
  'UnidadDeMedidaDeStockNombre',
  'UnidadDeMedidaHomogeneaDeStockNombre',
  'ClasificadorVariablePorUnidadDeMedidaDeArticuloNombre',
  'TalleNombre',
  'ColorNombre',
  'CuentaDeAnticipoLiquidacionCompraCerealNombre',
  'CodigoDeProductoCOTNombre',
  'UnidadDeMedidaParaDimensionesDelArticuloNombre',
  'FechaUltActualizacion',
  'FactorDeConversionUMHomVen'
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

// Función principal de sincronización de artículos
export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    // 1. Construir el SOAP envelope con TODOS los atributos
    const atributosXML = atributosCompletos.map(attr => 
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

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log('✅ Respuesta recibida del ERP');

    // 3. Parsear el XML de respuesta (usamos DOMParser o una librería)
    // NOTA: En Node.js no tenemos DOMParser nativo, necesitamos usar xml2js o fast-xml-parser
    // Instalá: npm install xml2js
    // Importá: import { parseStringPromise } from 'xml2js';
    // Si no querés instalar otra dependencia, podés usar el parser que ya tenías en tu proyecto.
    // Yo voy a asumir que usás xml2js.
    const { parseStringPromise } = await import('xml2js');
    
    const result = await parseStringPromise(xmlText, {
      explicitArray: true,
      mergeAttrs: false,
      ignoreAttrs: true,
    });

    // 4. Navegar hasta los artículos
    // La estructura típica: Envelope > Body > ObtenerArticulosResponse > ObtenerArticulosResult > NewDataSet > Table
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

    // 5. Procesar cada artículo y mapearlo a la tabla
    let insertados = 0;
    let actualizados = 0;
    let errores = 0;

    for (const item of articulos) {
      try {
        // Extraer valores con las funciones auxiliares
        const articulo = {
          articuloid: parseInt(getTextFromNode(item, 'ArticuloID') || '0'),
          nombre: getTextFromNode(item, 'Nombre'),
          articuloempresa: getTextFromNode(item, 'ArticuloEmpresa'),
          articuloparaimpresion: getTextFromNode(item, 'ArticuloParaImpresion'),
          tipodeariculo: getTextFromNode(item, 'TipoDeArticulo'),
          descripcion: getTextFromNode(item, 'Descripcion'),
          clasificacion1articulos: getTextFromNode(item, 'Clasificacion1Articulos'),
          clasificacion2articulos: getTextFromNode(item, 'Clasificacion2Articulos'),
          clasificacion3articulos: getTextFromNode(item, 'Clasificacion3Articulos'),
          clasificacion4articulos: getTextFromNode(item, 'Clasificacion4Articulos'),
          clasificacion5articulos: getTextFromNode(item, 'Clasificacion5Articulos'),
          clasificacion6articulos: getTextFromNode(item, 'Clasificacion6Articulos'),
          clasificacion7articulos: getTextFromNode(item, 'Clasificacion7Articulos'),
          clasificacion8articulos: getTextFromNode(item, 'Clasificacion8Articulos'),
          clasificacion9articulos: getTextFromNode(item, 'Clasificacion9Articulos'),
          clasificacion10articulos: getTextFromNode(item, 'Clasificacion10Articulos'),
          clasificacion11articulos: getTextFromNode(item, 'Clasificacion11Articulos'),
          clasificacion12articulos: getTextFromNode(item, 'Clasificacion12Articulos'),
          clasificacion13articulos: getTextFromNode(item, 'Clasificacion13Articulos'),
          clasificacion14articulos: getTextFromNode(item, 'Clasificacion14Articulos'),
          clasificacion15articulos: getTextFromNode(item, 'Clasificacion15Articulos'),
          clasificacion16articulos: getTextFromNode(item, 'Clasificacion16Articulos'),
          unidadmedidastock: getTextFromNode(item, 'UnidadDeMedidaDeStock'),
          codigodebarraunidadmedidastock: getTextFromNode(item, 'CodigoDeBarraPorUnidadDeMedidaDeStock'),
          secontrolastock: parseBooleano(getTextFromNode(item, 'SeControlaStock')),
          seadministraconpartidas: parseBooleano(getTextFromNode(item, 'SeAdministraConPartidas')),
          seadministraconnumerosdeserie: parseBooleano(getTextFromNode(item, 'SeAdministraConNumerosDeSerie')),
          seadministraportalles: parseBooleano(getTextFromNode(item, 'SeAdministraPorTalles')),
          sevende: parseBooleano(getTextFromNode(item, 'SeVende')),
          secompra: parseBooleano(getTextFromNode(item, 'SeCompra')),
          fechadealta: parseFecha(getTextFromNode(item, 'FechaDeAlta')),
          fechadebaja: parseFecha(getTextFromNode(item, 'FechaDeBaja')),
          bloqueadoparamovimientosstock: parseBooleano(getTextFromNode(item, 'BloqueadoParaMovimientosDeStock')),
          pesoembaladounidadmedidastock: parseNumero(getTextFromNode(item, 'PesoEmbaladoPorUnidadDeMedidaDeStock')),
          cantidadunidadmedidastockbulto: parseNumero(getTextFromNode(item, 'CantidadPorUnidadDeMedidaDeStockPorBulto')),
          unidadmedidahomogeneastock: getTextFromNode(item, 'UnidadDeMedidaHomogeneaDeStock'),
          factordeconversionunidadmedidahomogeneastock: parseNumero(getTextFromNode(item, 'FactorDeConversionUnidadDeMedidaHomogeneaDeStock')),
          cuentadeactivo: getTextFromNode(item, 'CuentaDeActivo'),
          seproduce: parseBooleano(getTextFromNode(item, 'SeProduce')),
          mododeconsumodecomponentes: getTextFromNode(item, 'ModoDeConsumoDeComponentes'),
          modalidadestockminimo: getTextFromNode(item, 'ModalidadDeStockMinimo'),
          stockminimoparamodalidadcantidadfija: parseNumero(getTextFromNode(item, 'StockMinimoParaModalidadPorCantidadFija')),
          generamovimientosstock: parseBooleano(getTextFromNode(item, 'GeneraMovimientosDeStock')),
          clasificadorvariableunidadmedidaarticulo: getTextFromNode(item, 'ClasificadorVariablePorUnidadDeMedidaDeArticulo'),
          porcentajedesviomaximoparaajustemanualdeconsumoautomatico: parseNumero(getTextFromNode(item, 'PorcentajeDeDesvioMaximoParaAjusteManualDeConsAutoDeOF')),
          administrapreciopromedioponderado: parseBooleano(getTextFromNode(item, 'AdministraPrecioPromedioPonderado')),
          ajustacantidadesumstockcalculadasporsistema: parseBooleano(getTextFromNode(item, 'AjustaCantidadesEnUMDeStockCalculadasPorElSistema')),
          porcentajemaximoajustecantidadumstock: parseNumero(getTextFromNode(item, 'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock')),
          secosteaporcierremensual: parseBooleano(getTextFromNode(item, 'SeCosteaPorCierreMensual')),
          talle: getTextFromNode(item, 'Talle'),
          color: getTextFromNode(item, 'Color'),
          divisionparaasientodecosteoporcierre: getTextFromNode(item, 'DivisionParaAsientoDeCosteoPorCierre'),
          especiedegranooncca: getTextFromNode(item, 'EspecieDeGranoONCCA'),
          tipodegranooncca: getTextFromNode(item, 'TipoDeGranoONCCA'),
          variedaddedegrano: getTextFromNode(item, 'VariedadDeGrano'),
          cuentadeanticipoliquidacioncompracereal: getTextFromNode(item, 'CuentaDeAnticipoLiquidacionCompraCereal'),
          codigodeproductocot: getTextFromNode(item, 'CodigoDeProductoCOT'),
          unidadmedidacot: getTextFromNode(item, 'UnidadDeMedidaCOT'),
          factordeconversioncot: parseNumero(getTextFromNode(item, 'FactorDeConversionCOT')),
          volumenembaladounidadmedidastock: parseNumero(getTextFromNode(item, 'VolumenEmbaladoPorUnidadDeMedidaDeStock')),
          unidadmedidaparadimensionesarticulo: getTextFromNode(item, 'UnidadDeMedidaParaDimensionesDelArticulo'),
          largo: parseNumero(getTextFromNode(item, 'Largo')),
          ancho: parseNumero(getTextFromNode(item, 'Ancho')),
          alto: parseNumero(getTextFromNode(item, 'Alto')),
          bloqueadoparaventa: parseBooleano(getTextFromNode(item, 'BloqueadoParaVenta')),
          fechadebajaparaventas: parseFecha(getTextFromNode(item, 'FechaDeBajaParaVentas')),
          clasificacion1articulosnombre: getTextFromNode(item, 'Clasificacion1ArticulosNombre'),
          clasificacion2articulosnombre: getTextFromNode(item, 'Clasificacion2ArticulosNombre'),
          clasificacion3articulosnombre: getTextFromNode(item, 'Clasificacion3ArticulosNombre'),
          clasificacion4articulosnombre: getTextFromNode(item, 'Clasificacion4ArticulosNombre'),
          clasificacion5articulosnombre: getTextFromNode(item, 'Clasificacion5ArticulosNombre'),
          clasificacion6articulosnombre: getTextFromNode(item, 'Clasificacion6ArticulosNombre'),
          clasificacion7articulosnombre: getTextFromNode(item, 'Clasificacion7ArticulosNombre'),
          clasificacion8articulosnombre: getTextFromNode(item, 'Clasificacion8ArticulosNombre'),
          clasificacion9articulosnombre: getTextFromNode(item, 'Clasificacion9ArticulosNombre'),
          clasificacion10articulosnombre: getTextFromNode(item, 'Clasificacion10ArticulosNombre'),
          clasificacion11articulosnombre: getTextFromNode(item, 'Clasificacion11ArticulosNombre'),
          clasificacion12articulosnombre: getTextFromNode(item, 'Clasificacion12ArticulosNombre'),
          clasificacion13articulosnombre: getTextFromNode(item, 'Clasificacion13ArticulosNombre'),
          clasificacion14articulosnombre: getTextFromNode(item, 'Clasificacion14ArticulosNombre'),
          clasificacion15articulosnombre: getTextFromNode(item, 'Clasificacion15ArticulosNombre'),
          clasificacion16articulosnombre: getTextFromNode(item, 'Clasificacion16ArticulosNombre'),
          unidadmedidastocknombre: getTextFromNode(item, 'UnidadDeMedidaDeStockNombre'),
          unidadmedidahomogeneastocknombre: getTextFromNode(item, 'UnidadDeMedidaHomogeneaDeStockNombre'),
          clasificadorvariableunidadmedidaarticulonombre: getTextFromNode(item, 'ClasificadorVariablePorUnidadDeMedidaDeArticuloNombre'),
          tallenombre: getTextFromNode(item, 'TalleNombre'),
          colornombre: getTextFromNode(item, 'ColorNombre'),
          cuentadeanticipoliquidacioncompracerealmombre: getTextFromNode(item, 'CuentaDeAnticipoLiquidacionCompraCerealNombre'),
          codigodeproductocotnombre: getTextFromNode(item, 'CodigoDeProductoCOTNombre'),
          unidadmedidaparadimensionesarticulonombre: getTextFromNode(item, 'UnidadDeMedidaParaDimensionesDelArticuloNombre'),
          fechaultactualizacion: parseFecha(getTextFromNode(item, 'FechaUltActualizacion')),
          factordeconversionumhomven: parseNumero(getTextFromNode(item, 'FactorDeConversionUMHomVen')),
        };

        // 6. Insertar o actualizar en la base de datos
        const query = `
          INSERT INTO productos (
            articuloid, nombre, articuloempresa, articuloparaimpresion, tipodeariculo,
            descripcion, clasificacion1articulos, clasificacion2articulos, clasificacion3articulos,
            clasificacion4articulos, clasificacion5articulos, clasificacion6articulos,
            clasificacion7articulos, clasificacion8articulos, clasificacion9articulos,
            clasificacion10articulos, clasificacion11articulos, clasificacion12articulos,
            clasificacion13articulos, clasificacion14articulos, clasificacion15articulos,
            clasificacion16articulos, unidadmedidastock, codigodebarraunidadmedidastock,
            secontrolastock, seadministraconpartidas, seadministraconnumerosdeserie,
            seadministraportalles, sevende, secompra, fechadealta, fechadebaja,
            bloqueadoparamovimientosstock, pesoembaladounidadmedidastock,
            cantidadunidadmedidastockbulto, unidadmedidahomogeneastock,
            factordeconversionunidadmedidahomogeneastock, cuentadeactivo,
            seproduce, mododeconsumodecomponentes, modalidadestockminimo,
            stockminimoparamodalidadcantidadfija, generamovimientosstock,
            clasificadorvariableunidadmedidaarticulo,
            porcentajedesviomaximoparaajustemanualdeconsumoautomatico,
            administrapreciopromedioponderado,
            ajustacantidadesumstockcalculadasporsistema,
            porcentajemaximoajustecantidadumstock,
            secosteaporcierremensual, talle, color, divisionparaasientodecosteoporcierre,
            especiedegranooncca, tipodegranooncca, variedaddedegrano,
            cuentadeanticipoliquidacioncompracereal, codigodeproductocot,
            unidadmedidacot, factordeconversioncot,
            volumenembaladounidadmedidastock, unidadmedidaparadimensionesarticulo,
            largo, ancho, alto, bloqueadoparaventa, fechadebajaparaventas,
            clasificacion1articulosnombre, clasificacion2articulosnombre,
            clasificacion3articulosnombre, clasificacion4articulosnombre,
            clasificacion5articulosnombre, clasificacion6articulosnombre,
            clasificacion7articulosnombre, clasificacion8articulosnombre,
            clasificacion9articulosnombre, clasificacion10articulosnombre,
            clasificacion11articulosnombre, clasificacion12articulosnombre,
            clasificacion13articulosnombre, clasificacion14articulosnombre,
            clasificacion15articulosnombre, clasificacion16articulosnombre,
            unidadmedidastocknombre, unidadmedidahomogeneastocknombre,
            clasificadorvariableunidadmedidaarticulonombre, tallenombre, colornombre,
            cuentadeanticipoliquidacioncompracerealmombre, codigodeproductocotnombre,
            unidadmedidaparadimensionesarticulonombre, fechaultactualizacion,
            factordeconversionumhomven, ultima_sincronizacion
          ) VALUES (
            ${articulo.articuloid}, ${articulo.nombre}, ${articulo.articuloempresa},
            ${articulo.articuloparaimpresion}, ${articulo.tipodeariculo},
            ${articulo.descripcion}, ${articulo.clasificacion1articulos},
            ${articulo.clasificacion2articulos}, ${articulo.clasificacion3articulos},
            ${articulo.clasificacion4articulos}, ${articulo.clasificacion5articulos},
            ${articulo.clasificacion6articulos}, ${articulo.clasificacion7articulos},
            ${articulo.clasificacion8articulos}, ${articulo.clasificacion9articulos},
            ${articulo.clasificacion10articulos}, ${articulo.clasificacion11articulos},
            ${articulo.clasificacion12articulos}, ${articulo.clasificacion13articulos},
            ${articulo.clasificacion14articulos}, ${articulo.clasificacion15articulos},
            ${articulo.clasificacion16articulos}, ${articulo.unidadmedidastock},
            ${articulo.codigodebarraunidadmedidastock}, ${articulo.secontrolastock},
            ${articulo.seadministraconpartidas}, ${articulo.seadministraconnumerosdeserie},
            ${articulo.seadministraportalles}, ${articulo.sevende}, ${articulo.secompra},
            ${articulo.fechadealta}, ${articulo.fechadebaja},
            ${articulo.bloqueadoparamovimientosstock},
            ${articulo.pesoembaladounidadmedidastock},
            ${articulo.cantidadunidadmedidastockbulto},
            ${articulo.unidadmedidahomogeneastock},
            ${articulo.factordeconversionunidadmedidahomogeneastock},
            ${articulo.cuentadeactivo}, ${articulo.seproduce},
            ${articulo.mododeconsumodecomponentes}, ${articulo.modalidadestockminimo},
            ${articulo.stockminimoparamodalidadcantidadfija},
            ${articulo.generamovimientosstock},
            ${articulo.clasificadorvariableunidadmedidaarticulo},
            ${articulo.porcentajedesviomaximoparaajustemanualdeconsumoautomatico},
            ${articulo.administrapreciopromedioponderado},
            ${articulo.ajustacantidadesumstockcalculadasporsistema},
            ${articulo.porcentajemaximoajustecantidadumstock},
            ${articulo.secosteaporcierremensual}, ${articulo.talle}, ${articulo.color},
            ${articulo.divisionparaasientodecosteoporcierre},
            ${articulo.especiedegranooncca}, ${articulo.tipodegranooncca},
            ${articulo.variedaddedegrano},
            ${articulo.cuentadeanticipoliquidacioncompracereal},
            ${articulo.codigodeproductocot}, ${articulo.unidadmedidacot},
            ${articulo.factordeconversioncot},
            ${articulo.volumenembaladounidadmedidastock},
            ${articulo.unidadmedidaparadimensionesarticulo},
            ${articulo.largo}, ${articulo.ancho}, ${articulo.alto},
            ${articulo.bloqueadoparaventa}, ${articulo.fechadebajaparaventas},
            ${articulo.clasificacion1articulosnombre},
            ${articulo.clasificacion2articulosnombre},
            ${articulo.clasificacion3articulosnombre},
            ${articulo.clasificacion4articulosnombre},
            ${articulo.clasificacion5articulosnombre},
            ${articulo.clasificacion6articulosnombre},
            ${articulo.clasificacion7articulosnombre},
            ${articulo.clasificacion8articulosnombre},
            ${articulo.clasificacion9articulosnombre},
            ${articulo.clasificacion10articulosnombre},
            ${articulo.clasificacion11articulosnombre},
            ${articulo.clasificacion12articulosnombre},
            ${articulo.clasificacion13articulosnombre},
            ${articulo.clasificacion14articulosnombre},
            ${articulo.clasificacion15articulosnombre},
            ${articulo.clasificacion16articulosnombre},
            ${articulo.unidadmedidastocknombre},
            ${articulo.unidadmedidahomogeneastocknombre},
            ${articulo.clasificadorvariableunidadmedidaarticulonombre},
            ${articulo.tallenombre}, ${articulo.colornombre},
            ${articulo.cuentadeanticipoliquidacioncompracerealmombre},
            ${articulo.codigodeproductocotnombre},
            ${articulo.unidadmedidaparadimensionesarticulonombre},
            ${articulo.fechaultactualizacion},
            ${articulo.factordeconversionumhomven},
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (articuloid) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            articuloempresa = EXCLUDED.articuloempresa,
            articuloparaimpresion = EXCLUDED.articuloparaimpresion,
            tipodeariculo = EXCLUDED.tipodeariculo,
            descripcion = EXCLUDED.descripcion,
            clasificacion1articulos = EXCLUDED.clasificacion1articulos,
            clasificacion2articulos = EXCLUDED.clasificacion2articulos,
            clasificacion3articulos = EXCLUDED.clasificacion3articulos,
            clasificacion4articulos = EXCLUDED.clasificacion4articulos,
            clasificacion5articulos = EXCLUDED.clasificacion5articulos,
            clasificacion6articulos = EXCLUDED.clasificacion6articulos,
            clasificacion7articulos = EXCLUDED.clasificacion7articulos,
            clasificacion8articulos = EXCLUDED.clasificacion8articulos,
            clasificacion9articulos = EXCLUDED.clasificacion9articulos,
            clasificacion10articulos = EXCLUDED.clasificacion10articulos,
            clasificacion11articulos = EXCLUDED.clasificacion11articulos,
            clasificacion12articulos = EXCLUDED.clasificacion12articulos,
            clasificacion13articulos = EXCLUDED.clasificacion13articulos,
            clasificacion14articulos = EXCLUDED.clasificacion14articulos,
            clasificacion15articulos = EXCLUDED.clasificacion15articulos,
            clasificacion16articulos = EXCLUDED.clasificacion16articulos,
            unidadmedidastock = EXCLUDED.unidadmedidastock,
            codigodebarraunidadmedidastock = EXCLUDED.codigodebarraunidadmedidastock,
            secontrolastock = EXCLUDED.secontrolastock,
            seadministraconpartidas = EXCLUDED.seadministraconpartidas,
            seadministraconnumerosdeserie = EXCLUDED.seadministraconnumerosdeserie,
            seadministraportalles = EXCLUDED.seadministraportalles,
            sevende = EXCLUDED.sevende,
            secompra = EXCLUDED.secompra,
            fechadealta = EXCLUDED.fechadealta,
            fechadebaja = EXCLUDED.fechadebaja,
            bloqueadoparamovimientosstock = EXCLUDED.bloqueadoparamovimientosstock,
            pesoembaladounidadmedidastock = EXCLUDED.pesoembaladounidadmedidastock,
            cantidadunidadmedidastockbulto = EXCLUDED.cantidadunidadmedidastockbulto,
            unidadmedidahomogeneastock = EXCLUDED.unidadmedidahomogeneastock,
            factordeconversionunidadmedidahomogeneastock = EXCLUDED.factordeconversionunidadmedidahomogeneastock,
            cuentadeactivo = EXCLUDED.cuentadeactivo,
            seproduce = EXCLUDED.seproduce,
            mododeconsumodecomponentes = EXCLUDED.mododeconsumodecomponentes,
            modalidadestockminimo = EXCLUDED.modalidadestockminimo,
            stockminimoparamodalidadcantidadfija = EXCLUDED.stockminimoparamodalidadcantidadfija,
            generamovimientosstock = EXCLUDED.generamovimientosstock,
            clasificadorvariableunidadmedidaarticulo = EXCLUDED.clasificadorvariableunidadmedidaarticulo,
            porcentajedesviomaximoparaajustemanualdeconsumoautomatico = EXCLUDED.porcentajedesviomaximoparaajustemanualdeconsumoautomatico,
            administrapreciopromedioponderado = EXCLUDED.administrapreciopromedioponderado,
            ajustacantidadesumstockcalculadasporsistema = EXCLUDED.ajustacantidadesumstockcalculadasporsistema,
            porcentajemaximoajustecantidadumstock = EXCLUDED.porcentajemaximoajustecantidadumstock,
            secosteaporcierremensual = EXCLUDED.secosteaporcierremensual,
            talle = EXCLUDED.talle,
            color = EXCLUDED.color,
            divisionparaasientodecosteoporcierre = EXCLUDED.divisionparaasientodecosteoporcierre,
            especiedegranooncca = EXCLUDED.especiedegranooncca,
            tipodegranooncca = EXCLUDED.tipodegranooncca,
            variedaddedegrano = EXCLUDED.variedaddedegrano,
            cuentadeanticipoliquidacioncompracereal = EXCLUDED.cuentadeanticipoliquidacioncompracereal,
            codigodeproductocot = EXCLUDED.codigodeproductocot,
            unidadmedidacot = EXCLUDED.unidadmedidacot,
            factordeconversioncot = EXCLUDED.factordeconversioncot,
            volumenembaladounidadmedidastock = EXCLUDED.volumenembaladounidadmedidastock,
            unidadmedidaparadimensionesarticulo = EXCLUDED.unidadmedidaparadimensionesarticulo,
            largo = EXCLUDED.largo,
            ancho = EXCLUDED.ancho,
            alto = EXCLUDED.alto,
            bloqueadoparaventa = EXCLUDED.bloqueadoparaventa,
            fechadebajaparaventas = EXCLUDED.fechadebajaparaventas,
            clasificacion1articulosnombre = EXCLUDED.clasificacion1articulosnombre,
            clasificacion2articulosnombre = EXCLUDED.clasificacion2articulosnombre,
            clasificacion3articulosnombre = EXCLUDED.clasificacion3articulosnombre,
            clasificacion4articulosnombre = EXCLUDED.clasificacion4articulosnombre,
            clasificacion5articulosnombre = EXCLUDED.clasificacion5articulosnombre,
            clasificacion6articulosnombre = EXCLUDED.clasificacion6articulosnombre,
            clasificacion7articulosnombre = EXCLUDED.clasificacion7articulosnombre,
            clasificacion8articulosnombre = EXCLUDED.clasificacion8articulosnombre,
            clasificacion9articulosnombre = EXCLUDED.clasificacion9articulosnombre,
            clasificacion10articulosnombre = EXCLUDED.clasificacion10articulosnombre,
            clasificacion11articulosnombre = EXCLUDED.clasificacion11articulosnombre,
            clasificacion12articulosnombre = EXCLUDED.clasificacion12articulosnombre,
            clasificacion13articulosnombre = EXCLUDED.clasificacion13articulosnombre,
            clasificacion14articulosnombre = EXCLUDED.clasificacion14articulosnombre,
            clasificacion15articulosnombre = EXCLUDED.clasificacion15articulosnombre,
            clasificacion16articulosnombre = EXCLUDED.clasificacion16articulosnombre,
            unidadmedidastocknombre = EXCLUDED.unidadmedidastocknombre,
            unidadmedidahomogeneastocknombre = EXCLUDED.unidadmedidahomogeneastocknombre,
            clasificadorvariableunidadmedidaarticulonombre = EXCLUDED.clasificadorvariableunidadmedidaarticulonombre,
            tallenombre = EXCLUDED.tallenombre,
            colornombre = EXCLUDED.colornombre,
            cuentadeanticipoliquidacioncompracerealmombre = EXCLUDED.cuentadeanticipoliquidacioncompracerealmombre,
            codigodeproductocotnombre = EXCLUDED.codigodeproductocotnombre,
            unidadmedidaparadimensionesarticulonombre = EXCLUDED.unidadmedidaparadimensionesarticulonombre,
            fechaultactualizacion = EXCLUDED.fechaultactualizacion,
            factordeconversionumhomven = EXCLUDED.factordeconversionumhomven,
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        await sql.unsafe(query);
        
        // Contar si fue inserción o actualización (lo manejamos con un contador simple)
        // Para simplificar, sumamos 1 por cada registro procesado sin error
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
