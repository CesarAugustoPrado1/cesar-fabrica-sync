// scripts/sync-erp.ts
import { requireEnv } from '../lib/env';
import { runFullSync } from '../lib/sync/runner';
import { syncTasks } from '../lib/sync/tasks';

requireEnv();

async function main() {
  console.log('🚀 Iniciando sincronización ERP → Neon...');
  console.log(`📅 ${new Date().toLocaleString()}`);

  try {
    const summary = await runFullSync(syncTasks);
    console.log('\n📊 Resumen final:', summary);
    console.log('✅ Sincronización completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    process.exit(1);
  }
}

main();
