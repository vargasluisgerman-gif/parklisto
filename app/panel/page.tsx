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

export default function PanelPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [metricas, setMetricas] = useState<any>(null);
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

    // Cargar métricas iniciales
    cargarMetricas(empresaId);

    // Realtime para actualizar métricas cuando hay pedidos nuevos
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
        () => cargarMetricas(empresaId)
      )
      .subscribe();

    // Actualización cada 30 segundos como respaldo
    const interval = setInterval(() => cargarMetricas(empresaId), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [empresaId]);

  async function cargarEmpresa() {
    const empId = await getEmpresaUsuario();

    if (!empId) {
      console.error("No se encontró empresa — redirigiendo a onboarding");
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

  if (loading) return (
    <div style={{ padding: 40, backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <p style={{ color: "#111827", fontWeight: 500 }}>Cargando...</p>
    </div>
  );

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

      {/* MÉTRICAS */}
      <div style={{
        display: "flex",
        gap: 20,
        marginBottom: 20,
        justifyContent: "center",
        flexWrap: "wrap",
      }}>
        <Metric title="Ventas hoy" value={`$${metricas?.totalVentas || 0}`} />
        <Metric title="Pedidos hoy" value={metricas?.cantidadPedidos || 0} />
        <Metric title="Ticket promedio" value={`$${metricas?.ticketPromedio || 0}`} />
        <Metric title="En preparación" value={metricas?.enPreparacion || 0} />
      </div>

      {/* EMPRESA */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 12,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ color: "#000000", fontWeight: 700, marginBottom: 8 }}>
          {empresa?.nombre_comercial}
        </h2>
        <p style={{ color: "#111827", margin: 0, fontWeight: 500 }}>
          {empresa?.tipo_suscripcion === "mensual"
            ? "Plan mensual"
            : `Saldo: $${empresa?.saldo ?? 0}`}
        </p>
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
      backgroundColor: "#ffffff",
      padding: 20,
      borderRadius: 12,
      textAlign: "center",
      minWidth: 140,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <p style={{ fontWeight: 600, fontSize: 14, color: "#374151", margin: 0 }}>
        {title}
      </p>
      <h2 style={{ fontWeight: 700, fontSize: 28, margin: "8px 0 0 0", color: "#000000" }}>
        {value}
      </h2>
    </div>
  );
}