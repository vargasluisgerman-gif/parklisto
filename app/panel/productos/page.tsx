"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Producto = {
  id: number;
  nombre_producto: string;
  precio: number;
  activo: boolean;
};

type Carrito = {
  id: number;
  nombre_comercial: string;
};

export default function ProductosPage() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carritos, setCarritos] = useState<Carrito[]>([]);
  const [carritoSeleccionado, setCarritoSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCarritos();
  }, []);

  useEffect(() => {
    if (carritoSeleccionado) {
      cargarProductos(carritoSeleccionado);
    }
  }, [carritoSeleccionado]);

  async function cargarCarritos() {
    const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
    const empresaId = await getEmpresaUsuario();
    if (!empresaId) return;

    const { data } = await supabase
      .from("carritos")
      .select("id, nombre_comercial")
      .eq("empresa_id", empresaId)
      .eq("activo", true);

    if (data && data.length > 0) {
      setCarritos(data);
      setCarritoSeleccionado(data[0].id); // selecciona el primero por defecto
    }
    setLoading(false);
  }

  async function cargarProductos(carrito_id: number) {
    const res = await fetch(`/api/productos?carrito_id=${carrito_id}`);
    const json = await res.json();
    setProductos(json.data || []);
  }

  async function crearProducto() {
    if (!nombre || !precio) {
      alert("Completar nombre y precio");
      return;
    }

    if (!carritoSeleccionado) {
      alert("Seleccioná un carrito primero");
      return;
    }

    const res = await fetch("/api/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_producto: nombre,
        precio: Number(precio),
        carrito_id: carritoSeleccionado,
      }),
    });

    const nuevo = await res.json();

    if (nuevo?.data?.length > 0) {
      setProductos((prev) => [nuevo.data[0], ...prev]);
    } else {
      await cargarProductos(carritoSeleccionado);
    }

    setNombre("");
    setPrecio("");
  }

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Gestión de productos</h1>

      {/* SELECTOR DE CARRITO */}
      {carritos.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, marginRight: 10 }}>Carrito:</label>
          <select
            value={carritoSeleccionado ?? ""}
            onChange={(e) => setCarritoSeleccionado(Number(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {carritos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_comercial}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* FORM */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Nombre producto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ display: "block", marginBottom: 10, padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", width: 250 }}
        />
        <input
          placeholder="Precio"
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          style={{ display: "block", marginBottom: 10, padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", width: 250 }}
        />
        <button
          onClick={crearProducto}
          style={{
            padding: "8px 20px",
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Crear producto
        </button>
      </div>

      {/* LISTADO */}
      <h2>Productos {carritoSeleccionado ? `— ${carritos.find(c => c.id === carritoSeleccionado)?.nombre_comercial}` : ""}</h2>

      {productos.length === 0 && (
        <p style={{ color: "#6b7280" }}>No hay productos cargados aún.</p>
      )}

      {productos.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #ccc",
            padding: 15,
            marginBottom: 10,
            borderRadius: 8,
            backgroundColor: "#f9f9f9",
          }}
        >
          <strong style={{ fontSize: 16 }}>{p.nombre_producto}</strong>

          <input
            type="number"
            value={p.precio}
            onChange={async (e) => {
              const nuevoPrecio = Number(e.target.value);
              await fetch("/api/productos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: p.id, precio: nuevoPrecio, activo: p.activo }),
              });
              setProductos((prev) =>
                prev.map((prod) => prod.id === p.id ? { ...prod, precio: nuevoPrecio } : prod)
              );
            }}
            style={{ display: "block", marginTop: 10, padding: 6, width: 120 }}
          />

          <div style={{ marginTop: 10 }}>
            <button
              onClick={async () => {
                await fetch("/api/productos", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: p.id, precio: p.precio, activo: !p.activo }),
                });
                setProductos((prev) =>
                  prev.map((prod) => prod.id === p.id ? { ...prod, activo: !prod.activo } : prod)
                );
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: p.activo ? "#ffc107" : "#28a745",
                color: "black",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                marginRight: 10,
              }}
            >
              {p.activo ? "Desactivar" : "Activar"}
            </button>

            <button
              onClick={async () => {
                const confirmar = confirm("¿Eliminar producto?");
                if (!confirmar) return;
                await fetch(`/api/productos?id=${p.id}`, { method: "DELETE" });
                setProductos((prev) => prev.filter((prod) => prod.id !== p.id));
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Eliminar
            </button>
          </div>

          <p style={{ marginTop: 10 }}>
            Estado: {p.activo ? "🟢 Activo" : "🔴 Inactivo"}
          </p>
        </div>
      ))}
    </div>
  );
}