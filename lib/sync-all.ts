import { syncProductos } from './sync-productos';
import { syncClientes } from './sync-clientes';
import { syncNotasDePedido } from './sync-notas-pedido';

export async function syncAll() {
    await syncProductos();
    await syncClientes();
    await syncNotasDePedido();
}
