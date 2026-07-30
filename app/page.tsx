'use client';

import { useState } from 'react';
import type { PedidoLegacyShape } from '@/lib/types';

export default function Home() {
  const [numero, setNumero] = useState('');
  const [pedido, setPedido] = useState<PedidoLegacyShape | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const buscarPedido = async () => {
    if (!numero.trim()) {
      setError('Ingrese un número de pedido');
      return;
    }

    setCargando(true);
    setError('');
    setPedido(null);

    try {
      const res = await fetch(`/api/pedido/${encodeURIComponent(numero)}`);
      if (!res.ok) {
        const data = await res.json();
        const message =
          (typeof data?.error === 'string' && data.error) ||
          data?.error?.message ||
          data?.detalle ||
          'Pedido no encontrado';
        setError(message);
        return;
      }

      const data = await res.json();
      setPedido(data);
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (valor: string | null) => {
    if (!valor) return 'N/A';
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? 'N/A' : fecha.toLocaleDateString('es-AR');
  };

  const formatearValor = (valor: unknown) => {
    if (valor === null || valor === undefined || valor === '') return 'N/A';
    return String(valor);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold">📦 Consulta de pedidos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Busca un pedido por número y revisa su cabecera, cliente y detalle.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej: 1-NPA-28115"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 outline-none ring-0 focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && buscarPedido()}
            />
            <button
              onClick={buscarPedido}
              disabled={cargando}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}
        </section>

        {pedido && (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">
                Pedido {pedido.pedido.cabecera.division}-{pedido.pedido.cabecera.tipo}-{pedido.pedido.cabecera.numero}
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <p><span className="font-medium">Fecha emisión:</span> {formatearFecha(pedido.pedido.cabecera.fecha_emision)}</p>
                <p><span className="font-medium">Fecha alta:</span> {formatearFecha(pedido.pedido.cabecera.fecha_alta)}</p>
                <p><span className="font-medium">Estado:</span> {formatearValor(pedido.pedido.cabecera.estado_aprobacion)}</p>
                <p><span className="font-medium">Moneda:</span> {formatearValor(pedido.pedido.cabecera.moneda)}</p>
                <p><span className="font-medium">Condición pago:</span> {formatearValor(pedido.pedido.cabecera.condicion_pago)}</p>
                <p><span className="font-medium">Importe total:</span> {formatearValor(pedido.pedido.resumen.importe_total)}</p>
              </div>
              {pedido.pedido.cabecera.observacion && (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-medium">Observación:</span> {pedido.pedido.cabecera.observacion}
                </p>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">👤 Cliente</h3>
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="font-medium">ID:</span> {formatearValor(pedido.pedido.cliente.id)}</p>
                <p><span className="font-medium">Nombre:</span> {formatearValor(pedido.pedido.cliente.nombre)}</p>
                {pedido.pedido.cliente.telefono && <p><span className="font-medium">Teléfono:</span> {pedido.pedido.cliente.telefono}</p>}
                {pedido.pedido.cliente.email && <p><span className="font-medium">Email:</span> {pedido.pedido.cliente.email}</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">📋 Detalles ({pedido.pedido.resumen.total_items} ítems)</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-500">Renglón</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-500">Producto</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-500">Código</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Cantidad</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Precio</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pedido.pedido.detalles.map((d) => (
                      <tr key={d.renglon}>
                        <td className="px-4 py-2 text-sm">{d.renglon}</td>
                        <td className="px-4 py-2 text-sm">{formatearValor(d.articulo.nombre)}</td>
                        <td className="px-4 py-2 text-sm">{formatearValor(d.articulo.codigo)}</td>
                        <td className="px-4 py-2 text-right text-sm">{formatearValor(d.cantidad_pedida)}</td>
                        <td className="px-4 py-2 text-right text-sm">{formatearValor(d.precio_neto)}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium">{formatearValor(d.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
