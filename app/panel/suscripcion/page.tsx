"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Suscripcion = {
  id: number;
  plan: string;
  estado: string;
  pedidos_incluidos: number;
  pedidos_usados: number;
  precio: number;
  fecha_vencimiento: string;
};

type Plan = {
  id: string;
  nombre: string;
  precio: number;
  pedidos: number;
  activo: boolean;
  destacado: boolean;
  descripcion: string;
};

export default function SuscripcionPage() {
  const searchParams = useSearchParams();
  const estado = searchParams.get("estado");
  const planParam = searchParams.get("plan");

  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (estado === "ok") {
      setMensaje(`Plan activado correctamente. Tu plan ${planParam} esta activo.`);
    } else if (estado === "error") {
      setMensaje("Hubo un error en el pago. Intenta de nuevo.");
    } else if (estado === "pendiente") {
      setMensaje("El pago esta pendiente de confirmacion.");
    }
  }, [estado, planParam]);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
    const empId = await getEmpresaUsuario();
    if (!empId) return;
    setEmpresaId(Number(empId));

    const { data: userData } = await supabase.auth.getUser();
    setEmail(userData.user?.email || "");

    // Cargar planes desde DB
    const planesRes = await fetch("/api/admin/planes");
    const planesJson = await planesRes.json();
    setPlanes((planesJson.data || []).filter((p: Plan) => p.activo));

    // Cargar suscripción activa
    const suscRes = await fetch(`/api/suscripcion?empresa_id=${empId}`);
    const suscJson = await suscRes.json();
    setSuscripcion(suscJson.data || null);
  }

  async function suscribirse(planId: string) {
    if (!empresaId || !email) return;
    setLoading(planId);

    const res = await fetch("/api/suscripcion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: empresaId, plan_id: planId, email }),
    });

    const json = await res.json();

    if (!res.ok) {
      alert("Error: " + json.error);
      setLoading(null);
      return;
    }

    // Usar sandbox_init_point en desarrollo, init_point en producción
    const url = process.env.NODE_ENV === "development"
      ? json.sandbox_init_point || json.init_point
      : json.init_point;

    window.location.href = url;
  }

  const porcentajeUso = suscripcion
    ? Math.min(Math.round((suscripcion.pedidos_usados / suscripcion.pedidos_incluidos) * 100), 100)
    : 0;

  const diasRestantes = suscripcion?.fecha_vencimiento
    ? Math.max(0, Math.ceil((new Date(suscripcion.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div style={{ padding: 30, maxWidth: 700 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 6 }}>
        Planes y suscripcion
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Cada plan incluye pedidos mensuales. Al renovar se reinicia el contador.
      </p>

      {mensaje && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          backgroundColor: estado === "ok" ? "#EAF3DE" : estado === "error" ? "#FCEBEB" : "#FAEEDA",
          color: estado === "ok" ? "#3B6D11" : estado === "error" ? "#A32D2D" : "#854F0B",
          fontWeight: 500, fontSize: 14,
        }}>
          {mensaje}
        </div>
      )}

      {/* SUSCRIPCIÓN ACTIVA */}
      {suscripcion && suscripcion.estado === "activa" && (
        <div style={{
          backgroundColor: "#fff", borderRadius: 12, padding: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 28,
          border: "2px solid #185FA5",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#185FA5", margin: "0 0 4px", textTransform: "uppercase" }}>
                Plan activo
              </p>
              <h2 style={{ fontWeight: 700, fontSize: 20, color: "#000", margin: 0 }}>
                {suscripcion.plan.charAt(0).toUpperCase() + suscripcion.plan.slice(1)}
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 2px" }}>Vence en</p>
              <p style={{ fontWeight: 700, fontSize: 16, color: diasRestantes <= 5 ? "#dc2626" : "#000", margin: 0 }}>
                {diasRestantes} dias
              </p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
              <span>Pedidos usados</span>
              <span>{suscripcion.pedidos_usados} / {suscripcion.pedidos_incluidos}</span>
            </div>
            <div style={{ height: 8, backgroundColor: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${porcentajeUso}%`,
                backgroundColor: porcentajeUso >= 90 ? "#dc2626" : porcentajeUso >= 70 ? "#f59e0b" : "#16a34a",
                borderRadius: 99,
                transition: "width 0.3s",
              }} />
            </div>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {suscripcion.pedidos_incluidos - suscripcion.pedidos_usados} pedidos restantes
            </p>
          </div>
        </div>
      )}

      {/* PLANES */}
      <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 16 }}>
        {suscripcion?.estado === "activa" ? "Cambiar o renovar plan" : "Elegi tu plan"}
      </h2>

      {planes.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando planes...</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {planes.map((plan) => (
          <div
            key={plan.id}
            style={{
              backgroundColor: "#fff", borderRadius: 12, padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: plan.destacado ? "2px solid #185FA5" : "0.5px solid #e5e7eb",
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            {plan.destacado && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Recomendado
              </span>
            )}
            <h3 style={{ fontWeight: 700, fontSize: 18, color: "#000", margin: 0 }}>{plan.nombre}</h3>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#185FA5", margin: 0 }}>
              ${Number(plan.precio).toLocaleString("es-AR")}
              <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>/mes</span>
            </p>
            <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{plan.pedidos} pedidos incluidos</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{plan.descripcion}</p>
            <button
              onClick={() => suscribirse(plan.id)}
              disabled={loading === plan.id}
              style={{
                marginTop: 8, padding: "10px 0",
                backgroundColor: loading === plan.id ? "#9ca3af" : "#185FA5",
                color: "#fff", border: "none", borderRadius: 8,
                fontWeight: 700, fontSize: 14,
                cursor: loading === plan.id ? "not-allowed" : "pointer",
              }}
            >
              {loading === plan.id ? "Procesando..." : suscripcion?.estado === "activa" && suscripcion.plan === plan.id ? "Renovar" : "Contratar"}
            </button>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
        El pago se procesa de forma segura a traves de Mercado Pago.
        Al superar el limite de pedidos el carrito se pausara hasta renovar.
      </p>
    </div>
  );
}