import { syncGenerico, parseFecha, parseBooleano } from './erp-common';

const SOAP_URL = 'http://wspirkastone.pypcloud.net:1881/ServicioCCOCliente.asmx';

// Solo los atributos que existen en la tabla clientes de Neon
const atributos = [
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
  'FormatoDeImpresionPorCliente',
  'Vendedor2',
  'FechaUltActualizacion'
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
    limite: 0,
    mapear: (item: any) => {
      const getValor = (node: any, campo: string): string | null => {
        if (node.$ && node.$[campo] !== undefined) return node.$[campo];
        if (node[campo] !== undefined) return node[campo];
        return null;
      };

      return {
        clienteid: parseInt(getValor(item, 'ClienteID') || '0'),
        nombre: getValor(item, 'Nombre'),
        nombrelegal: getValor(item, 'NombreLegal'),
        domicilio: getValor(item, 'Domicilio'),
        localidad: getValor(item, 'Localidad'),
        codigopostal: getValor(item, 'CodigoPostal'),
        provincia: getValor(item, 'Provincia'),
        provincianombre: getValor(item, 'ProvinciaNombre'),
        pais: getValor(item, 'Pais'),
        paisnombre: getValor(item, 'PaisNombre'),
        telefono: getValor(item, 'Telefono'),
        fax: getValor(item, 'Fax'),
        email: getValor(item, 'Email'),
        observacion: getValor(item, 'Observacion'),
        condicionanteeliva: getValor(item, 'CondicionAnteElIVA'),
        condicionanteelivanombre: getValor(item, 'CondicionAnteElIVANombre'),
        ingresosbrutos: getValor(item, 'IngresosBrutos'),
        contactodeventa: getValor(item, 'ContactoDeVenta'),
        contactodecobros: getValor(item, 'ContactoDeCobros'),
        condicionpago: getValor(item, 'CondicionPago'),
        condicionpagonombre: getValor(item, 'CondicionPagoNombre'),
        monedausualcuentacorriente: getValor(item, 'MonedaUsualCuentaCorriente'),
        monedausualcuentacorrientenombre: getValor(item, 'MonedaUsualCuentaCorrienteNombre'),
        cuentacliente: getValor(item, 'CuentaCliente'),
        tipodecliente: getValor(item, 'TipoDeCliente'),
        tipodeclientenombre: getValor(item, 'TipoDeClienteNombre'),
        actividaddecliente: getValor(item, 'ActividadDeCliente'),
        actividaddeclientenombre: getValor(item, 'ActividadDeClienteNombre'),
        vendedor: getValor(item, 'Vendedor'),
        vendedornombre: getValor(item, 'VendedorNombre'),
        zonadeventa: getValor(item, 'ZonaDeVenta'),
        zonadeventanombre: getValor(item, 'ZonaDeVentaNombre'),
        cobrador: getValor(item, 'Cobrador'),
        cobradornombre: getValor(item, 'CobradorNombre'),
        bloqueadoparanotasdepedido: parseBooleano(getValor(item, 'BloqueadoParaNotasDePedido')),
        bloqueadoparafacturar: parseBooleano(getValor(item, 'BloqueadoParaFacturar')),
        fechadealta: parseFecha(getValor(item, 'FechaDeAlta')),
        fechadebaja: parseFecha(getValor(item, 'FechaDeBaja')),
        habilitadoparaconsultasweb: parseBooleano(getValor(item, 'HabilitadoParaConsultasWeb')),
        formatodeimpresionporcliente: getValor(item, 'FormatoDeImpresionPorCliente'),
        vendedor2: getValor(item, 'Vendedor2'),
        fechaultactualizacion: parseFecha(getValor(item, 'FechaUltActualizacion')),
      };
    }
  });
}
