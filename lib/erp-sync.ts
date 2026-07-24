import { sql } from './db';
import { parseStringPromise } from 'xml2js';

// Lista completa de atributos (todos los que quieras)
const atributos = [
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

function getAttr(node: any, attrName: string): string | null {
  if (!node || !node.$) return null;
  return node.$[attrName] || null;
}

// Busca todos los nodos que tienen un atributo ArticuloID (o que se llamen Articulo)
function findAllArticulos(obj: any): any[] {
  const results: any[] = [];
  if (!obj) return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findAllArticulos(item));
    }
    return results;
  }

  if (typeof obj === 'object') {
    // Si el objeto tiene un atributo ArticuloID, es un artículo
    if (obj.$ && obj.$['ArticuloID'] !== undefined) {
      results.push(obj);
    }
    // Si el objeto tiene una clave 'Articulo', extraer su valor (puede ser array u objeto)
    if (obj['Articulo']) {
      const articulos = Array.isArray(obj['Articulo']) ? obj['Articulo'] : [obj['Articulo']];
      for (const art of articulos) {
        if (art.$ && art.$['ArticuloID'] !== undefined) {
          results.push(art);
        } else {
          // Si no tiene ArticuloID, buscar recursivamente dentro de art
          results.push(...findAllArticulos(art));
        }
      }
    }
    // Buscar recursivamente en todas las propiedades
    for (const key of Object.keys(obj)) {
      if (key !== 'Articulo' && obj[key] && typeof obj[key] === 'object') {
        results.push(...findAllArticulos(obj[key]));
      }
    }
  }
  return results;
}

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    const atributosXML = atributos.map(attr => 
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

    const articulos = findAllArticulos(result);
    
    if (articulos.length === 0) {
      console.error('❌ Estructura completa del resultado:', JSON.stringify(result, null, 2));
      throw new Error('No se encontraron artículos en la respuesta');
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
          pesoembaladounidadmedidastock: parseFloat(getAttr(item, 'PesoEmbaladoPorUnidadDeMedidaDeStock') || '0'),
          cantidadunidadmedidastockbulto: parseFloat(getAttr(item, 'CantidadPorUnidadDeMedidaDeStockPorBulto') || '0'),
          unidadmedidahomogeneastock: getAttr(item, 'UnidadDeMedidaHomogeneaDeStock'),
          factordeconversionunidadmedidahomogeneastock: parseFloat(getAttr(item, 'FactorDeConversionUnidadDeMedidaHomogeneaDeStock') || '0'),
          cuentadeactivo: getAttr(item, 'CuentaDeActivo'),
          seproduce: parseBooleano(getAttr(item, 'SeProduce')),
          mododeconsumodecomponentes: getAttr(item, 'ModoDeConsumoDeComponentes'),
          modalidadestockminimo: getAttr(item, 'ModalidadDeStockMinimo'),
          stockminimoparamodalidadcantidadfija: parseFloat(getAttr(item, 'StockMinimoParaModalidadPorCantidadFija') || '0'),
          administrapreciopromedioponderado: parseBooleano(getAttr(item, 'AdministraPrecioPromedioPonderado')),
          ajustacantidadesumstockcalculadasporsistema: parseBooleano(getAttr(item, 'AjustaCantidadesEnUMDeStockCalculadasPorElSistema')),
          porcentajemaximoajustecantidadumstock: parseFloat(getAttr(item, 'PorcentajeMaximoDeAjusteDeCantidadEnUMDeStock') || '0'),
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
          factordeconversioncot: parseFloat(getAttr(item, 'FactorDeConversionCOT') || '0'),
          volumenembaladounidadmedidastock: parseFloat(getAttr(item, 'VolumenEmbaladoPorUnidadDeMedidaDeStock') || '0'),
          unidadmedidaparadimensionesarticulo: getAttr(item, 'UnidadDeMedidaParaDimensionesDelArticulo'),
          largo: parseFloat(getAttr(item, 'Largo') || '0'),
          ancho: parseFloat(getAttr(item, 'Ancho') || '0'),
          alto: parseFloat(getAttr(item, 'Alto') || '0'),
          bloqueadoparaventa: parseBooleano(getAttr(item, 'BloqueadoParaVenta')),
          fechadebajaparaventas: parseFecha(getAttr(item, 'FechaDeBajaParaVentas')),
        };

        const columns = Object.keys(articulo);
        const values = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateSet = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

        const query = `
          INSERT INTO productos (${columns.join(', ')})
          VALUES (${values})
          ON CONFLICT (articuloid) DO UPDATE SET
            ${updateSet},
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        // ✅ CORREGIDO: usar sql.query en lugar de sql()
        await sql.query(query, Object.values(articulo));

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
