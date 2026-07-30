import { syncProductos } from '../sync-productos';
import { syncClientes } from '../sync-clientes';
import { syncNotasDePedido } from '../sync-notas-pedido';
import { syncNotasPedidoDetalle } from '../sync-notas-pedido-detalle';
import type { SyncTask } from './runner';

export const syncTasks: SyncTask[] = [
  {
    entity: 'productos',
    run: () => syncProductos(),
  },
  {
    entity: 'clientes',
    run: () => syncClientes(),
  },
  {
    entity: 'notas_pedido',
    run: () => syncNotasDePedido(),
  },
  {
    entity: 'notas_pedido_detalle',
    run: () => syncNotasPedidoDetalle(),
  },
];
