import { syncAll } from '../lib/erp-sync';

async function main() {
  console.log('🚀 Iniciando sincronización ERP → Neon...');
  console.log(`📅 ${new Date().toLocaleString()}`);
  
  try {
    await syncAll();
    console.log('✅ Sincronización completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    process.exit(1);
  }
}

main();
