// scripts/sync-erp.ts
import { syncNotasDePedido } from '../lib/sync-notas-pedido';
import { syncArticulos } from '../lib/sync-articulos'; // Asumo que existe
import { syncClientes } from '../lib/sync-clientes';   // Asumo que existe

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================
async function main() {
  console.log('🚀 Iniciando sincronización ERP → Neon...');
  console.log(`📅 ${new Date().toLocaleString()}`);

  try {
    // 1. Sincronizar productos
    await syncArticulos();

    // 2. Sincronizar clientes
    await syncClientes();

    // 3. Sincronizar notas de pedido
    await syncNotasDePedido();

    console.log('✅ Sincronización completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    process.exit(1);
  }
}

main();
