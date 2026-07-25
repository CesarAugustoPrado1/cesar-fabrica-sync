import { syncGenerico, parseFecha, parseBooleano } from './erp-common';

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
    limite: 100, // 👈 Solo 100 clientes para pruebas rápidas
    mapear: (item: any) => {
      // Función para extraer valor de atributo o hijo
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
        pais: getValor(item, 'Pais'),
        telefono: getValor(item, 'Telefono'),
        fax: getValor(item, 'Fax'),
        email: getValor(item, 'Email'),
        observacion: getValor(item, 'Observacion'),
        condicionanteeliva: getValor(item, 'CondicionAnteElIVA'),
        clavetributaria: getValor(item, 'ClaveTributaria'),
        ingresosbrutos: getValor(item, 'IngresosBrutos'),
        contactodeventa: getValor(item, 'ContactoDeVenta'),
        contactodecobros: getValor(item, 'ContactoDeCobros'),
        condicionpago: getValor(item, 'CondicionPago'),
        monedausualcuentacorriente: getValor(item, 'MonedaUsualCuentaCorriente'),
        cuentacliente: getValor(item, 'CuentaCliente'),
        tipodecliente: getValor(item, 'TipoDeCliente'),
        actividaddecliente: getValor(item, 'ActividadDeCliente'),
        clasificacion1: getValor(item, 'Clasificacion1'),
        clasificacion2: getValor(item, 'Clasificacion2'),
        clasificacion3: getValor(item, 'Clasificacion3'),
        clasificacion4: getValor(item, 'Clasificacion4'),
        clasificacion5: getValor(item, 'Clasificacion5'),
        clasificacion6: getValor(item, 'Clasificacion6'),
        clasificacion7: getValor(item, 'Clasificacion7'),
        clasificacion8: getValor(item, 'Clasificacion8'),
        clasificacion9: getValor(item, 'Clasificacion9'),
        vendedor: getValor(item, 'Vendedor'),
        zonadeventa: getValor(item, 'ZonaDeVenta'),
        cobrador: getValor(item, 'Cobrador'),
        transporte: getValor(item, 'Transporte'),
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
