import { syncGenerico, parseFecha, parseBooleano, parseNumero, getAttr } from './erp-common';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';

// Atributos que pedimos al ERP (los que realmente necesitamos)
const atributos = [
  'ArticuloID', 'Nombre', 'Descripcion', 'UnidadDeMedidaDeStock',
  'FechaDeAlta', 'FechaUltActualizacion',
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
    // Eliminamos límite para que sincronice todos
    mapear: (item: any) => {
      // Mapeamos solo las columnas que existen en la tabla
      return {
        articuloid: parseInt(getAttr(item, 'ArticuloID') || '0'),
        nombre: getAttr(item, 'Nombre'),
        descripcion: getAttr(item, 'Descripcion'),
        unidadmedidastock: getAttr(item, 'UnidadDeMedidaDeStock'),
        // Usamos fecha_creacion para FechaDeAlta
        fecha_creacion: parseFecha(getAttr(item, 'FechaDeAlta')),
        // Usamos fecha_actualizacion para FechaUltActualizacion
        fecha_actualizacion: parseFecha(getAttr(item, 'FechaUltActualizacion')),
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
        largo: parseNumero(getAttr(item, 'Largo')),
        ancho: parseNumero(getAttr(item, 'Ancho')),
        alto: parseNumero(getAttr(item, 'Alto')),
        bloqueadoparaventa: parseBooleano(getAttr(item, 'BloqueadoParaVenta')),
        fechadebajaparaventas: parseFecha(getAttr(item, 'FechaDeBajaParaVentas')),
      };
    }
  });
}
