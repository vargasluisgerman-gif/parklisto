"use client";

import { useEffect, useState } from "react";

type Producto = {
  id: number;
  nombre_producto: string;
  precio: number;
  activo: boolean;
};

export default function ProductosPage() {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    cargarProductos();
  }, []);

  async function cargarProductos() {
    const res = await fetch("/api/productos");
    const json = await res.json();
    setProductos(json.data || []);
  }

  async function crearProducto() {
    // 🔒 validación básica
    if (!nombre || !precio) {
      alert("Completar nombre y precio");
      return;
    }

    const res = await fetch("/api/productos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre_producto: nombre,
        precio: Number(precio),
        carrito_id: 5,
        empresa_id: 1,
      }),
    });

    const nuevo = await res.json();

    // ✅ FIX IMPORTANTE
    if (nuevo?.data?.length > 0) {
      setProductos((prev) => [nuevo.data[0], ...prev]);
    } else {
      // fallback seguro
      await cargarProductos();
    }

    setNombre("");
    setPrecio("");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Gestión de productos</h1>

      {/* FORM */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Nombre producto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ display: "block", marginBottom: 10 }}
        />

        <input
          placeholder="Precio"
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          style={{ display: "block", marginBottom: 10 }}
        />

        <button onClick={crearProducto}>
          Crear producto
        </button>
      </div>

      {/* LISTADO */}
      <h2>Productos</h2>

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
          <strong style={{ fontSize: 16 }}>
            {p.nombre_producto}
          </strong>

          {/* 💰 PRECIO EDITABLE */}
          <input
            type="number"
            value={p.precio}
            onChange={async (e) => {
              const nuevoPrecio = Number(e.target.value);

              await fetch("/api/productos", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: p.id,
                  precio: nuevoPrecio,
                  activo: p.activo,
                }),
              });

              setProductos((prev) =>
                prev.map((prod) =>
                  prod.id === p.id
                    ? { ...prod, precio: nuevoPrecio }
                    : prod
                )
              );
            }}
            style={{
              display: "block",
              marginTop: 10,
              padding: 6,
              width: 120,
            }}
          />

          {/* 🔥 BOTONES */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={async () => {
                await fetch("/api/productos", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: p.id,
                    precio: p.precio,
                    activo: !p.activo,
                  }),
                });

                setProductos((prev) =>
                  prev.map((prod) =>
                    prod.id === p.id
                      ? { ...prod, activo: !prod.activo }
                      : prod
                  )
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
              onMouseOver={(e) =>
                (e.currentTarget.style.opacity = "0.8")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.opacity = "1")
              }
            >
              {p.activo ? "Desactivar" : "Activar"}
            </button>

            <button
              onClick={async () => {
                const confirmar = confirm("¿Eliminar producto?");
                if (!confirmar) return;

                await fetch(`/api/productos?id=${p.id}`, {
                  method: "DELETE",
                });

                setProductos((prev) =>
                  prev.filter((prod) => prod.id !== p.id)
                );
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.opacity = "0.8")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.opacity = "1")
              }
            >
              Eliminar
            </button>
          </div>

          {/* ESTADO */}
          <p style={{ marginTop: 10 }}>
            Estado:{" "}
            {p.activo ? "🟢 Activo" : "🔴 Inactivo"}
          </p>
        </div>
      ))}
    </div>
  );
}