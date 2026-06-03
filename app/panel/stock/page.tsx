"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ingrediente = {
  id: number;
  nombre: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  carrito_id: number | null;
};

type Movimiento = {
  id: number;
  tipo: string;
  cantidad: number;
  motivo: string;
  remito: string | null;
  pedido_id: number | null;
  created_at: string;
};

type Carrito = {
  id: number;
  nombre_comercial: string;
};

const UNIDADES = ["unidad", "gramos", "kg", "ml", "litros", "feta", "porciones"];

export default function StockPage() {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [carritos, setCarritos] = useState<Carrito[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [editandoPrecioId, setEditandoPrecioId] = useState<number | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    unidad: "unidad",
    stock_actual: "",
    stock_minimo: "",
    precio_unitario: "",
    carrito_id: "",
  });

  const [cargaStock, setCargaStock] = useState<{
    id: number;
    cantidad: string;
    remito: string;
    tipo: "entrada" | "ajuste";
  } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
    const empId = await getEmpresaUsuario();
    if (!empId) return;
    setEmpresaId(Number(empId));

    const { data: carritosData } = await supabase
      .from("carritos")
      .select("id, nombre_comercial")
      .eq("empresa_id", empId)
      .eq("activo", true);

    setCarritos(carritosData || []);

    const res = await fetch(`/api/stock?empresa_id=${empId}`);
    const json = await res.json();
    setIngredientes(json.data || []);
    setCargando(false);
  }

  async function crearIngrediente() {
    if (!form.nombre || !empresaId) return;

    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        unidad: form.unidad,
        stock_actual: Number(form.stock_actual) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        precio_unitario: Number(form.precio_unitario) || 0,
        empresa_id: empresaId,
        carrito_id: form.carrito_id ? Number(form.carrito_id) : null,
      }),
    });

    if (res.ok) {
      setMensaje("Ingrediente creado correctamente");
      setForm({ nombre: "", unidad: "unidad", stock_actual: "", stock_minimo: "", precio_unitario: "", carrito_id: "" });
      cargarDatos();
      setTimeout(() => setMensaje(""), 3000);
    }
  }

  async function actualizarStock() {
    if (!cargaStock || !empresaId) return;
    const ing = ingredientes.find((i) => i.id === cargaStock.id);
    if (!ing) return;

    const cantidad = Number(cargaStock.cantidad);
    if (!cantidad) return;

    const nuevoStock = cargaStock.tipo === "entrada"
      ? ing.stock_actual + cantidad
      : cantidad;

    await fetch("/api/stock", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: cargaStock.id,
        stock_actual: nuevoStock,
        tipo_movimiento: cargaStock.tipo,
        remito: cargaStock.remito || null,
        empresa_id: empresaId,
      }),
    });

    setCargaStock(null);
    setMensaje("Stock actualizado correctamente");
    cargarDatos();
    setTimeout(() => setMensaje(""), 3000);
  }

  async function actualizarPrecio(id: number) {
    if (!nuevoPrecio) return;
    await fetch("/api/stock", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, precio_unitario: Number(nuevoPrecio) }),
    });
    setEditandoPrecioId(null);
    setNuevoPrecio("");
    setMensaje("Precio actualizado");
    cargarDatos();
    setTimeout(() => setMensaje(""), 3000);
  }

  async function verHistorial(id: number) {
    if (historialId === id) {
      setHistorialId(null);
      setMovimientos([]);
      return;
    }
    setHistorialId(id);
    setLoadingHistorial(true);
    const res = await fetch(`/api/movimientos?ingrediente_id=${id}`);
    const json = await res.json();
    setMovimientos(json.data || []);
    setLoadingHistorial(false);
  }

  async function eliminarIngrediente(id: number) {
    const confirmar = confirm("¿Eliminar este ingrediente?");
    if (!confirmar) return;
    await fetch(`/api/stock?id=${id}`, { method: "DELETE" });
    cargarDatos();
  }

  const stockBajo = ingredientes.filter(
    (i) => i.stock_actual <= i.stock_minimo && i.stock_minimo > 0
  );

  if (cargando) return <div style={{ padding: 40 }}>Cargando...</div>;

  return (
    <div style={{ padding: 30, maxWidth: 720 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 6 }}>
        Gestion de stock
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Administra tus ingredientes e insumos.
      </p>

      {stockBajo.length > 0 && (
        <div style={{
          backgroundColor: "#FCEBEB", border: "1px solid #fca5a5",
          borderRadius: 10, padding: "12px 16px", marginBottom: 20,
        }}>
          <p style={{ fontWeight: 700, color: "#A32D2D", fontSize: 14, margin: "0 0 6px" }}>
            Stock bajo en {stockBajo.length} ingrediente{stockBajo.length > 1 ? "s" : ""}
          </p>
          {stockBajo.map((i) => (
            <p key={i.id} style={{ color: "#A32D2D", fontSize: 13, margin: "2px 0" }}>
              {i.nombre}: {i.stock_actual} {i.unidad} (minimo: {i.stock_minimo})
            </p>
          ))}
        </div>
      )}

      {mensaje && (
        <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 16 }}>{mensaje}</p>
      )}

      {/* FORMULARIO NUEVO INGREDIENTE */}
      <div style={{
        backgroundColor: "#fff", borderRadius: 12, padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24,
      }}>
        <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 16 }}>
          Agregar ingrediente o insumo
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Nombre</label>
            <input
              placeholder="Ej: Pan de hamburguesa"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Unidad</label>
            <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} style={inputStyle}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Precio por unidad ($)</label>
            <input
              type="number"
              placeholder="0"
              value={form.precio_unitario}
              onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Stock inicial</label>
            <input type="number" placeholder="0" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Stock minimo (alerta)</label>
            <input type="number" placeholder="0" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} style={inputStyle} />
          </div>
          {carritos.length > 1 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Carrito (opcional)</label>
              <select value={form.carrito_id} onChange={(e) => setForm({ ...form, carrito_id: e.target.value })} style={inputStyle}>
                <option value="">Global (todos los carritos)</option>
                {carritos.map((c) => <option key={c.id} value={c.id}>{c.nombre_comercial}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={crearIngrediente} style={{
          marginTop: 16, width: "100%", padding: "11px 0",
          backgroundColor: "#111", color: "#fff", border: "none",
          borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}>
          Agregar
        </button>
      </div>

      {/* LISTADO */}
      <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 12 }}>
        Ingredientes e insumos ({ingredientes.length})
      </h2>

      {ingredientes.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: 14 }}>No hay ingredientes cargados aun.</p>
      )}

      {ingredientes.map((ing) => {
        const bajoBajo = ing.stock_actual <= ing.stock_minimo && ing.stock_minimo > 0;
        const sinStock = ing.stock_actual <= 0;
        const mostrandoHistorial = historialId === ing.id;

        return (
          <div key={ing.id} style={{
            backgroundColor: "#fff", borderRadius: 10, padding: "14px 16px",
            marginBottom: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            border: sinStock ? "1px solid #fca5a5" : bajoBajo ? "1px solid #fcd34d" : "1px solid #e5e7eb",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontWeight: 600, color: "#111", margin: 0, fontSize: 15 }}>
                  {ing.nombre}
                  {sinStock && <span style={{ marginLeft: 8, fontSize: 11, color: "#dc2626", fontWeight: 500 }}>SIN STOCK</span>}
                  {!sinStock && bajoBajo && <span style={{ marginLeft: 8, fontSize: 11, color: "#d97706", fontWeight: 500 }}>STOCK BAJO</span>}
                </p>
                <p style={{ color: "#6b7280", margin: "3px 0 0", fontSize: 13 }}>
                  Stock: <strong style={{ color: sinStock ? "#dc2626" : bajoBajo ? "#d97706" : "#111" }}>
                    {ing.stock_actual} {ing.unidad}
                  </strong>
                  {ing.stock_minimo > 0 && ` · Minimo: ${ing.stock_minimo} ${ing.unidad}`}
                </p>
                {/* PRECIO UNITARIO */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  {editandoPrecioId === ing.id ? (
                    <>
                      <input
                        type="number"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(e.target.value)}
                        placeholder="Precio"
                        style={{ width: 100, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
                        autoFocus
                      />
                      <span style={{ fontSize: 12, color: "#6b7280" }}>por {ing.unidad}</span>
                      <button onClick={() => actualizarPrecio(ing.id)} style={{ padding: "3px 10px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>OK</button>
                      <button onClick={() => setEditandoPrecioId(null)} style={{ padding: "3px 8px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        Precio: <strong>${(ing.precio_unitario || 0).toLocaleString("es-AR")}</strong> / {ing.unidad}
                      </span>
                      <button
                        onClick={() => { setEditandoPrecioId(ing.id); setNuevoPrecio(String(ing.precio_unitario || "")); }}
                        style={{ padding: "2px 8px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: 5, fontSize: 11, cursor: "pointer" }}
                      >
                        Editar
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => setCargaStock({ id: ing.id, cantidad: "", remito: "", tipo: "entrada" })} style={{ padding: "6px 12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  Cargar stock
                </button>
                <button onClick={() => verHistorial(ing.id)} style={{ padding: "6px 12px", backgroundColor: mostrandoHistorial ? "#374151" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {mostrandoHistorial ? "Cerrar" : "Historial"}
                </button>
                <button onClick={() => eliminarIngrediente(ing.id)} style={{ padding: "6px 12px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  Eliminar
                </button>
              </div>
            </div>

            {/* FORMULARIO CARGA DE STOCK */}
            {cargaStock?.id === ing.id && (
              <div style={{ marginTop: 14, backgroundColor: "#f9fafb", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button onClick={() => setCargaStock({ ...cargaStock, tipo: "entrada" })} style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer", backgroundColor: cargaStock.tipo === "entrada" ? "#16a34a" : "#e5e7eb", color: cargaStock.tipo === "entrada" ? "#fff" : "#374151" }}>
                    + Sumar al stock
                  </button>
                  <button onClick={() => setCargaStock({ ...cargaStock, tipo: "ajuste" })} style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer", backgroundColor: cargaStock.tipo === "ajuste" ? "#6b7280" : "#e5e7eb", color: cargaStock.tipo === "ajuste" ? "#fff" : "#374151" }}>
                    = Ajustar total
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={labelStyle}>{cargaStock.tipo === "entrada" ? `Cantidad a sumar (${ing.unidad})` : `Nuevo total (${ing.unidad})`}</label>
                    <input type="number" placeholder="0" value={cargaStock.cantidad} onChange={(e) => setCargaStock({ ...cargaStock, cantidad: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nro. de remito o factura (opcional)</label>
                    <input type="text" placeholder="Ej: R-0001-00045" value={cargaStock.remito} onChange={(e) => setCargaStock({ ...cargaStock, remito: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={actualizarStock} style={{ flex: 1, padding: "9px 0", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Confirmar
                  </button>
                  <button onClick={() => setCargaStock(null)} style={{ padding: "9px 16px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* HISTORIAL */}
            {mostrandoHistorial && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>Historial de movimientos</p>
                {loadingHistorial && <p style={{ color: "#6b7280", fontSize: 13 }}>Cargando...</p>}
                {!loadingHistorial && movimientos.length === 0 && <p style={{ color: "#6b7280", fontSize: 13 }}>No hay movimientos registrados.</p>}
                {!loadingHistorial && movimientos.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th style={thStyle}>Fecha</th>
                          <th style={thStyle}>Tipo</th>
                          <th style={thStyle}>Cantidad</th>
                          <th style={thStyle}>Remito/Factura</th>
                          <th style={thStyle}>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((m) => (
                          <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={tdStyle}>
                              {new Date(m.created_at).toLocaleDateString("es-AR")}<br />
                              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                                {new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, backgroundColor: m.tipo === "entrada" ? "#dcfce7" : m.tipo === "ajuste" ? "#f3f4f6" : "#fee2e2", color: m.tipo === "entrada" ? "#16a34a" : m.tipo === "ajuste" ? "#374151" : "#dc2626" }}>
                                {m.tipo === "entrada" ? "Entrada" : m.tipo === "ajuste" ? "Ajuste" : "Salida"}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>
                              {m.tipo === "entrada" ? "+" : m.tipo === "salida" ? "-" : "="}{m.cantidad} {ing.unidad}
                            </td>
                            <td style={tdStyle}>
                              {m.remito ? <span style={{ fontWeight: 600, color: "#2563eb" }}>{m.remito}</span> : <span style={{ color: "#9ca3af" }}>—</span>}
                            </td>
                            <td style={{ ...tdStyle, color: "#6b7280" }}>
                              {m.pedido_id ? `Pedido #${m.pedido_id}` : m.motivo || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "9px 12px",
  borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
  marginTop: 4, boxSizing: "border-box", backgroundColor: "#fff",
};
const thStyle: React.CSSProperties = { padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "#374151" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", verticalAlign: "top" };