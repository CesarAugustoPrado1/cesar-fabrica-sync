import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// Lista COMPLETA de atributos extraída del WSDL y la documentación
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

function getTextFromNode(node: any, tagName: string): string | null {
  if (!node) return null;
  const child = node[tagName];
  if (Array.isArray(child) && child.length > 0) {
    return child[0] || null;
  }
  return child || null;
}

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    const atributosXML = atributosCompletos.map(attr => 
      `<ArticuloAtributos>${attr}</ArticuloAtributos>`
    ).join('');

    // Nodo Filtros vacío con namespace para evitar NullReferenceException
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
      explicitArray: true,
      mergeAttrs: false,
      ignoreAttrs: true,
    });

    // Extraer los artículos según la estructura real del XML
    let articulos: any[] = [];
    try {
      // Buscar el nodo Articulos
      const root = result['Articulos'] || result['soap:Envelope']?.['soap:Body']?.[0]?.['ObtenerArticulosResponse']?.[0]?.['ObtenerArticulosResult']?.[0]?.['Articulos']?.[0];
      
      if (root) {
        // Si hay un nodo Articulos, buscar los Artículo dentro
        if (root['Articulo']) {
          articulos = root['Articulo'];
        } else {
          throw new Error('No se encontraron nodos Articulo en la respuesta');
        }
      } else {
        // Buscar directamente si el resultado es un array de Articulo
        const envelope = result['soap:Envelope'] || result;
        const body = envelope['soap:Body'] || envelope['s:Body'] || envelope;
        const responseNode = body['ObtenerArticulosResponse'] || body['tns:ObtenerArticulosResponse'] || body;
        const resultNode = responseNode?.['ObtenerArticulosResult']?.[0];
        
        if (resultNode && resultNode['Articulos'] && resultNode['Articulos'][0] && resultNode['Articulos'][0]['Articulo']) {
          articulos = resultNode['Articulos'][0]['Articulo'];
        } else if (resultNode && resultNode['Articulo']) {
          articulos = resultNode['Articulo'];
        } else {
          // Último intento: buscar cualquier nodo que contenga Articulo
          const keys = Object.keys(result);
          for (const key of keys) {
            if (result[key] && result[key][0] && result[key][0]['Articulo']) {
              articulos = result[key][0]['Articulo'];
              break;
            }
          }
          if (articulos.length === 0) {
            console.error('Estructura de la respuesta:', JSON.stringify(result, null, 2));
            throw new Error('No se pudo encontrar la lista de artículos en la respuesta');
          }
        }
      }
    } catch (err) {
      console.error('Error al parsear la estructura del XML:', err);
      throw err;
    }

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    let procesados = 0;
    let errores = 0;

    for (const item of articulos) {
      try {
        // Extraer todos los atributos según la tabla
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

        // Construir la consulta SQL dinámica con todas las columnas
        const columns = Object.keys(articulo);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = columns.map(col => articulo[col as keyof typeof articulo]);

        const query = `
          INSERT INTO productos (${columns.join(', ')}, ultima_sincronizacion)
          VALUES (${placeholders}, CURRENT_TIMESTAMP)
          ON CONFLICT (articuloid) DO UPDATE SET
            ${columns.map(col => `${col} = EXCLUDED.${col}`).join(', ')},
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        await sql(query, values);
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
