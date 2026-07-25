import { syncGenerico, parseFecha, parseBooleano, parseNumero } from './erp-common';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';

const atributos = [
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

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de productos...');
  await syncGenerico({
    nombre: 'productos',
    url: SOAP_URL,
    atributos: atributos,
    soapAction: 'ObtenerArticulos',
    namespace: 'http://plataforma.net.ar/',
    soapActionUrl: 'http://plataforma.net.ar/ObtenerArticulos',
    nodoItem: 'Articulo',
    idAttr: 'ArticuloID',
    tabla: 'productos',
    idCol: 'articuloid',
    limite: 0, // Sin límite para sincronizar todos
    mapear: (item: any) => {
      const getValor = (node: any, campo: string): string | null => {
        if (node.$ && node.$[campo] !== undefined) return node.$[campo];
        if (node[campo] !== undefined) return node[campo];
        return null;
      };

      const nombre = getValor(item, 'Nombre');
      const descripcion = getValor(item, 'Descripcion');

      return {
        articuloid: parseInt(getValor(item, 'ArticuloID') || '0'),
        nombre: nombre || 'S/N', // 👈 Valor por defecto si viene null
        descripcion: descripcion || '',
        unidadmedidastock: getValor(item, 'UnidadDeMedidaDeStock'),
        sevende: parseBooleano(getValor(item, 'SeVende')),
        secompra: parseBooleano(getValor(item, 'SeCompra')),
        fechadealta: parseFecha(getValor(item, 'FechaDeAlta')),
        fechaultactualizacion: parseFecha(getValor(item, 'FechaUltActualizacion')),
        clasificacion1articulos: getValor(item, 'Clasificacion1Articulos'),
        clasificacion2articulos: getValor(item, 'Clasificacion2Articulos'),
        clasificacion3articulos: getValor(item, 'Clasificacion3Articulos'),
        clasificacion4articulos: getValor(item, 'Clasificacion4Articulos'),
        clasificacion5articulos: getValor(item, 'Clasificacion5Articulos'),
        clasificacion6articulos: getValor(item, 'Clasificacion6Articulos'),
        clasificacion7articulos: getValor(item, 'Clasificacion7Articulos'),
        clasificacion8articulos: getValor(item, 'Clasificacion8Articulos'),
        clasificacion9articulos: getValor(item, 'Clasificacion9Articulos'),
        clasificacion10articulos: getValor(item, 'Clasificacion10Articulos'),
        clasificacion11articulos: getValor(item, 'Clasificacion11Articulos'),
        clasificacion12articulos: getValor(item, 'Clasificacion12Articulos'),
        clasificacion13articulos: getValor(item, 'Clasificacion13Articulos'),
        clasificacion14articulos: getValor(item, 'Clasificacion14Articulos'),
        clasificacion15articulos: getValor(item, 'Clasificacion15Articulos'),
        clasificacion16articulos: getValor(item, 'Clasificacion16Articulos'),
        clasificacion1articulosnombre: getValor(item, 'Clasificacion1ArticulosNombre'),
        clasificacion2articulosnombre: getValor(item, 'Clasificacion2ArticulosNombre'),
        clasificacion3articulosnombre: getValor(item, 'Clasificacion3ArticulosNombre'),
        clasificacion4articulosnombre: getValor(item, 'Clasificacion4ArticulosNombre'),
        clasificacion5articulosnombre: getValor(item, 'Clasificacion5ArticulosNombre'),
        clasificacion6articulosnombre: getValor(item, 'Clasificacion6ArticulosNombre'),
        clasificacion7articulosnombre: getValor(item, 'Clasificacion7ArticulosNombre'),
        clasificacion8articulosnombre: getValor(item, 'Clasificacion8ArticulosNombre'),
        clasificacion9articulosnombre: getValor(item, 'Clasificacion9ArticulosNombre'),
        clasificacion10articulosnombre: getValor(item, 'Clasificacion10ArticulosNombre'),
        clasificacion11articulosnombre: getValor(item, 'Clasificacion11ArticulosNombre'),
        clasificacion12articulosnombre: getValor(item, 'Clasificacion12ArticulosNombre'),
        clasificacion13articulosnombre: getValor(item, 'Clasificacion13ArticulosNombre'),
        clasificacion14articulosnombre: getValor(item, 'Clasificacion14ArticulosNombre'),
        clasificacion15articulosnombre: getValor(item, 'Clasificacion15ArticulosNombre'),
        clasificacion16articulosnombre: getValor(item, 'Clasificacion16ArticulosNombre'),
        secontrolastock: parseBooleano(getValor(item, 'SeControlaStock')),
        seadministraconpartidas: parseBooleano(getValor(item, 'SeAdministraConPartidas')),
        seadministraconnumerosdeserie: parseBooleano(getValor(item, 'SeAdministraConNumerosDeSerie')),
        seadministraportalles: parseBooleano(getValor(item, 'SeAdministraPorTalles')),
        fechadebaja: parseFecha(getValor(item, 'FechaDeBaja')),
        bloqueadoparamovimientosstock: parseBooleano(getValor(item, 'BloqueadoParaMovimientosDeStock')),
        generamovimientosstock: parseBooleano(getValor(item, 'GeneraMovimientosDeStock')),
        pesoembaladounidadmedidastock: parseNumero(getValor(item, 'PesoEmbaladoPorUnidadDeMedidaDeStock')),
        cantidadunidadmedidastockbulto: parseNumero(getValor(item, 'CantidadPorUnidadDeMedidaDeStockPorBulto')),
        unidadmedidahomogeneastock: getValor(item, 'UnidadDeMedidaHomogeneaDeStock'),
        factordeconversionunidadmedidahomogeneastock: parseNumero(getValor(item, 'FactorDeConversionUnidadDeMedidaHomogeneaDeStock')),
        cuentadeactivo: getValor(item, 'CuentaDeActivo'),
        seproduce: parseBooleano(getValor(item, 'SeProduce')),
        mododeconsumodecomponentes: getValor(item, 'ModoDeConsumoDeComponentes'),
        modalidadestockminimo: getValor(item, 'ModalidadDeStockMinimo'),
        stockminimoparamodalidadcantidadfija: parseNumero(getValor(item, 'StockMinimoParaModalidadPorCantidadFija')),
        administrapreciopromedioponderado: parseBooleano(getValor(item, 'AdministraPrecioPromedioPonderado')),
        ajustacantidadesumstockcalculadasporsistema: parseBooleano(getValor(item, 'AjustaCantidadesEnUMDeStockCalculadasPorElSistema')),
        porcentajemaximoajustecantidadumstock: parseNumero(getValor(item, 'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock')),
        secosteaporcierremensual: parseBooleano(getValor(item, 'SeCosteaPorCierreMensual')),
        talle: getValor(item, 'Talle'),
        color: getValor(item, 'Color'),
        divisionparaasientodecosteoporcierre: getValor(item, 'DivisionParaAsientoDeCosteoPorCierre'),
        especiedegranooncca: getValor(item, 'EspecieDeGranoONCCA'),
        tipodegranooncca: getValor(item, 'TipoDeGranoONCCA'),
        variedaddedegrano: getValor(item, 'VariedadDeGrano'),
        cuentadeanticipoliquidacioncompracereal: getValor(item, 'CuentaDeAnticipoLiquidacionCompraCereal'),
        codigodeproductocot: getValor(item, 'CodigoDeProductoCOT'),
        unidadmedidacot: getValor(item, 'UnidadDeMedidaCOT'),
        factordeconversioncot: parseNumero(getValor(item, 'FactorDeConversionCOT')),
        volumenembaladounidadmedidastock: parseNumero(getValor(item, 'VolumenEmbaladoPorUnidadDeMedidaDeStock')),
        unidadmedidaparadimensionesarticulo: getValor(item, 'UnidadDeMedidaParaDimensionesDelArticulo'),
        largo: parseNumero(getValor(item, 'Largo')),
        ancho: parseNumero(getValor(item, 'Ancho')),
        alto: parseNumero(getValor(item, 'Alto')),
        bloqueadoparaventa: parseBooleano(getValor(item, 'BloqueadoParaVenta')),
        fechadebajaparaventas: parseFecha(getValor(item, 'FechaDeBajaParaVentas')),
      };
    }
  });
}
