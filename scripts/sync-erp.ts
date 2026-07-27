// scripts/sync-erp.ts
import { syncNotasDePedido } from '../lib/sync-notas-pedido';
import { syncNotasPedidoDetalle } from '../lib/sync-notas-pedido-detalle'; // 👈 NUEVA
import { syncProductos } from '../lib/sync-productos';
import { syncClientes } from '../lib/sync-clientes';

async function main() {
  console.log('🚀 Iniciando sincronización ERP → Neon...');
  console.log(`📅 ${new Date().toLocaleString()}`);

  try {
    await syncProductos();
    await syncClientes();
    await syncNotasDePedido();
    await syncNotasPedidoDetalle(); // 👈 NUEVA
    console.log('✅ Sincronización completada exitosamente.');
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    process.exit(1);
  }
}

main();
