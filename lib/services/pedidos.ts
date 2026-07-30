import { sql } from '../db';
import type { PedidoDetalle, PedidoLegacyShape, PedidoListItem, PedidoResponse } from '../types';

export type { PedidoDetalle, PedidoLegacyShape, PedidoListItem, PedidoResponse } from '../types';

export type PedidoId = {
  division: number;
  tipo: string;
  numero: number;
};

export function parsePedidoId(rawId: string): PedidoId | null {
  if (rawId.includes('-')) {
    const partes = rawId.split('-');
    if (partes.length !== 3) return null;

    const division = parseInt(partes[0], 10);
    const tipo = partes[1];
    const numero = parseInt(partes[2], 10);

    if (Number.isNaN(division) || Number.isNaN(numero) || !tipo) return null;
    return { division, tipo, numero };
  }

  const numero = parseInt(rawId, 10);
  if (Number.isNaN(numero)) return null;
  return { division: 0, tipo: '', numero };
}

function formatPedidoId(division: number, tipo: string, numero: number) {
  return `${division}-${tipo}-${numero}`;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function toPedidoLegacyShape(pedido: PedidoResponse): PedidoLegacyShape {
  return {
    pedido: {
      cabecera: {
        division: pedido.division,
        tipo: pedido.tipo,
        numero: pedido.numero,
        fecha_emision: pedido.fechaEmision,
        fecha_alta: pedido.fechaAlta,
        estado_aprobacion: pedido.estadoErp,
        moneda: pedido.moneda,
        condicion_pago: pedido.condicionPago,
        importe_total: pedido.importeTotal,
        observacion: pedido.observacion,
      },
      cliente: {
        id: pedido.cliente.id,
        nombre: pedido.cliente.nombre,
        telefono: pedido.cliente.telefono,
        email: pedido.cliente.email,
      },
      detalles: pedido.items.map((item) => ({
        renglon: item.renglon,
        articulo: {
          id: item.articulo.id,
          codigo: item.articulo.codigo,
          nombre: item.articulo.nombre,
          precio: item.articulo.precio,
        },
        cantidad_pedida: item.cantidadPedida,
        precio_neto: item.precioNeto,
        unidad_medida: item.unidadMedida,
        subtotal: item.subtotal,
      })),
      resumen: {
        total_items: pedido.totals.totalItems,
        importe_total: pedido.totals.importeTotal,
      },
    },
  };
}

async function getEstadoOperativo(division: number, tipo: string, numero: number) {
  try {
    const rows = await sql`
      SELECT estado_operativo
      FROM platform_pedido_estado
      WHERE division = ${division}
        AND tipo = ${tipo}
        AND numero = ${numero}
    `;

    return rows[0]?.estado_operativo ?? 'pendiente';
  } catch {
    return 'pendiente';
  }
}

async function fetchDetalles(division: number, tipo: string, numero: number) {
  return sql`
    SELECT
      d.*,
      p.nombre AS producto_nombre,
      p.articuloid AS producto_codigo,
      p.precio AS producto_precio
    FROM notas_pedido_detalle d
    LEFT JOIN productos p ON d.articulo_id = p.id
    WHERE d.division = ${division}
      AND d.tipo = ${tipo}
      AND d.numero = ${numero}
    ORDER BY d.renglon ASC
  `;
}

function mapDetalles(detalles: Array<Record<string, unknown>>): PedidoDetalle[] {
  return detalles.map((d) => ({
    renglon: Number(d.renglon ?? 0),
    articulo: {
      id: (d.articulo_id as number | null) ?? null,
      codigo: (d.producto_codigo as string | null) ?? null,
      nombre: (d.producto_nombre as string | null) ?? null,
      precio: (d.producto_precio as number | null) ?? null,
    },
    cantidadPedida: (d.cantidad_pedida as number | null) ?? null,
    precioNeto: (d.precio_neto as number | null) ?? null,
    unidadMedida: (d.unidad_medida as string | null) ?? null,
    subtotal: ((d.cantidad_pedida as number | null) || 0) * ((d.precio_neto as number | null) || 0),
  }));
}

async function buildPedidoResponse(cabecera: Record<string, unknown>): Promise<PedidoResponse> {
  const detalles = await fetchDetalles(
    cabecera.division,
    cabecera.tipo,
    cabecera.numero
  );

  const estadoOperativo = await getEstadoOperativo(
    cabecera.division,
    cabecera.tipo,
    cabecera.numero
  );

  return {
    id: formatPedidoId(
      Number(cabecera.division),
      String(cabecera.tipo ?? ''),
      Number(cabecera.numero)
    ),
    division: Number(cabecera.division),
    tipo: String(cabecera.tipo ?? ''),
    numero: Number(cabecera.numero),
    fechaEmision: toIso(cabecera.fecha_emision),
    fechaAlta: toIso(cabecera.fecha_alta),
    estadoErp: (cabecera.estado_aprobacion as string | null) ?? null,
    estadoOperativo,
    moneda: (cabecera.moneda as string | null) ?? null,
    condicionPago: (cabecera.condicion_pago as string | null) ?? null,
    importeTotal: (cabecera.importe_total as number | null) ?? null,
    observacion: (cabecera.observacion as string | null) ?? null,
    cliente: {
      id: (cabecera.cliente_id as number | null) ?? null,
      nombre: (cabecera.cliente_nombre as string | null) ?? null,
      telefono: (cabecera.cliente_telefono as string | null) ?? null,
      email: (cabecera.cliente_email as string | null) ?? null,
    },
    items: mapDetalles(detalles),
    totals: {
      totalItems: detalles.length,
      importeTotal: (cabecera.importe_total as number | null) ?? null,
    },
  };
}

export async function getPedidoById(rawId: string) {
  const parsed = parsePedidoId(rawId);
  if (!parsed) {
    return { type: 'invalid' as const };
  }

  if (parsed.division > 0 && parsed.tipo) {
    const cabeceraResult = await sql`
      SELECT
        c.*,
        cl.nombre AS cliente_nombre,
        cl.telefono AS cliente_telefono,
        cl.email AS cliente_email
      FROM notas_pedido_cabecera c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.division = ${parsed.division}
        AND c.tipo = ${parsed.tipo}
        AND c.numero = ${parsed.numero}
    `;

    if (cabeceraResult.length === 0) {
      return { type: 'not_found' as const };
    }

    return {
      type: 'single' as const,
      pedido: await buildPedidoResponse(cabeceraResult[0]),
    };
  }

  const pedidos = await sql`
    SELECT
      c.division,
      c.tipo,
      c.numero,
      c.fecha_emision,
      c.importe_total,
      c.cliente_id,
      cl.nombre AS cliente_nombre
    FROM notas_pedido_cabecera c
    LEFT JOIN clientes cl ON c.cliente_id = cl.id
    WHERE c.numero = ${parsed.numero}
    ORDER BY c.division, c.tipo
  `;

  if (pedidos.length === 0) {
    return { type: 'not_found' as const };
  }

  if (pedidos.length > 1) {
    return {
      type: 'multiple' as const,
      pedidos: pedidos.map((p: Record<string, unknown>) => ({
        id: formatPedidoId(Number(p.division), String(p.tipo ?? ''), Number(p.numero)),
        division: Number(p.division),
        tipo: String(p.tipo ?? ''),
        numero: Number(p.numero),
        fechaEmision: toIso(p.fecha_emision),
        cliente: (p.cliente_nombre as string | null) ?? null,
        clienteId: (p.cliente_id as number | null) ?? null,
        importeTotal: (p.importe_total as number | null) ?? null,
      })),
    };
  }

  const cabecera = await sql`
    SELECT
      c.*,
      cl.nombre AS cliente_nombre,
      cl.telefono AS cliente_telefono,
      cl.email AS cliente_email
    FROM notas_pedido_cabecera c
    LEFT JOIN clientes cl ON c.cliente_id = cl.id
    WHERE c.division = ${pedidos[0].division}
      AND c.tipo = ${pedidos[0].tipo}
      AND c.numero = ${pedidos[0].numero}
  `;

  return {
    type: 'single' as const,
    pedido: await buildPedidoResponse(cabecera[0]),
  };
}

export async function updateEstadoOperativo(input: {
  division: number;
  tipo: string;
  numero: number;
  estadoOperativo: string;
  notas?: string | null;
  actualizadoPor?: string | null;
}) {
  const exists = await sql`
    SELECT 1
    FROM notas_pedido_cabecera
    WHERE division = ${input.division}
      AND tipo = ${input.tipo}
      AND numero = ${input.numero}
    LIMIT 1
  `;

  if (exists.length === 0) {
    return { type: 'not_found' as const };
  }

  await sql`
    INSERT INTO platform_pedido_estado (
      division,
      tipo,
      numero,
      estado_operativo,
      notas,
      actualizado_por,
      updated_at
    ) VALUES (
      ${input.division},
      ${input.tipo},
      ${input.numero},
      ${input.estadoOperativo},
      ${input.notas ?? null},
      ${input.actualizadoPor ?? null},
      NOW()
    )
    ON CONFLICT (division, tipo, numero) DO UPDATE SET
      estado_operativo = EXCLUDED.estado_operativo,
      notas = EXCLUDED.notas,
      actualizado_por = EXCLUDED.actualizado_por,
      updated_at = NOW()
  `;

  return {
    type: 'updated' as const,
    id: formatPedidoId(input.division, input.tipo, input.numero),
    estadoOperativo: input.estadoOperativo,
  };
}

export async function listProductos(limit = 20, offset = 0) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);

  const products = await sql`
    SELECT *
    FROM productos
    ORDER BY nombre ASC
    LIMIT ${safeLimit}
    OFFSET ${safeOffset}
  `;

  const countResult = await sql`
    SELECT COUNT(*)::text AS count FROM productos
  `;

  return {
    items: products,
    total: parseInt(countResult[0]?.count ?? '0', 10),
    limit: safeLimit,
    offset: safeOffset,
  };
}
