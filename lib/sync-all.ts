import { syncProductos } from './sync-productos';
import { syncClientes } from './sync-clientes';

export async function syncAll() {
  await syncProductos();
  await syncClientes();
}
