"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Producto = {
  id: number;
  nombre_producto: string;
  tipo_stock: string;
  carrito_id: number;
  precio: number;
};

type Ingrediente = {
  id: number;
  nombre: string;
  unidad: string;
  stock_actual: number;
  precio_unitario: number;
};

type ItemReceta = {
  id: number;
  cantidad: number;
  ingrediente_id: number;
  ingredientes: {
    id: number;
    nombre: string;
    unidad: string;
    stock_actual: number;
    precio_unitario: number;
  };
};

type Carrito = {
  id: number;
  nombre_comercial: string;
};

export default function RecetasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [carritos, setCarritos] = useState<Carrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);
  const [receta, setReceta] = useState<ItemReceta[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState({ ingrediente_id: "", cantidad: "" });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (productoSeleccionado) cargarReceta(productoSeleccionado);
  }, [productoSeleccionado]);

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

    const carritoIds = (carritosData || []).map((c: any) => c.id);
    if (carritoIds.length > 0) {
      const { data: productosData } = await supabase
        .from("productos")
        .select("id, nombre_producto, tipo_stock, carrito_id, precio")
        .in("carrito_id", carritoIds)
        .order("nombre_producto", { ascending: true });

      setProductos(productosData || []);
      if (productosData && productosData.length > 0) {
        setProductoSeleccionado(productosData[0].id);
      }
    }

    const resIng = await fetch(`/api/stock?empresa_id=${empId}`);
    const jsonIng = await resIng.json();
    setIngredientes(jsonIng.data || []);
    setCargando(false);
  }

  async function cargarReceta(producto_id: number) {
    const res = await fetch(`/api/recetas?producto_id=${producto_id}`);
    const json = await res.json();
    setReceta(json.data || []);
  }

  async function cambiarTipoStock(productoId: number, tipo: string) {
    await supabase
      .from("productos")
      .update({ tipo_stock: tipo })
      .eq("id", productoId);

    setProductos((prev) =>
      prev.map((p) => p.id === productoId ? { ...p, tipo_stock: tipo } : p)
    );

    if (tipo === "receta") {
      cargarReceta(productoId);
    } else {
      setReceta([]);
    }
    setMensaje("Tipo de stock actualizado");
  }

  async function agregarIngrediente() {
    if (!form.ingrediente_id || !form.cantidad || !productoSeleccionado) return;

    const res = await fetch("/api/recetas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producto_id: productoSeleccionado,
        ingrediente_id: Number(form.ingrediente_id),
        cantidad: Number(form.cantidad),
      }),
    });

    if (res.ok) {
      setMensaje("Ingrediente agregado a la receta");
      setForm({ ingrediente_id: "", cantidad: "" });
      cargarReceta(productoSeleccionado);
    }
  }

  async function quitarIngrediente(id: number) {
    await fetch(`/api/recetas?id=${id}`, { method: "DELETE" });
    if (productoSeleccionado) cargarReceta(productoSeleccionado);
  }

  const productoActual = productos.find((p) => p.id === productoSeleccionado);
  const carritoDelProducto = carritos.find((c) => c.id === productoActual?.carrito_id);

  // Calcular costo total de la receta
  const costoTotal = receta.reduce((acc, item) => {
    const precioUnitario = item.ingredientes.precio_unitario || 0;
    return acc + (precioUnitario * item.cantidad);
  }, 0);

  const margen = productoActual && costoTotal > 0 && productoActual.precio > 0
    ? Math.round(((productoActual.precio - costoTotal) / productoActual.precio) * 100)
    : null;

  if (cargando) return <div style={{ padding: 40 }}>Cargando...</div>;

  return (
    <div style={{ padding: 30, maxWidth: 700 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 6 }}>
        Recetas y tipo de stock
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Define como se descuenta el stock para cada producto.
      </p>

      {mensaje && (
        <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 16 }}>{mensaje}</p>
      )}

      {/* SELECTOR DE PRODUCTO */}
      <div style={{
        backgroundColor: "#fff", borderRadius: 12, padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24,
      }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Seleccionar producto
        </label>
        <select
          value={productoSeleccionado ?? ""}
          onChange={(e) => setProductoSeleccionado(Number(e.target.value))}
          style={{ ...inputStyle, marginTop: 6, marginBottom: 0 }}
        >
          {productos.map((p) => {
            const carrito = carritos.find((c) => c.id === p.carrito_id);
            return (
              <option key={p.id} value={p.id}>
                {p.nombre_producto} {carrito ? `(${carrito.nombre_comercial})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {productoActual && (
        <>
          {/* TIPO DE STOCK */}
          <div style={{
            backgroundColor: "#fff", borderRadius: 12, padding: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24,
          }}>
            <h2 style={{ fontWeight: 600, fontSize: 15, color: "#000", marginBottom: 16 }}>
              {productoActual.nombre_producto}
              {carritoDelProducto && (
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>
                  {carritoDelProducto.nombre_comercial}
                </span>
              )}
            </h2>

            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Tipo de control de stock
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              {[
                { valor: "ninguno", label: "Sin control", desc: "No descuenta stock" },
                { valor: "simple", label: "Stock directo", desc: "Descuenta 1 unidad por venta" },
                { valor: "receta", label: "Con receta", desc: "Descuenta ingredientes" },
              ].map((tipo) => (
                <button
                  key={tipo.valor}
                  onClick={() => cambiarTipoStock(productoActual.id, tipo.valor)}
                  style={{
                    flex: 1, padding: "10px 8px", border: "none", borderRadius: 8,
                    cursor: "pointer", textAlign: "center",
                    backgroundColor: productoActual.tipo_stock === tipo.valor ? "#16a34a" : "#f3f4f6",
                    color: productoActual.tipo_stock === tipo.valor ? "#fff" : "#374151",
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 3px" }}>{tipo.label}</p>
                  <p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>{tipo.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* RECETA */}
          {productoActual.tipo_stock === "receta" && (
            <div style={{
              backgroundColor: "#fff", borderRadius: 12, padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24,
            }}>
              <h2 style={{ fontWeight: 600, fontSize: 15, color: "#000", marginBottom: 16 }}>
                Ingredientes de la receta
              </h2>

              {receta.length === 0 && (
                <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
                  No hay ingredientes en esta receta todavia.
                </p>
              )}

              {receta.map((item) => {
                const costoItem = (item.ingredientes.precio_unitario || 0) * item.cantidad;
                return (
                  <div key={item.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0", borderBottom: "1px solid #f3f4f6",
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#111", margin: 0, fontSize: 14 }}>
                        {item.ingredientes.nombre}
                      </p>
                      <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>
                        {item.cantidad} {item.ingredientes.unidad} por unidad
                        {item.ingredientes.precio_unitario > 0 && (
                          <span style={{ marginLeft: 8, color: "#374151" }}>
                            — ${item.ingredientes.precio_unitario.toLocaleString("es-AR")}/{item.ingredientes.unidad}
                            {" "}= <strong style={{ color: "#111" }}>${costoItem.toLocaleString("es-AR")}</strong>
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => quitarIngrediente(item.id)}
                      style={{ padding: "5px 10px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}

              {/* RESUMEN DE COSTOS */}
              {receta.length > 0 && (
                <div style={{
                  marginTop: 16, backgroundColor: "#f9fafb", borderRadius: 8,
                  padding: "12px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>Costo estimado de produccion</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                      ${costoTotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                  {productoActual.precio > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>Precio de venta</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                          ${productoActual.precio.toLocaleString("es-AR")}
                        </span>
                      </div>
                      {margen !== null && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "#374151" }}>Margen estimado</span>
                          <span style={{
                            fontSize: 14, fontWeight: 700,
                            color: margen >= 40 ? "#16a34a" : margen >= 20 ? "#d97706" : "#dc2626",
                          }}>
                            {margen}%
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {productoActual.precio === 0 && (
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                      Carga el precio de venta en Productos para ver el margen.
                    </p>
                  )}
                </div>
              )}

              {/* AGREGAR INGREDIENTE */}
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280" }}>Ingrediente</label>
                  <select
                    value={form.ingrediente_id}
                    onChange={(e) => setForm({ ...form, ingrediente_id: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Seleccionar...</option>
                    {ingredientes.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.nombre} ({ing.unidad}){ing.precio_unitario > 0 ? ` - $${ing.precio_unitario.toLocaleString("es-AR")}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#6b7280" }}>Cantidad</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    style={{ ...inputStyle, width: 90 }}
                  />
                </div>
                <button
                  onClick={agregarIngrediente}
                  style={{ padding: "9px 16px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Agregar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "9px 12px",
  borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
  marginTop: 4, boxSizing: "border-box", backgroundColor: "#fff",
};