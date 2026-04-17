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
  const [esMobil, setEsMobil] = useState(false);

  useEffect(() => {
    const check = () => setEsMobil(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/productos")
      .then((res) => res.json())
      .then((data) => setProductos(data.data || []));
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
    if (pedido.length === 0) return alert("Agregar productos");

    const res = await fetch("/api/crear-pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    setPedidoId(data.pedido_id);
    setPedido([]);
    setCliente("");

    setTimeout(() => {
      setPedidoId(null);
    }, 10000);
  }

  function nuevoPedido() {
    setPedido([]);
    setPedidoId(null);
    setCliente("");
  }

  return (
    <div style={{
      display: "flex",
      height: esMobil ? "auto" : "100vh",
      minHeight: "100vh",
      flexDirection: esMobil ? "column" : "row",
    }}>

      {/* PRODUCTOS */}
      <div style={{
        flex: 2,
        padding: 20,
        backgroundColor: "#f4f6f8",
        overflowY: "auto",
        fontSize: 22,
        fontWeight: 700,
        minWidth: 0,
        color: "#111827",
      }}>
        <h2 style={{ color: "#000", fontWeight: 700 }}>Productos</h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 15,
          fontSize: 16,
        }}>
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => agregarProducto(p)}
              style={{
                padding: 20,
                borderRadius: 12,
                border: "none",
                backgroundColor: "#ffffff",
                color: "#111827",
                boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              <div>{p.nombre_producto}</div>
              <div style={{ marginTop: 5 }}>${p.precio}</div>
            </button>
          ))}
        </div>
      </div>

      {/* PEDIDO */}
      <div style={{
        flex: 1,
        padding: 20,
        borderLeft: esMobil ? "none" : "2px solid #e5e7eb",
        borderTop: esMobil ? "2px solid #e5e7eb" : "none",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        color: "#111827",
      }}>
        <h2 style={{ color: "#000", fontWeight: 700 }}>Pedido</h2>

        {/* CLIENTE */}
        <input
          placeholder="Nombre del cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          style={{
            padding: 12,
            marginBottom: 15,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontWeight: 500,
            color: "#111827",
            backgroundColor: "#ffffff",
          }}
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {pedido.length === 0 && (
            <p style={{ color: "#111827" }}>Sin productos</p>
          )}

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
              <span style={{ fontWeight: 600 }}>
                {item.producto.nombre_producto}
              </span>

              <div>
                <button
                  onClick={() => cambiarCantidad(item.producto.id, -1)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: "#e5e7eb",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  -
                </button>

                <span style={{
                  margin: "0 10px",
                  fontSize: 18,
                  fontWeight: 600,
                }}>
                  {item.cantidad}
                </span>

                <button
                  onClick={() => cambiarCantidad(item.producto.id, 1)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: "#e5e7eb",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontWeight: 700, color: "#000" }}>
          Total: ${total}
        </h2>

        <button
          onClick={finalizarPedido}
          style={{
            padding: 18,
            backgroundColor: "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            marginTop: 10,
          }}
        >
          Finalizar pedido
        </button>

        <button
          onClick={nuevoPedido}
          style={{
            padding: 12,
            marginTop: 10,
            backgroundColor: "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cancelar / Nuevo pedido
        </button>

        {pedidoId && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <h3 style={{ color: "#000", fontWeight: 700 }}>
              Pedido #{pedidoId}
            </h3>

            <QRCodeCanvas
              value={`${window.location.origin}/pedidos/${pedidoId}`}
              size={180}
            />

            <p style={{ color: "#111827", fontWeight: 500 }}>
              Mostrar QR al cliente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}