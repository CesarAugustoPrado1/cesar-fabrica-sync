// scripts/sync-erp.ts
import { syncNotasDePedido } from '../lib/sync-notas-pedido';
// 👇 Importo las funciones correctas de los archivos que ya tienes
import { syncProductos } from '../lib/sync-productos'; // Asumo que la función se llama syncProductos
import { syncClientes } from '../lib/sync-clientes';   // Asumo que la función se llama syncClientes

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================
async function main() {
  console.log('🚀 Iniciando sincronización ERP → Neon...');
  console.log(`📅 ${new Date().toLocaleString()}`);

  try {
    // 1. Sincronizar productos
    await syncProductos();

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
