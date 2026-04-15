"use client";

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
  const router = useRouter();
  const empresaId = empresa?.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  useEffect(() => {
    cargarEmpresa();
    cargarMetricas();
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel("panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        cargarMetricas();
      })
      .subscribe();
    const interval = setInterval(() => cargarMetricas(), 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [empresaId]);

  async function cargarEmpresa() {
    const res = await fetch("/api/empresa?id=1");
    const json = await res.json();
    setEmpresa(json.data);
    setLoading(false);
  }

  async function cargarMetricas() {
    const res = await fetch("/api/metricas");
    const json = await res.json();
    setMetricas(json.data);
  }

  if (loading) return <p style={{ padding: 40 }}>Cargando...</p>;

  return (
    <div style={{ padding: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 style={{ fontWeight: "bold", fontSize: 28, marginBottom: 20 }}>Panel Principal</h1>

      {/* MÉTRICAS */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, justifyContent: "center" }}>
        <Metric title="Ventas" value={`$${metricas?.totalVentas || 0}`} />
        <Metric title="Pedidos" value={metricas?.cantidadPedidos || 0} />
        <Metric title="Ticket" value={`$${metricas?.ticketPromedio || 0}`} />
      </div>

      {/* EMPRESA */}
      <div style={{ background: "white", padding: 20, borderRadius: 10 }}>
        <h2>{empresa?.nombre_comercial}</h2>
        <p>{empresa?.tipo_suscripcion === "mensual" ? "Plan mensual" : `Saldo: $${empresa?.saldo ?? 0}`}</p>
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: "#777" }}>
        © PARKLISTO 2026 — Todos los derechos reservados
      </div>
    </div>
  );
}

function Metric({ title, value }: any) {
  return (
    <div style={{
      background: "white",
      padding: 20,
      borderRadius: 10,
      textAlign: "center",
      minWidth: 140,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <p style={{ fontWeight: "bold", fontSize: 14, color: "#555", margin: 0 }}>{title}</p>
      <h2 style={{ fontWeight: "bold", fontSize: 28, margin: "8px 0 0 0" }}>{value}</h2>
    </div>
  );
}