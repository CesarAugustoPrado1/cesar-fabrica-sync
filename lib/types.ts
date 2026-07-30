export interface PedidoDetalle {
  renglon: number;
  articulo: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
    precio: number | null;
  };
  cantidadPedida: number | null;
  precioNeto: number | null;
  unidadMedida: string | null;
  subtotal: number;
}

export interface PedidoCliente {
  id: number | null;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
}

export interface PedidoResponse {
  id: string;
  division: number;
  tipo: string;
  numero: number;
  fechaEmision: string | null;
  fechaAlta: string | null;
  estadoErp: string | null;
  estadoOperativo: string;
  moneda: string | null;
  condicionPago: string | null;
  importeTotal: number | null;
  observacion: string | null;
  cliente: PedidoCliente;
  items: PedidoDetalle[];
  totals: {
    totalItems: number;
    importeTotal: number | null;
  };
}

export interface PedidoListItem {
  id: string;
  division: number;
  tipo: string;
  numero: number;
  fechaEmision: string | null;
  cliente: string | null;
  clienteId: number | null;
  importeTotal: number | null;
}

export interface PedidoLegacyShape {
  pedido: {
    cabecera: {
      division: number;
      tipo: string;
      numero: number;
      fecha_emision: string | null;
      fecha_alta: string | null;
      estado_aprobacion: string | null;
      moneda: string | null;
      condicion_pago: string | null;
      importe_total: number | null;
      observacion: string | null;
    };
    cliente: {
      id: number | null;
      nombre: string | null;
      telefono: string | null;
      email: string | null;
    };
    detalles: Array<{
      renglon: number;
      articulo: {
        id: number | null;
        codigo: string | null;
        nombre: string | null;
        precio: number | null;
      };
      cantidad_pedida: number | null;
      precio_neto: number | null;
      unidad_medida: string | null;
      subtotal: number;
    }>;
    resumen: {
      total_items: number;
      importe_total: number | null;
    };
  };
}

export interface ApiMeta {
  version: string;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  error: {
    message: string;
    code: string;
  };
  meta: ApiMeta;
}

export interface SyncResult {
  procesados: number;
  errores: number;
}
