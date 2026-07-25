import { syncGenerico, parseFecha, parseBooleano, getAttr } from './erp-common';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioCCOCliente.asmx';

const atributos = [
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

export async function syncClientes() {
  console.log('🔄 Iniciando sincronización de clientes...');
  await syncGenerico({
    nombre: 'clientes',
    url: SOAP_URL,
    atributos: atributos,
    soapAction: 'ObtenerClientes',
    namespace: 'http://wsplataforma.intecsoft.com.ar/',
    soapActionUrl: 'http://wsplataforma.intecsoft.com.ar/ObtenerClientes',
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
