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
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

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

  const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
  const empresaId = await getEmpresaUsuario();

  if (!empresaId) return alert("No se encontró empresa");

  const res = await fetch("/api/crear-pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      empresa_id: empresaId,
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
  setTimeout(() => setPedidoId(null), 10000);
}

  function nuevoPedido() {
    setPedido([]);
    setPedidoId(null);
    setCliente("");
  }

  async function descargarReporte() {
  if (!fechaInicio || !fechaFin) {
    alert("Seleccionar fechas");
    return;
  }

  try {
    // Obtener empresa del usuario actual
    const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
    const empresaId = await getEmpresaUsuario();

    if (!empresaId) {
      alert("No se encontró empresa");
      return;
    }

    const res = await fetch(
      `/api/reporte?inicio=${fechaInicio}&fin=${fechaFin}&empresaId=${empresaId}`
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error reporte:", errorText);
      alert("Error al generar el reporte");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "informe_ventas.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("ERROR DESCARGA:", error);
    alert("Error descargando PDF");
  }
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
        <h2 style={{ color: "#000", fontWeight: 700, marginBottom: 15 }}>Productos</h2>

        {/* REPORTE PDF */}
        <div style={{ display: "flex", gap: 10, marginBottom: 15, flexWrap: "wrap" }}>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#111827",
            }}
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#111827",
            }}
          />
          <button
            onClick={descargarReporte}
            style={{
              padding: "10px 16px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            📄 Descargar PDF
          </button>
        </div>

        {/* GRID PRODUCTOS */}
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
              <div style={{ marginTop: 5, color: "#16a34a" }}>${p.precio}</div>
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
        backgroundColor: "#ffffff",
      }}>
        <h2 style={{ color: "#000", fontWeight: 700, marginBottom: 15 }}>Pedido</h2>

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
            fontSize: 15,
          }}
        />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {pedido.length === 0 && (
            <p style={{ color: "#6b7280" }}>Sin productos</p>
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
              <span style={{ fontWeight: 600, color: "#111827" }}>
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
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >-</button>
                <span style={{ margin: "0 10px", fontSize: 18, fontWeight: 600, color: "#111827" }}>
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
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >+</button>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontWeight: 700, color: "#000", marginBottom: 10 }}>
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
            fontSize: 15,
          }}
        >
          Cancelar / Nuevo pedido
        </button>

        {pedidoId && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <h3 style={{ color: "#000", fontWeight: 700 }}>Pedido #{pedidoId}</h3>
            <QRCodeCanvas
              value={`${window.location.origin}/pedidos/${pedidoId}`}
              size={180}
            />
            <p style={{ color: "#111827", fontWeight: 500 }}>Mostrar QR al cliente</p>
          </div>
        )}
      </div>
    </div>
  );
}