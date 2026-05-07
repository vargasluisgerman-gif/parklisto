"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: string;
  nombre: string;
  precio: number;
  pedidos: number;
  activo: boolean;
  destacado: boolean;
  descripcion: string;
};

type Stats = {
  resumen: {
    totalEmpresas: number;
    empresasActivas: number;
    empresasInactivas: number;
    totalPedidos: number;
    ingresosTotales: number;
    suscripcionesActivas: number;
  };
  rentabilidadPorPlan: Array<{
    plan: string;
    cantidad: number;
    ingresos: number;
    pedidos_totales: number;
    costo_por_pedido: number;
  }>;
  proximasVencer: any[];
  anomalias: {
    sinSuscripcion: any[];
    vencidasSinRenovar: any[];
    sinActividadReciente: any[];
    pagosPendientes: any[];
  };
};

const CLAVE_ADMIN = process.env.NEXT_PUBLIC_ADMIN_KEY || "parklisto-admin-2026";

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [tab, setTab] = useState<"planes" | "stats" | "anomalias">("stats");

  // Planes
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [editando, setEditando] = useState<Plan | null>(null);
  const [nuevoplan, setNuevoPlan] = useState<Partial<Plan>>({ id: "", nombre: "", precio: 0, pedidos: 0, activo: true, destacado: false, descripcion: "" });
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  function verificarClave() {
    if (clave === CLAVE_ADMIN) {
      setAutenticado(true);
      cargarPlanes();
      cargarStats();
    } else {
      setErrorClave("Clave incorrecta");
    }
  }

  async function cargarPlanes() {
    const res = await fetch("/api/admin/planes");
    const json = await res.json();
    setPlanes(json.data || []);
  }

  async function cargarStats() {
    setLoadingStats(true);
    const res = await fetch("/api/admin/stats");
    const json = await res.json();
    setStats(json.data || null);
    setLoadingStats(false);
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
      setMensaje(`Plan "${plan.nombre}" actualizado`);
      setEditando(null);
      cargarPlanes();
    } else {
      setMensaje("Error: " + json.error);
    }
    setLoading(false);
  }

  async function crearPlan() {
    if (!nuevoplan.id || !nuevoplan.nombre || !nuevoplan.precio || !nuevoplan.pedidos) {
      setMensaje("Completa todos los campos obligatorios");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/planes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoplan),
    });
    const json = await res.json();
    if (res.ok) {
      setMensaje(`Plan "${nuevoplan.nombre}" creado`);
      setMostrarFormNuevo(false);
      setNuevoPlan({ id: "", nombre: "", precio: 0, pedidos: 0, activo: true, destacado: false, descripcion: "" });
      cargarPlanes();
    } else {
      setMensaje("Error: " + json.error);
    }
    setLoading(false);
  }

  // ── LOGIN ──
  if (!autenticado) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#111" }}>
        <div style={{ backgroundColor: "#1a1a1a", borderRadius: 16, padding: 32, width: "100%", maxWidth: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
          <h1 style={{ fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 4 }}>Panel Admin</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Parklisto — Acceso restringido</p>
          <input type="password" placeholder="Clave de acceso" value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verificarClave()}
            style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #333", fontSize: 14, marginBottom: 12, boxSizing: "border-box" as any, backgroundColor: "#222", color: "#fff" }}
          />
          {errorClave && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{errorClave}</p>}
          <button onClick={verificarClave} style={{ width: "100%", padding: "11px 0", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  const totalAnomalias = stats
    ? (stats.anomalias.sinSuscripcion.length + stats.anomalias.vencidasSinRenovar.length + stats.anomalias.sinActividadReciente.length + stats.anomalias.pagosPendientes.length)
    : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111", padding: 30, color: "#fff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 700, fontSize: 24, margin: 0 }}>Panel Admin</h1>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>Parklisto</p>
          </div>
          <button onClick={() => setAutenticado(false)}
            style={{ padding: "8px 16px", backgroundColor: "#374151", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Cerrar sesion
          </button>
        </div>

        {mensaje && (
          <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 20, backgroundColor: mensaje.startsWith("Error") ? "#450a0a" : "#14532d", color: mensaje.startsWith("Error") ? "#fca5a5" : "#86efac", fontSize: 13 }}>
            {mensaje}
          </div>
        )}

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, backgroundColor: "#1a1a1a", borderRadius: 10, padding: 4 }}>
          {[
            { id: "stats", label: "Estadisticas" },
            { id: "anomalias", label: `Anomalias${totalAnomalias > 0 ? ` (${totalAnomalias})` : ""}` },
            { id: "planes", label: "Planes" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", backgroundColor: tab === t.id ? "#374151" : "transparent", color: tab === t.id ? "#fff" : "#6b7280" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB ESTADÍSTICAS ── */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={cargarStats} style={{ padding: "7px 16px", backgroundColor: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                {loadingStats ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            {/* MÉTRICAS RESUMEN */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Empresas totales", value: stats?.resumen.totalEmpresas || 0, color: "#fff" },
                { label: "Activas", value: stats?.resumen.empresasActivas || 0, color: "#86efac" },
                { label: "Inactivas", value: stats?.resumen.empresasInactivas || 0, color: "#fca5a5" },
                { label: "Suscripciones activas", value: stats?.resumen.suscripcionesActivas || 0, color: "#60a5fa" },
                { label: "Total pedidos", value: stats?.resumen.totalPedidos || 0, color: "#fff" },
                { label: "Ingresos totales", value: `$${(stats?.resumen.ingresosTotales || 0).toLocaleString("es-AR")}`, color: "#86efac" },
              ].map((m) => (
                <div key={m.label} style={{ backgroundColor: "#1a1a1a", borderRadius: 10, padding: "14px 16px", border: "1px solid #333" }}>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px" }}>{m.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: m.color, margin: 0 }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* RENTABILIDAD POR PLAN */}
            <h2 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 12px" }}>Rentabilidad por plan</h2>
            <div style={{ backgroundColor: "#1a1a1a", borderRadius: 12, overflow: "hidden", marginBottom: 24, border: "1px solid #333" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: "#0d0d0d" }}>
                    {["Plan", "Suscripciones", "Ingresos cobrados", "Pedidos procesados", "Costo por pedido"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats?.rentabilidadPorPlan.map((r) => (
                    <tr key={r.plan} style={{ borderTop: "1px solid #333" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#fff", textTransform: "capitalize" }}>{r.plan}</td>
                      <td style={{ padding: "10px 14px", color: "#d1d5db" }}>{r.cantidad}</td>
                      <td style={{ padding: "10px 14px", color: "#86efac", fontWeight: 600 }}>${r.ingresos.toLocaleString("es-AR")}</td>
                      <td style={{ padding: "10px 14px", color: "#d1d5db" }}>{r.pedidos_totales}</td>
                      <td style={{ padding: "10px 14px", color: "#60a5fa", fontWeight: 600 }}>
                        {r.costo_por_pedido > 0 ? `$${r.costo_por_pedido.toLocaleString("es-AR")}` : "—"}
                      </td>
                    </tr>
                  ))}
                  {(!stats?.rentabilidadPorPlan || stats.rentabilidadPorPlan.length === 0) && (
                    <tr><td colSpan={5} style={{ padding: "20px 14px", color: "#6b7280", textAlign: "center" }}>Sin datos aun</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PRÓXIMAS A VENCER */}
            {stats?.proximasVencer && stats.proximasVencer.length > 0 && (
              <div>
                <h2 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 12px", color: "#fbbf24" }}>
                  Vencen en los proximos 7 dias ({stats.proximasVencer.length})
                </h2>
                {stats.proximasVencer.map((s: any) => (
                  <div key={s.id} style={{ backgroundColor: "#1a1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: 8, border: "1px solid #854d0e", display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#fff", margin: 0, fontSize: 14 }}>{s.empresa?.nombre_comercial || "Sin nombre"}</p>
                      <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>{s.empresa?.email} · Plan {s.plan}</p>
                    </div>
                    <p style={{ color: "#fbbf24", fontWeight: 600, fontSize: 13, margin: 0 }}>
                      Vence: {new Date(s.fecha_vencimiento).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB ANOMALÍAS ── */}
        {tab === "anomalias" && (
          <div>
            <AnomaliaSeccion
              titulo="Sin suscripcion activa"
              color="#fca5a5"
              items={stats?.anomalias.sinSuscripcion || []}
              renderItem={(e: any) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: "#fff", margin: 0, fontSize: 14 }}>{e.nombre_comercial}</p>
                    <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>{e.email}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", backgroundColor: "#450a0a", color: "#fca5a5", borderRadius: 99, alignSelf: "center" }}>Sin plan</span>
                </div>
              )}
            />
            <AnomaliaSeccion
              titulo="Suscripciones vencidas sin renovar"
              color="#fca5a5"
              items={stats?.anomalias.vencidasSinRenovar || []}
              renderItem={(s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: "#fff", margin: 0, fontSize: 14 }}>{s.empresa?.nombre_comercial}</p>
                    <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>{s.empresa?.email} · Plan {s.plan}</p>
                  </div>
                  <p style={{ color: "#fca5a5", fontSize: 12, margin: 0 }}>Vencio: {new Date(s.fecha_vencimiento).toLocaleDateString("es-AR")}</p>
                </div>
              )}
            />
            <AnomaliaSeccion
              titulo="Con plan activo pero sin pedidos en 7 dias"
              color="#fbbf24"
              items={stats?.anomalias.sinActividadReciente || []}
              renderItem={(s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: "#fff", margin: 0, fontSize: 14 }}>{s.empresa?.nombre_comercial}</p>
                    <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>{s.empresa?.email} · Plan {s.plan}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", backgroundColor: "#451a03", color: "#fbbf24", borderRadius: 99, alignSelf: "center" }}>Sin actividad</span>
                </div>
              )}
            />
            <AnomaliaSeccion
              titulo="Pagos pendientes sin confirmar"
              color="#60a5fa"
              items={stats?.anomalias.pagosPendientes || []}
              renderItem={(s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: "#fff", margin: 0, fontSize: 14 }}>{s.empresa?.nombre_comercial}</p>
                    <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>{s.empresa?.email} · Plan {s.plan}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", backgroundColor: "#1e3a5f", color: "#60a5fa", borderRadius: 99, alignSelf: "center" }}>Pendiente</span>
                </div>
              )}
            />
            {totalAnomalias === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                <p style={{ fontSize: 32 }}>✅</p>
                <p>No hay anomalias detectadas</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB PLANES ── */}
        {tab === "planes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Planes activos</h2>
              <button onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
                style={{ padding: "8px 16px", backgroundColor: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {mostrarFormNuevo ? "Cancelar" : "+ Agregar plan"}
              </button>
            </div>

            {mostrarFormNuevo && (
              <div style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid #333" }}>
                <h3 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px" }}>Nuevo plan</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "ID (sin espacios) *", key: "id", placeholder: "ej: premium", type: "text" },
                    { label: "Nombre *", key: "nombre", placeholder: "ej: Premium", type: "text" },
                    { label: "Precio ARS *", key: "precio", placeholder: "50000", type: "number" },
                    { label: "Pedidos incluidos *", key: "pedidos", placeholder: "400", type: "number" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={{ fontSize: 12, color: "#9ca3af" }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder}
                        value={(nuevoplan as any)[f.key] || ""}
                        onChange={(e) => setNuevoPlan({ ...nuevoplan, [f.key]: f.type === "number" ? Number(e.target.value) : (f.key === "id" ? e.target.value.toLowerCase().replace(/\s/g, "") : e.target.value) })}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, color: "#9ca3af" }}>Descripcion</label>
                    <input placeholder="ej: Para grandes operaciones" value={nuevoplan.descripcion || ""}
                      onChange={(e) => setNuevoPlan({ ...nuevoplan, descripcion: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <label style={{ fontSize: 13, color: "#d1d5db", display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={nuevoplan.destacado} onChange={(e) => setNuevoPlan({ ...nuevoplan, destacado: e.target.checked })} />
                    Destacado
                  </label>
                </div>
                <button onClick={crearPlan} disabled={loading}
                  style={{ marginTop: 16, padding: "10px 24px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {loading ? "Creando..." : "Crear plan"}
                </button>
              </div>
            )}

            {planes.map((plan) => (
              <div key={plan.id} style={{ backgroundColor: "#1a1a1a", borderRadius: 12, padding: 20, marginBottom: 12, border: editando?.id === plan.id ? "1px solid #185FA5" : "1px solid #333" }}>
                {editando?.id === plan.id ? (
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 16px", color: "#60a5fa" }}>Editando: {plan.nombre}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { label: "Nombre", key: "nombre", type: "text" },
                        { label: "Precio ARS", key: "precio", type: "number" },
                        { label: "Pedidos incluidos", key: "pedidos", type: "number" },
                        { label: "Descripcion", key: "descripcion", type: "text" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label style={{ fontSize: 12, color: "#9ca3af" }}>{f.label}</label>
                          <input type={f.type} value={(editando as any)[f.key] || ""}
                            onChange={(e) => setEditando({ ...editando, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value } as Plan)}
                            style={inputStyle}
                          />
                        </div>
                      ))}
                      <label style={{ fontSize: 13, color: "#d1d5db", display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={editando.destacado} onChange={(e) => setEditando({ ...editando, destacado: e.target.checked })} />
                        Destacado
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      <button onClick={() => guardarPlan(editando)} disabled={loading}
                        style={{ padding: "8px 20px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        {loading ? "Guardando..." : "Guardar"}
                      </button>
                      <button onClick={() => setEditando(null)}
                        style={{ padding: "8px 16px", backgroundColor: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{plan.nombre}</span>
                        {plan.destacado && <span style={{ fontSize: 10, padding: "2px 8px", backgroundColor: "#1e3a5f", color: "#60a5fa", borderRadius: 99, fontWeight: 600 }}>Destacado</span>}
                        {!plan.activo && <span style={{ fontSize: 10, padding: "2px 8px", backgroundColor: "#450a0a", color: "#fca5a5", borderRadius: 99, fontWeight: 600 }}>Inactivo</span>}
                      </div>
                      <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 2px" }}>${Number(plan.precio).toLocaleString("es-AR")} / mes · {plan.pedidos} pedidos</p>
                      <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>{plan.descripcion}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setEditando(plan)}
                        style={{ padding: "6px 14px", backgroundColor: "#185FA5", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        Editar
                      </button>
                      <button onClick={() => guardarPlan({ ...plan, activo: !plan.activo })}
                        style={{ padding: "6px 14px", backgroundColor: plan.activo ? "#374151" : "#14532d", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        {plan.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnomaliaSeccion({ titulo, color, items, renderItem }: { titulo: string; color: string; items: any[]; renderItem: (item: any) => React.ReactNode }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontWeight: 600, fontSize: 15, margin: "0 0 12px", color }}>
        {titulo} ({items.length})
      </h2>
      {items.map((item, i) => (
        <div key={i} style={{ backgroundColor: "#1a1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: 8, border: "1px solid #333" }}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "8px 12px",
  borderRadius: 6, border: "1px solid #374151", fontSize: 13,
  marginTop: 4, boxSizing: "border-box",
  backgroundColor: "#222", color: "#fff",
};