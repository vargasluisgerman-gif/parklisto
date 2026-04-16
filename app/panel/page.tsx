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
    const empresaId = await getEmpresaUsuario();
    if (!empresaId) {
      console.error("No se encontró empresa");
      return;
    }
    const res = await fetch(`/api/empresa?id=${empresaId}`);
    const json = await res.json();
    setEmpresa(json.data);
    setLoading(false);
  }

  async function cargarMetricas() {
    const res = await fetch("/api/metricas");
    const json = await res.json();
    setMetricas(json.data);
  }

  if (loading) return (
    <div style={{ padding: 40, backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
      <p style={{ color: "#333" }}>Cargando...</p>
    </div>
  );

  return (
    <div style={{
      padding: 30,
      backgroundColor: "#f5f7fa",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <h1 style={{ fontWeight: "bold", fontSize: 28, marginBottom: 20, color: "#111" }}>
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
        <Metric title="Ventas" value={`$${metricas?.totalVentas || 0}`} />
        <Metric title="Pedidos" value={metricas?.cantidadPedidos || 0} />
        <Metric title="Ticket" value={`$${metricas?.ticketPromedio || 0}`} />
      </div>

      {/* EMPRESA */}
      <div style={{
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 10,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ color: "#111", fontWeight: "bold", marginBottom: 8 }}>
          {empresa?.nombre_comercial}
        </h2>
        <p style={{ color: "#555", margin: 0 }}>
          {empresa?.tipo_suscripcion === "mensual" ? "Plan mensual" : `Saldo: $${empresa?.saldo ?? 0}`}
        </p>
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: "#999" }}>
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
      borderRadius: 10,
      textAlign: "center",
      minWidth: 140,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <p style={{ fontWeight: "bold", fontSize: 14, color: "#555", margin: 0 }}>
        {title}
      </p>
      <h2 style={{ fontWeight: "bold", fontSize: 28, margin: "8px 0 0 0", color: "#111" }}>
        {value}
      </h2>
    </div>
  );
}