import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// Lista COMPLETA de atributos del ERP (100+ atributos)
const atributosCompletos = [
  'ArticuloID',
  'Nombre',
  'Descripcion',
  'UnidadDeMedidaDeStock',
  'SeVende',
  'SeCompra',
  'FechaDeAlta',
  'FechaUltActualizacion',
  // Clasificaciones 1 a 16
  'Clasificacion1Articulos', 'Clasificacion2Articulos', 'Clasificacion3Articulos',
  'Clasificacion4Articulos', 'Clasificacion5Articulos', 'Clasificacion6Articulos',
  'Clasificacion7Articulos', 'Clasificacion8Articulos', 'Clasificacion9Articulos',
  'Clasificacion10Articulos', 'Clasificacion11Articulos', 'Clasificacion12Articulos',
  'Clasificacion13Articulos', 'Clasificacion14Articulos', 'Clasificacion15Articulos',
  'Clasificacion16Articulos',
  // Nombres de clasificaciones 1 a 16
  'Clasificacion1ArticulosNombre', 'Clasificacion2ArticulosNombre', 'Clasificacion3ArticulosNombre',
  'Clasificacion4ArticulosNombre', 'Clasificacion5ArticulosNombre', 'Clasificacion6ArticulosNombre',
  'Clasificacion7ArticulosNombre', 'Clasificacion8ArticulosNombre', 'Clasificacion9ArticulosNombre',
  'Clasificacion10ArticulosNombre', 'Clasificacion11ArticulosNombre', 'Clasificacion12ArticulosNombre',
  'Clasificacion13ArticulosNombre', 'Clasificacion14ArticulosNombre', 'Clasificacion15ArticulosNombre',
  'Clasificacion16ArticulosNombre',
  // Atributos de stock y control
  'SeControlaStock',
  'SeAdministraConPartidas',
  'SeAdministraConNumerosDeSerie',
  'SeAdministraPorTalles',
  'FechaDeBaja',
  'BloqueadoParaMovimientosDeStock',
  'GeneraMovimientosDeStock',
  // Atributos de pesos, conversiones, etc.
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

function parseNumero(valor: string | null): number | null {
  if (!valor) return null;
  const num = parseFloat(valor.replace(',', '.'));
  return isNaN(num) ? null : num;
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
    const atributosXML = atributosCompletos.map(attr => 
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
          // Clasificaciones 1 a 16
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
          // Nombres de clasificaciones
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
          // Stock y control
          secontrolastock: parseBooleano(getAttr(item, 'SeControlaStock')),
          seadministraconpartidas: parseBooleano(getAttr(item, 'SeAdministraConPartidas')),
          seadministraconnumerosdeserie: parseBooleano(getAttr(item, 'SeAdministraConNumerosDeSerie')),
          seadministraportalles: parseBooleano(getAttr(item, 'SeAdministraPorTalles')),
          fechadebaja: parseFecha(getAttr(item, 'FechaDeBaja')),
          bloqueadoparamovimientosstock: parseBooleano(getAttr(item, 'BloqueadoParaMovimientosDeStock')),
          generamovimientosstock: parseBooleano(getAttr(item, 'GeneraMovimientosDeStock')),
          // Pesos y conversiones
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

        const query = `
          INSERT INTO productos (
            articuloid, nombre, descripcion, unidadmedidastock,
            sevende, secompra, fechadealta, fechaultactualizacion,
            clasificacion1articulos, clasificacion2articulos,
            clasificacion3articulos, clasificacion4articulos,
            clasificacion5articulos, clasificacion6articulos,
            clasificacion7articulos, clasificacion8articulos,
            clasificacion9articulos, clasificacion10articulos,
            clasificacion11articulos, clasificacion12articulos,
            clasificacion13articulos, clasificacion14articulos,
            clasificacion15articulos, clasificacion16articulos,
            clasificacion1articulosnombre, clasificacion2articulosnombre,
            clasificacion3articulosnombre, clasificacion4articulosnombre,
            clasificacion5articulosnombre, clasificacion6articulosnombre,
            clasificacion7articulosnombre, clasificacion8articulosnombre,
            clasificacion9articulosnombre, clasificacion10articulosnombre,
            clasificacion11articulosnombre, clasificacion12articulosnombre,
            clasificacion13articulosnombre, clasificacion14articulosnombre,
            clasificacion15articulosnombre, clasificacion16articulosnombre,
            secontrolastock, seadministraconpartidas,
            seadministraconnumerosdeserie, seadministraportalles,
            fechadebaja, bloqueadoparamovimientosstock, generamovimientosstock,
            pesoembaladounidadmedidastock, cantidadunidadmedidastockbulto,
            unidadmedidahomogeneastock, factordeconversionunidadmedidahomogeneastock,
            cuentadeactivo, seproduce, mododeconsumodecomponentes,
            modalidadestockminimo, stockminimoparamodalidadcantidadfija,
            administrapreciopromedioponderado,
            ajustacantidadesumstockcalculadasporsistema,
            porcentajemaximoajustecantidadumstock,
            secosteaporcierremensual, talle, color,
            divisionparaasientodecosteoporcierre,
            especiedegranooncca, tipodegranooncca, variedaddedegrano,
            cuentadeanticipoliquidacioncompracereal,
            codigodeproductocot, unidadmedidacot, factordeconversioncot,
            volumenembaladounidadmedidastock,
            unidadmedidaparadimensionesarticulo,
            largo, ancho, alto,
            bloqueadoparaventa, fechadebajaparaventas,
            ultima_sincronizacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, CURRENT_TIMESTAMP)
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
            clasificacion9articulos = EXCLUDED.clasificacion9articulos,
            clasificacion10articulos = EXCLUDED.clasificacion10articulos,
            clasificacion11articulos = EXCLUDED.clasificacion11articulos,
            clasificacion12articulos = EXCLUDED.clasificacion12articulos,
            clasificacion13articulos = EXCLUDED.clasificacion13articulos,
            clasificacion14articulos = EXCLUDED.clasificacion14articulos,
            clasificacion15articulos = EXCLUDED.clasificacion15articulos,
            clasificacion16articulos = EXCLUDED.clasificacion16articulos,
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
            secontrolastock = EXCLUDED.secontrolastock,
            seadministraconpartidas = EXCLUDED.seadministraconpartidas,
            seadministraconnumerosdeserie = EXCLUDED.seadministraconnumerosdeserie,
            seadministraportalles = EXCLUDED.seadministraportalles,
            fechadebaja = EXCLUDED.fechadebaja,
            bloqueadoparamovimientosstock = EXCLUDED.bloqueadoparamovimientosstock,
            generamovimientosstock = EXCLUDED.generamovimientosstock,
            pesoembaladounidadmedidastock = EXCLUDED.pesoembaladounidadmedidastock,
            cantidadunidadmedidastockbulto = EXCLUDED.cantidadunidadmedidastockbulto,
            unidadmedidahomogeneastock = EXCLUDED.unidadmedidahomogeneastock,
            factordeconversionunidadmedidahomogeneastock = EXCLUDED.factordeconversionunidadmedidahomogeneastock,
            cuentadeactivo = EXCLUDED.cuentadeactivo,
            seproduce = EXCLUDED.seproduce,
            mododeconsumodecomponentes = EXCLUDED.mododeconsumodecomponentes,
            modalidadestockminimo = EXCLUDED.modalidadestockminimo,
            stockminimoparamodalidadcantidadfija = EXCLUDED.stockminimoparamodalidadcantidadfija,
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
          articulo.clasificacion9articulos,
          articulo.clasificacion10articulos,
          articulo.clasificacion11articulos,
          articulo.clasificacion12articulos,
          articulo.clasificacion13articulos,
          articulo.clasificacion14articulos,
          articulo.clasificacion15articulos,
          articulo.clasificacion16articulos,
          articulo.clasificacion1articulosnombre,
          articulo.clasificacion2articulosnombre,
          articulo.clasificacion3articulosnombre,
          articulo.clasificacion4articulosnombre,
          articulo.clasificacion5articulosnombre,
          articulo.clasificacion6articulosnombre,
          articulo.clasificacion7articulosnombre,
          articulo.clasificacion8articulosnombre,
          articulo.clasificacion9articulosnombre,
          articulo.clasificacion10articulosnombre,
          articulo.clasificacion11articulosnombre,
          articulo.clasificacion12articulosnombre,
          articulo.clasificacion13articulosnombre,
          articulo.clasificacion14articulosnombre,
          articulo.clasificacion15articulosnombre,
          articulo.clasificacion16articulosnombre,
          articulo.secontrolastock,
          articulo.seadministraconpartidas,
          articulo.seadministraconnumerosdeserie,
          articulo.seadministraportalles,
          articulo.fechadebaja,
          articulo.bloqueadoparamovimientosstock,
          articulo.generamovimientosstock,
          articulo.pesoembaladounidadmedidastock,
          articulo.cantidadunidadmedidastockbulto,
          articulo.unidadmedidahomogeneastock,
          articulo.factordeconversionunidadmedidahomogeneastock,
          articulo.cuentadeactivo,
          articulo.seproduce,
          articulo.mododeconsumodecomponentes,
          articulo.modalidadestockminimo,
          articulo.stockminimoparamodalidadcantidadfija,
          articulo.administrapreciopromedioponderado,
          articulo.ajustacantidadesumstockcalculadasporsistema,
          articulo.porcentajemaximoajustecantidadumstock,
          articulo.secosteaporcierremensual,
          articulo.talle,
          articulo.color,
          articulo.divisionparaasientodecosteoporcierre,
          articulo.especiedegranooncca,
          articulo.tipodegranooncca,
          articulo.variedaddedegrano,
          articulo.cuentadeanticipoliquidacioncompracereal,
          articulo.codigodeproductocot,
          articulo.unidadmedidacot,
          articulo.factordeconversioncot,
          articulo.volumenembaladounidadmedidastock,
          articulo.unidadmedidaparadimensionesarticulo,
          articulo.largo,
          articulo.ancho,
          articulo.alto,
          articulo.bloqueadoparaventa,
          articulo.fechadebajaparaventas,
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
