import { syncGenerico, parseFecha, parseBooleano, parseNumero, getAttr } from './erp-common';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioSTOCArticulo.asmx';

// Atributos que se piden al ERP (solo los que realmente necesitas y existen en la tabla)
const atributos = [
  'ArticuloID',
  'Nombre',
  'Descripcion',
  'UnidadDeMedidaDeStock',
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
  // 'SeControlaStock', // No existe en la tabla, lo comento
  // 'SeAdministraConPartidas', // No existe
  // ... etc.
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
    // Sin límite (o poner 0 para desactivar)
    limite: 0, // 0 = sin límite
    mapear: (item: any) => {
      const getValor = (node: any, campo: string): string | null => {
        if (node.$ && node.$[campo] !== undefined) return node.$[campo];
        if (node[campo] !== undefined) return node[campo];
        return null;
      };

      // Si nombre es null, asignar 'SIN NOMBRE'
      const nombre = getValor(item, 'Nombre') || 'SIN NOMBRE';

      return {
        articuloid: parseInt(getValor(item, 'ArticuloID') || '0'),
        nombre: nombre,
        descripcion: getValor(item, 'Descripcion'),
        unidadmedidastock: getValor(item, 'UnidadDeMedidaDeStock'),
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
        // Estas columnas existen en la tabla pero no vienen en el SOAP, las dejamos null
        codigodebarraunidadmedidastock: null,
        articuloempresa: null,
        articuloparaimpresion: null,
        tipodeariculo: null,
        precioventa: null,
        preciocosto: null,
        // Si quieres agregar más columnas que vengan del SOAP, agrégalas aquí
      };
    }
  });
}
