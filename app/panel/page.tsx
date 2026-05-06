"use client";

import { getEmpresaUsuario } from "@/lib/getEmpresa";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Empresa = {
  id: number;
  nombre_comercial: string;
  pago_habilitado: boolean;
  fecha_vencimiento?: string;
  tipo_suscripcion: "mensual" | "por_pedido";
  saldo: number;
};

type Suscripcion = {
  plan: string;
  estado: string;
  pedidos_incluidos: number;
  pedidos_usados: number;
  fecha_vencimiento: string;
};

export default function PanelPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [metricas, setMetricas] = useState<any>(null);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
    cargarEmpresa();
  }, []);

  useEffect(() => {
    if (!empresaId) return;

    cargarMetricas(empresaId);
    cargarSuscripcion(empresaId);

    const channel = supabase
      .channel(`panel-${empresaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          cargarMetricas(empresaId);
          cargarSuscripcion(empresaId);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      cargarMetricas(empresaId);
      cargarSuscripcion(empresaId);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [empresaId]);

  async function cargarEmpresa() {
    const empId = await getEmpresaUsuario();
    if (!empId) {
      router.replace("/onboarding");
      return;
    }
    setEmpresaId(Number(empId));
    const res = await fetch(`/api/empresa?id=${empId}`);
    const json = await res.json();
    setEmpresa(json.data);
    setLoading(false);
  }

  async function cargarMetricas(empId: number) {
    const res = await fetch(`/api/metricas?empresa_id=${empId}`);
    const json = await res.json();
    setMetricas(json.data);
  }

  async function cargarSuscripcion(empId: number) {
    const res = await fetch(`/api/suscripcion?empresa_id=${empId}`);
    const json = await res.json();
    setSuscripcion(json.data || null);
  }

  if (loading) return (
    <div style={{ padding: 40, backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <p style={{ color: "#111827", fontWeight: 500 }}>Cargando...</p>
    </div>
  );

  const pedidosRestantes = suscripcion
    ? suscripcion.pedidos_incluidos - suscripcion.pedidos_usados
    : 0;

  const porcentajeUso = suscripcion
    ? Math.min(Math.round((suscripcion.pedidos_usados / suscripcion.pedidos_incluidos) * 100), 100)
    : 0;

  const diasRestantes = suscripcion?.fecha_vencimiento
    ? Math.max(0, Math.ceil((new Date(suscripcion.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div style={{
      padding: 30,
      backgroundColor: "#f3f4f6",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <h1 style={{ fontWeight: 700, fontSize: 28, marginBottom: 20, color: "#000000" }}>
        Panel Principal
      </h1>

      {/* ALERTA SIN SUSCRIPCIÓN */}
      {!suscripcion && (
        <div style={{
          width: "100%", maxWidth: 700, marginBottom: 20,
          backgroundColor: "#FAEEDA", borderRadius: 12, padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{ color: "#854F0B", fontWeight: 500, fontSize: 14, margin: 0 }}>
            No tenes un plan activo. Contrata uno para poder recibir pedidos.
          </p>
          <button
            onClick={() => router.push("/panel/suscripcion")}
            style={{
              padding: "8px 16px", backgroundColor: "#854F0B", color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Ver planes
          </button>
        </div>
      )}

      {/* ALERTA LÍMITE ALCANZADO */}
      {suscripcion && pedidosRestantes <= 0 && (
        <div style={{
          width: "100%", maxWidth: 700, marginBottom: 20,
          backgroundColor: "#FCEBEB", borderRadius: 12, padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{ color: "#A32D2D", fontWeight: 500, fontSize: 14, margin: 0 }}>
            Alcanzaste el limite de pedidos de tu plan. El carrito esta pausado.
          </p>
          <button
            onClick={() => router.push("/panel/suscripcion")}
            style={{
              padding: "8px 16px", backgroundColor: "#A32D2D", color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Renovar plan
          </button>
        </div>
      )}

      {/* ALERTA POCOS PEDIDOS */}
      {suscripcion && pedidosRestantes > 0 && pedidosRestantes <= 20 && (
        <div style={{
          width: "100%", maxWidth: 700, marginBottom: 20,
          backgroundColor: "#FAEEDA", borderRadius: 12, padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <p style={{ color: "#854F0B", fontWeight: 500, fontSize: 14, margin: 0 }}>
            Te quedan solo {pedidosRestantes} pedidos en tu plan.
          </p>
          <button
            onClick={() => router.push("/panel/suscripcion")}
            style={{
              padding: "8px 16px", backgroundColor: "#854F0B", color: "#fff",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Renovar
          </button>
        </div>
      )}

      {/* MÉTRICAS */}
      <div style={{
        display: "flex", gap: 20, marginBottom: 20,
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <Metric title="Ventas hoy" value={`$${metricas?.totalVentas || 0}`} />
        <Metric title="Pedidos hoy" value={metricas?.cantidadPedidos || 0} />
        <Metric title="Ticket promedio" value={`$${metricas?.ticketPromedio || 0}`} />
        <Metric title="En preparacion" value={metricas?.enPreparacion || 0} />
      </div>

      {/* EMPRESA + SUSCRIPCIÓN */}
      <div style={{
        backgroundColor: "#ffffff", padding: 20, borderRadius: 12,
        width: "100%", maxWidth: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ color: "#000000", fontWeight: 700, marginBottom: 12 }}>
          {empresa?.nombre_comercial}
        </h2>

        {suscripcion ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Plan activo</p>
                <p style={{ fontWeight: 700, fontSize: 16, color: "#000", margin: 0 }}>
                  {suscripcion.plan.charAt(0).toUpperCase() + suscripcion.plan.slice(1)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Vence en</p>
                <p style={{ fontWeight: 700, fontSize: 16, color: diasRestantes <= 5 ? "#dc2626" : "#000", margin: 0 }}>
                  {diasRestantes} dias
                </p>
              </div>
            </div>

            {/* BARRA DE PROGRESO */}
            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
              <span>Pedidos del mes</span>
              <span>{suscripcion.pedidos_usados} / {suscripcion.pedidos_incluidos}</span>
            </div>
            <div style={{ height: 8, backgroundColor: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
              <div style={{
                height: "100%",
                width: `${porcentajeUso}%`,
                backgroundColor: porcentajeUso >= 100 ? "#dc2626" : porcentajeUso >= 80 ? "#f59e0b" : "#16a34a",
                borderRadius: 99,
                transition: "width 0.3s",
              }} />
            </div>
            <p style={{ fontSize: 11, color: pedidosRestantes <= 20 ? "#dc2626" : "#6b7280", margin: "0 0 12px" }}>
              {pedidosRestantes} pedidos restantes
            </p>

            <button
              onClick={() => router.push("/panel/suscripcion")}
              style={{
                width: "100%", padding: "8px 0", backgroundColor: "#f3f4f6",
                border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
                cursor: "pointer", color: "#374151",
              }}
            >
              Ver planes →
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/panel/suscripcion")}
            style={{
              width: "100%", padding: "10px 0", backgroundColor: "#185FA5",
              border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14,
              cursor: "pointer", color: "#fff",
            }}
          >
            Contratar plan →
          </button>
        )}
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
        © PARKLISTO 2026 — Todos los derechos reservados
      </div>
    </div>
  );
}

function Metric({ title, value }: any) {
  return (
    <div style={{
      backgroundColor: "#ffffff", padding: 20, borderRadius: 12,
      textAlign: "center", minWidth: 140,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <p style={{ fontWeight: 600, fontSize: 14, color: "#374151", margin: 0 }}>{title}</p>
      <h2 style={{ fontWeight: 700, fontSize: 28, margin: "8px 0 0 0", color: "#000000" }}>{value}</h2>
    </div>
  );
}