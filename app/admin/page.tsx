"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  nombre: string;
  precio: number;
  pedidos: number;
  activo: boolean;
  destacado: boolean;
  descripcion: string;
};

const CLAVE_ADMIN = process.env.NEXT_PUBLIC_ADMIN_KEY || "parklisto-admin-2026";

export default function AdminPage() {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState<Plan | null>(null);
  const [nuevoplan, setNuevoPlan] = useState<Partial<Plan>>({
    id: "",
    nombre: "",
    precio: 0,
    pedidos: 0,
    activo: true,
    destacado: false,
    descripcion: "",
  });
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);

  function verificarClave() {
    if (clave === CLAVE_ADMIN) {
      setAutenticado(true);
      cargarPlanes();
    } else {
      setErrorClave("Clave incorrecta");
    }
  }

  async function cargarPlanes() {
    const res = await fetch("/api/admin/planes");
    const json = await res.json();
    setPlanes(json.data || []);
  }

  async function guardarPlan(plan: Plan) {
    setLoading(true);
    setMensaje("");

    const res = await fetch("/api/admin/planes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });

    const json = await res.json();
    if (res.ok) {
      setMensaje(`Plan "${plan.nombre}" actualizado correctamente`);
      setEditando(null);
      cargarPlanes();
    } else {
      setMensaje("Error: " + json.error);
    }
    setLoading(false);
  }

  async function crearPlan() {
    if (!nuevoplan.id || !nuevoplan.nombre || !nuevoplan.precio || !nuevoplan.pedidos) {
      setMensaje("Completá todos los campos obligatorios");
      return;
    }

    setLoading(true);
    setMensaje("");

    const res = await fetch("/api/admin/planes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoplan),
    });

    const json = await res.json();
    if (res.ok) {
      setMensaje(`Plan "${nuevoplan.nombre}" creado correctamente`);
      setMostrarFormNuevo(false);
      setNuevoPlan({ id: "", nombre: "", precio: 0, pedidos: 0, activo: true, destacado: false, descripcion: "" });
      cargarPlanes();
    } else {
      setMensaje("Error: " + json.error);
    }
    setLoading(false);
  }

  async function toggleActivo(plan: Plan) {
    await guardarPlan({ ...plan, activo: !plan.activo });
  }

  async function toggleDestacado(plan: Plan) {
    await guardarPlan({ ...plan, destacado: !plan.destacado });
  }

  // ── PANTALLA DE ACCESO ──
  if (!autenticado) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", backgroundColor: "#111",
      }}>
        <div style={{
          backgroundColor: "#1a1a1a", borderRadius: 16, padding: 32,
          width: "100%", maxWidth: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <h1 style={{ fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 4 }}>
            Panel Admin
          </h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
            Parklisto — Acceso restringido
          </p>
          <input
            type="password"
            placeholder="Clave de acceso"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verificarClave()}
            style={{
              display: "block", width: "100%", padding: "10px 14px",
              borderRadius: 8, border: "1px solid #333", fontSize: 14,
              marginBottom: 12, boxSizing: "border-box" as any,
              backgroundColor: "#222", color: "#fff",
            }}
          />
          {errorClave && (
            <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{errorClave}</p>
          )}
          <button
            onClick={verificarClave}
            style={{
              width: "100%", padding: "11px 0", backgroundColor: "#16a34a",
              color: "#fff", border: "none", borderRadius: 8,
              fontWeight: 700, fontSize: 15, cursor: "pointer",
            }}
          >
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  // ── PANEL ADMIN ──
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111", padding: 30, color: "#fff" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 24, margin: 0 }}>Panel Admin</h1>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>Gestión de planes de Parklisto</p>
          </div>
          <button
            onClick={() => setAutenticado(false)}
            style={{ padding: "8px 16px", backgroundColor: "#374151", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
          >
            Cerrar sesión
          </button>
        </div>

        {mensaje && (
          <div style={{
            padding: "10px 16px", borderRadius: 8, marginBottom: 20,
            backgroundColor: mensaje.startsWith("Error") ? "#450a0a" : "#14532d",
            color: mensaje.startsWith("Error") ? "#fca5a5" : "#86efac",
            fontSize: 13,
          }}>
            {mensaje}
          </div>
        )}

        {/* LISTA DE PLANES */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Planes activos</h2>
          <button
            onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
            style={{
              padding: "8px 16px", backgroundColor: "#185FA5", color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            {mostrarFormNuevo ? "Cancelar" : "+ Agregar plan"}
          </button>
        </div>

        {/* FORMULARIO NUEVO PLAN */}
        {mostrarFormNuevo && (
          <div style={{
            backgroundColor: "#1a1a1a", borderRadius: 12, padding: 20,
            marginBottom: 20, border: "1px solid #333",
          }}>
            <h3 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px" }}>Nuevo plan</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>ID (sin espacios) *</label>
                <input
                  placeholder="ej: premium"
                  value={nuevoplan.id}
                  onChange={(e) => setNuevoPlan({ ...nuevoplan, id: e.target.value.toLowerCase().replace(/\s/g, "") })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>Nombre *</label>
                <input
                  placeholder="ej: Premium"
                  value={nuevoplan.nombre}
                  onChange={(e) => setNuevoPlan({ ...nuevoplan, nombre: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>Precio ARS *</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={nuevoplan.precio || ""}
                  onChange={(e) => setNuevoPlan({ ...nuevoplan, precio: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>Pedidos incluidos *</label>
                <input
                  type="number"
                  placeholder="400"
                  value={nuevoplan.pedidos || ""}
                  onChange={(e) => setNuevoPlan({ ...nuevoplan, pedidos: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#9ca3af" }}>Descripción</label>
                <input
                  placeholder="ej: Para grandes operaciones"
                  value={nuevoplan.descripcion}
                  onChange={(e) => setNuevoPlan({ ...nuevoplan, descripcion: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#d1d5db", display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={nuevoplan.destacado} onChange={(e) => setNuevoPlan({ ...nuevoplan, destacado: e.target.checked })} />
                  Destacado
                </label>
              </div>
            </div>
            <button
              onClick={crearPlan}
              disabled={loading}
              style={{
                marginTop: 16, padding: "10px 24px", backgroundColor: "#16a34a",
                color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              {loading ? "Creando..." : "Crear plan"}
            </button>
          </div>
        )}

        {/* PLANES */}
        {planes.map((plan) => (
          <div key={plan.id} style={{
            backgroundColor: "#1a1a1a", borderRadius: 12, padding: 20,
            marginBottom: 12, border: editando?.id === plan.id ? "1px solid #185FA5" : "1px solid #333",
          }}>
            {editando?.id === plan.id ? (
              // MODO EDICIÓN
              <div>
                <h3 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px", color: "#60a5fa" }}>
                  Editando: {plan.nombre}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#9ca3af" }}>Nombre</label>
                    <input
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#9ca3af" }}>Precio ARS</label>
                    <input
                      type="number"
                      value={editando.precio}
                      onChange={(e) => setEditando({ ...editando, precio: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#9ca3af" }}>Pedidos incluidos</label>
                    <input
                      type="number"
                      value={editando.pedidos}
                      onChange={(e) => setEditando({ ...editando, pedidos: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#9ca3af" }}>Descripción</label>
                    <input
                      value={editando.descripcion}
                      onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <label style={{ fontSize: 13, color: "#d1d5db", display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={editando.destacado} onChange={(e) => setEditando({ ...editando, destacado: e.target.checked })} />
                      Destacado
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    onClick={() => guardarPlan(editando)}
                    disabled={loading}
                    style={{ padding: "8px 20px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    style={{ padding: "8px 16px", backgroundColor: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              // MODO VISTA
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{plan.nombre}</span>
                    {plan.destacado && <span style={{ fontSize: 10, padding: "2px 8px", backgroundColor: "#1e3a5f", color: "#60a5fa", borderRadius: 99, fontWeight: 600 }}>Destacado</span>}
                    {!plan.activo && <span style={{ fontSize: 10, padding: "2px 8px", backgroundColor: "#450a0a", color: "#fca5a5", borderRadius: 99, fontWeight: 600 }}>Inactivo</span>}
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 2px" }}>
                    ${plan.precio.toLocaleString("es-AR")} / mes · {plan.pedidos} pedidos
                  </p>
                  <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>{plan.descripcion}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setEditando(plan)}
                    style={{ padding: "6px 14px", backgroundColor: "#185FA5", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActivo(plan)}
                    style={{ padding: "6px 14px", backgroundColor: plan.activo ? "#374151" : "#14532d", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                  >
                    {plan.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "8px 12px",
  borderRadius: 6, border: "1px solid #374151", fontSize: 13,
  marginTop: 4, boxSizing: "border-box",
  backgroundColor: "#222", color: "#fff",
};