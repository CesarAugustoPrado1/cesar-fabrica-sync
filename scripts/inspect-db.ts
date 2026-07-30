import { sql } from '../lib/db';

async function main() {
  const count = await sql`SELECT COUNT(*)::int AS cnt FROM notas_pedido_cabecera`;
  console.log('count', count[0]);

  const sample = await sql`
    SELECT division, tipo, numero, fecha_emision, cliente_id, importe_total
    FROM notas_pedido_cabecera
    ORDER BY numero DESC
    LIMIT 10
  `;
  console.log('sample pedidos', JSON.stringify(sample, null, 2));

  const productosCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'productos'
    ORDER BY ordinal_position
  `;
  console.log('productos columns', JSON.stringify(productosCols, null, 2));

  const detalleCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'notas_pedido_detalle'
    ORDER BY ordinal_position
  `;
  console.log('detalle columns', JSON.stringify(detalleCols, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
