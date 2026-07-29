import { syncProductos } from '../lib/sync-productos';
import { syncClientes } from '../lib/sync-clientes';
import { syncNotasDePedido } from '../lib/sync-notas-pedido';
import { syncNotasPedidoDetalle } from '../lib/sync-notas-pedido-detalle';

export async function syncAll() {
  await syncProductos();
  await syncClientes();
  await syncNotasDePedidoDetalle();
}
