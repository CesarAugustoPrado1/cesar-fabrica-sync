// scripts/sync-erp.ts
import { obtenerArticulosDesdeERP, guardarArticulosEnNeon } from '../lib/erp-sync';

// 🔥 La carga de variables de entorno se hace en lib/env.ts

async function main() {
  console.log('🚀 Iniciando sincronización ERP → Neon...');
  console.log(`📅 ${new Date().toLocaleString()}`);

  try {
    const articulos = await obtenerArticulosDesdeERP();
    await guardarArticulosEnNeon(articulos);
    console.log('✅ Sincronización completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    process.exit(1);
  }
}

main();