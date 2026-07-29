'use client';

import { useState } from 'react';

interface PedidoData {
  pedido: {
    cabecera: any;
    cliente: any;
    detalles: any[];
    resumen: any;
  };
}

export default function Home() {
  const [numero, setNumero] = useState('');
  const [pedido, setPedido] = useState<PedidoData | null>(null);
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
        setError(data.error || 'Pedido no encontrado');
        return;
      }
      const data = await res.json();
      setPedido(data);
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        📦 Consulta de Pedido
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Ej: 1-NPA-28115"
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && buscarPedido()}
        />
        <button
          onClick={buscarPedido}
          disabled={cargando}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {pedido && (
        <div className="space-y-6">
          {/* Cabecera */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">
              Pedido {pedido.pedido.cabecera.division}-{pedido.pedido.cabecera.tipo}-{pedido.pedido.cabecera.numero}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p><span className="font-medium">Fecha emisión:</span> {new Date(pedido.pedido.cabecera.fecha_emision).toLocaleDateString()}</p>
              <p><span className="font-medium">Fecha alta:</span> {new Date(pedido.pedido.cabecera.fecha_alta).toLocaleDateString()}</p>
              <p><span className="font-medium">Estado:</span> {pedido.pedido.cabecera.estado_aprobacion || 'N/A'}</p>
              <p><span className="font-medium">Moneda:</span> {pedido.pedido.cabecera.moneda || 'N/A'}</p>
              <p><span className="font-medium">Condición pago:</span> {pedido.pedido.cabecera.condicion_pago || 'N/A'}</p>
              <p><span className="font-medium">Importe total:</span> ${pedido.pedido.resumen.importe_total}</p>
            </div>
            {pedido.pedido.cabecera.observacion && (
              <p className="mt-2"><span className="font-medium">Observación:</span> {pedido.pedido.cabecera.observacion}</p>
            )}
          </div>

          {/* Cliente */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">👤 Cliente</h3>
            <p><span className="font-medium">ID:</span> {pedido.pedido.cliente.id}</p>
            <p><span className="font-medium">Nombre:</span> {pedido.pedido.cliente.nombre}</p>
            {pedido.pedido.cliente.telefono && <p><span className="font-medium">Teléfono:</span> {pedido.pedido.cliente.telefono}</p>}
            {pedido.pedido.cliente.email && <p><span className="font-medium">Email:</span> {pedido.pedido.cliente.email}</p>}
          </div>

          {/* Detalles */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">
              📋 Detalles ({pedido.pedido.resumen.total_items} ítems)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Renglón</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Producto</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Código</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Cantidad</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Precio</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedido.pedido.detalles.map((d) => (
                    <tr key={d.renglon}>
                      <td className="px-4 py-2 text-sm">{d.renglon}</td>
                      <td className="px-4 py-2 text-sm">{d.articulo.nombre}</td>
                      <td className="px-4 py-2 text-sm">{d.articulo.codigo || '-'}</td>
                      <td className="px-4 py-2 text-sm text-right">{d.cantidad_pedida}</td>
                      <td className="px-4 py-2 text-sm text-right">${d.precio_neto}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">${d.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
