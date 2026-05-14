"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Carrito = {
  id: number;
  nombre_comercial: string;
  slug: string;
  activo: boolean;
  created_at: string;
};

export default function CarritosPage() {
  const [carritos, setCarritos] = useState<Carrito[]>([]);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditar, setNombreEditar] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
    const empId = await getEmpresaUsuario();
    if (!empId) return;
    setEmpresaId(Number(empId));
    cargarCarritos(Number(empId));
  }

  async function cargarCarritos(empId: number) {
    const { data } = await supabase
      .from("carritos")
      .select("id, nombre_comercial, slug, activo, created_at")
      .eq("empresa_id", empId)
      .order("created_at", { ascending: true });

    setCarritos(data || []);
  }

  async function crearCarrito() {
    if (!nombre) {
      setError("Completá el nombre del carrito");
      return;
    }
    if (!empresaId) return;

    setLoading(true);
    setError("");
    setExito("");

    const res = await fetch("/api/carritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_comercial: nombre, empresa_id: empresaId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Error al crear carrito");
    } else {
      setExito(`Carrito "${nombre}" creado correctamente`);
      setNombre("");
      cargarCarritos(empresaId);
    }

    setLoading(false);
  }

  async function toggleActivo(carrito: Carrito) {
    const res = await fetch("/api/carritos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: carrito.id, activo: !carrito.activo }),
    });

    if (res.ok) {
      setCarritos((prev) =>
        prev.map((c) => c.id === carrito.id ? { ...c, activo: !c.activo } : c)
      );
    }
  }

  async function guardarNombre(id: number) {
    if (!nombreEditar) return;

    const res = await fetch("/api/carritos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nombre_comercial: nombreEditar }),
    });

    if (res.ok) {
      setCarritos((prev) =>
        prev.map((c) => c.id === id ? { ...c, nombre_comercial: nombreEditar } : c)
      );
      setEditandoId(null);
      setNombreEditar("");
    }
  }

  return (
    <div style={{ padding: 30, maxWidth: 600 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 6 }}>
        Gestión de carritos
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Cada carrito tiene su propio menú y sus propios pedidos.
      </p>

      {/* FORMULARIO */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        marginBottom: 24,
      }}>
        <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 16 }}>
          Agregar carrito
        </h2>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Nombre del carrito
        </label>
        <input
          type="text"
          placeholder="Ej: Puesto Norte, Carrito Centro"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && crearCarrito()}
          style={{
            display: "block", width: "100%", padding: "10px 14px",
            borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
            marginTop: 6, marginBottom: 16, boxSizing: "border-box" as any,
          }}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}
        {exito && (
          <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 12 }}>{exito}</p>
        )}

        <button
          onClick={crearCarrito}
          disabled={loading}
          style={{
            width: "100%", padding: "11px 0",
            backgroundColor: loading ? "#9ca3af" : "#111",
            color: "#fff", border: "none", borderRadius: 8,
            fontWeight: 700, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creando..." : "Crear carrito"}
        </button>
      </div>

      {/* LISTADO */}
      <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 12 }}>
        Mis carritos ({carritos.length})
      </h2>

      {carritos.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: 14 }}>No hay carritos cargados aún.</p>
      )}

      {carritos.map((carrito) => (
        <div
          key={carrito.id}
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            border: carrito.activo ? "1px solid #e5e7eb" : "1px solid #fca5a5",
          }}
        >
          {editandoId === carrito.id ? (
            // MODO EDICIÓN
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={nombreEditar}
                onChange={(e) => setNombreEditar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && guardarNombre(carrito.id)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 6,
                  border: "1px solid #e5e7eb", fontSize: 14,
                }}
                autoFocus
              />
              <button
                onClick={() => guardarNombre(carrito.id)}
                style={{ padding: "6px 12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
              >
                Guardar
              </button>
              <button
                onClick={() => setEditandoId(null)}
                style={{ padding: "6px 12px", backgroundColor: "#6b7280", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            // MODO VISTA
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 600, color: "#111", margin: 0, fontSize: 14 }}>
                  {carrito.nombre_comercial}
                  {!carrito.activo && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#dc2626", fontWeight: 500 }}>
                      Inactivo
                    </span>
                  )}
                </p>
                <p style={{ color: "#6b7280", margin: "3px 0 0", fontSize: 12 }}>
                  slug: {carrito.slug}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setEditandoId(carrito.id); setNombreEditar(carrito.nombre_comercial); }}
                  style={{ padding: "6px 12px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  Renombrar
                </button>
                <button
                  onClick={() => toggleActivo(carrito)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: carrito.activo ? "#f59e0b" : "#16a34a",
                    color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}
                >
                  {carrito.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}