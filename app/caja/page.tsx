"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Producto = {
  id: number;
  nombre_producto: string;
  precio: number;
};

type Item = {
  producto: Producto;
  cantidad: number;
};

export default function CajaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedido, setPedido] = useState<Item[]>([]);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [cliente, setCliente] = useState("");
  const [loading, setLoading] = useState(false);
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    fetch("/api/productos")
      .then((res) => res.json())
      .then((data) => setProductos(data.data || []));

    // 🔥 fecha actual
    const ahora = new Date();
    setFecha(ahora.toLocaleString());
  }, []);

  function agregarProducto(producto: Producto) {
    setPedido((prev) => {
      const existe = prev.find((p) => p.producto.id === producto.id);

      if (existe) {
        return prev.map((p) =>
          p.producto.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        );
      }

      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(id: number, delta: number) {
    setPedido((prev) =>
      prev
        .map((p) =>
          p.producto.id === id
            ? { ...p, cantidad: p.cantidad + delta }
            : p
        )
        .filter((p) => p.cantidad > 0)
    );
  }

  const total = pedido.reduce(
    (acc, item) => acc + item.cantidad * item.producto.precio,
    0
  );

  async function finalizarPedido() {
    if (pedido.length === 0) {
      alert("Agregar productos");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/crear-pedido", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          carrito_id: 5,
          nombre: cliente || "Cliente Mostrador",
          productos: pedido.map((item) => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
          })),
        }),
      });

      const data = await res.json();

      // 🔥 VALIDACIÓN REAL
      if (!res.ok || !data.pedido_id) {
        console.error("ERROR BACKEND:", data);
        alert(data.error || "Error al crear pedido");
        setLoading(false);
        return;
      }

      // ✅ Pedido OK
      setPedidoId(data.pedido_id);

      setPedido([]);
      setCliente("");

      // limpiar QR después de 10s
      setTimeout(() => {
        setPedidoId(null);
      }, 10000);

    } catch (err) {
      console.error("ERROR GENERAL:", err);
      alert("Error de conexión");
    }

    setLoading(false);
  }

  function nuevoPedido() {
    setPedido([]);
    setPedidoId(null);
    setCliente("");
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* PRODUCTOS */}
      <div
        style={{
          flex: 2,
          padding: 20,
          backgroundColor: "#f4f6f8",
          overflowY: "auto",
          fontSize: 25,
          fontWeight: "bold",
        }}
      >
        <h2>Productos</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 15,
            fontSize: 16,
          }}
        >
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => agregarProducto(p)}
              style={{
                padding: 20,
                borderRadius: 12,
                border: "none",
                backgroundColor: "white",
                boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: "bold",
              }}
            >
              <div>{p.nombre_producto}</div>
              <div>${p.precio}</div>
            </button>
          ))}
        </div>
      </div>

      {/* PEDIDO */}
      <div
        style={{
          flex: 1,
          padding: 20,
          borderLeft: "2px solid #ddd",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2>Pedido</h2>

        {/* 🔥 FECHA */}
        <p style={{ fontSize: 14, color: "#666" }}>
          🕒 {fecha}
        </p>

        {/* CLIENTE */}
        <input
          placeholder="Nombre del cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          style={{
            padding: 10,
            marginBottom: 15,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {pedido.length === 0 && <p>Sin productos</p>}

          {pedido.map((item) => (
            <div
              key={item.producto.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <span>{item.producto.nombre_producto}</span>

              <div>
                <button onClick={() => cambiarCantidad(item.producto.id, -1)}>
                  -
                </button>

                <span style={{ margin: "0 10px" }}>
                  {item.cantidad}
                </span>

                <button onClick={() => cambiarCantidad(item.producto.id, 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2>Total: ${total}</h2>

        {/* BOTÓN FINALIZAR */}
        <button
          onClick={finalizarPedido}
          disabled={loading}
          style={{
            padding: 18,
            backgroundColor: loading ? "#999" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 18,
            cursor: "pointer",
            marginTop: 10,
          }}
        >
          {loading ? "Procesando..." : "Finalizar pedido"}
        </button>

        <button
          onClick={nuevoPedido}
          style={{
            padding: 12,
            marginTop: 10,
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Cancelar / Nuevo pedido
        </button>

        {/* QR */}
        {pedidoId && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <h3>Pedido #{pedidoId}</h3>

            <QRCodeCanvas
              value={`${window.location.origin}/pedidos/${pedidoId}`}
              size={180}
            />

            <p>Mostrar QR al cliente</p>
          </div>
        )}
      </div>
    </div>
  );
}