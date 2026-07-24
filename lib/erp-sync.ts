// ... (todo lo demás igual hasta syncProductos)

export async function syncProductos() {
  console.log('🔄 Iniciando sincronización de artículos...');

  try {
    // Lista de atributos: mínimos + clasificaciones + nombres de clasificaciones
    const atributos = [
      // --- Mínimos (ya funcionaban) ---
      'ArticuloID',
      'Nombre',
      'Descripcion',
      'UnidadDeMedidaDeStock',
      'SeVende',
      'SeCompra',
      'FechaDeAlta',
      'FechaUltActualizacion',

      // --- Clasificaciones y nombres (NUEVO) ---
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
    ];

    const atributosXML = atributos.map(attr => 
      `<ArticuloAtributos>${attr}</ArticuloAtributos>`
    ).join('');

    // XML con Filtros vacío (ya funcionaba)
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

    // ... (el resto del parseo y procesamiento es igual, solo cambia el mapeo)

    let articulos: any[] = [];
    // ... (mismo código para extraer articulos)

    console.log(`📦 Artículos obtenidos del ERP: ${articulos.length}`);

    let procesados = 0;
    let errores = 0;

    for (const item of articulos) {
      try {
        const articulo = {
          // --- Mínimos ---
          articuloid: parseInt(getTextFromNode(item, 'ArticuloID') || '0'),
          nombre: getTextFromNode(item, 'Nombre'),
          descripcion: getTextFromNode(item, 'Descripcion'),
          unidadmedidastock: getTextFromNode(item, 'UnidadDeMedidaDeStock'),
          sevende: parseBooleano(getTextFromNode(item, 'SeVende')),
          secompra: parseBooleano(getTextFromNode(item, 'SeCompra')),
          fechadealta: parseFecha(getTextFromNode(item, 'FechaDeAlta')),
          fechaultactualizacion: parseFecha(getTextFromNode(item, 'FechaUltActualizacion')),

          // --- Clasificaciones y nombres (NUEVO) ---
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
        };

        // --- Query SQL con las nuevas columnas ---
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
            ultima_sincronizacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24,
            $25, $26, $27, $28, $29, $30, $31, $32,
            $33, $34, $35, $36, $37, $38, $39, $40,
            CURRENT_TIMESTAMP)
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
            ultima_sincronizacion = CURRENT_TIMESTAMP
        `;

        // Los parámetros son 40: 8 mínimos + 32 de clasificaciones (16 códigos + 16 nombres)
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

// ... (syncAll se mantiene igual)
