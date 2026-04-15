"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  const empresaId = empresa?.id ?? null;

  // 🔒 PROTEGER PANEL
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/login";
      }
    }
    checkSession();
  }, []);

  // 🔓 LOGOUT
  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // 📅 VENCIMIENTO
  const diasRestantes = empresa?.fecha_vencimiento
    ? Math.ceil(
        (new Date(empresa.fecha_vencimiento).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const licenciaVencida = diasRestantes !== null && diasRestantes < 0;

  // 🔥 LÓGICA NEGOCIO
  const activo =
    empresa?.tipo_suscripcion === "mensual"
      ? empresa?.pago_habilitado &&
        (diasRestantes === null || diasRestantes > 0)
      : (empresa?.saldo ?? 0) > 0;

  const accesoCaja = activo;

  useEffect(() => {
    cargarEmpresa();
    cargarMetricas();
  }, []);

  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel("panel-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          cargarMetricas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  async function activarPago() {
    await fetch("/api/empresa/pagar", { method: "POST" });
    cargarEmpresa();
  }

  if (loading) return <p style={styles.loading}>Cargando...</p>;

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.logo}>🍔 PARKLISTO</h1>
          <span style={styles.sub}>Sistema de gestión</span>
        </div>

        <button
          onClick={cerrarSesion}
          style={styles.logoutBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#dc3545";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#dc3545";
          }}
        >
          🚪 Cerrar sesión
        </button>
      </div>

      {/* MÉTRICAS */}
      <div style={styles.metricasGrid}>
        <Metrica titulo="💰 Ventas hoy" valor={`$${metricas?.totalVentas || 0}`} />
        <Metrica titulo="📦 Pedidos" valor={metricas?.cantidadPedidos || 0} />
        <Metrica titulo="🧾 Ticket" valor={`$${metricas?.ticketPromedio || 0}`} />
        <Metrica titulo="👨‍🍳 En cocina" valor={metricas?.enPreparacion || 0} />
      </div>

      {/* EMPRESA */}
      <div style={styles.cardPrincipal}>
        <div>
          <h2>{empresa?.nombre_comercial}</h2>

          {empresa?.tipo_suscripcion === "por_pedido" && (
            <p>💳 Saldo: ${empresa?.saldo ?? 0}</p>
          )}

          {empresa?.tipo_suscripcion === "mensual" && (
            <p>📅 Plan mensual activo</p>
          )}

          <span
            style={{
              ...styles.badge,
              backgroundColor: activo ? "#d4edda" : "#f8d7da",
              color: activo ? "#155724" : "#721c24",
            }}
          >
            {activo ? "🟢 Activo" : "🔴 Bloqueado"}
          </span>

          {licenciaVencida && (
            <p style={styles.alertaError}>Licencia vencida</p>
          )}
        </div>

        {!empresa?.pago_habilitado &&
          empresa?.tipo_suscripcion === "mensual" && (
            <button style={styles.botonPremium} onClick={activarPago}>
              Activar sistema
            </button>
          )}
      </div>

      {/* MODULOS */}
      <div style={styles.grid}>
        <Card icon="💰" titulo="Caja" link="/caja" activo={accesoCaja} />
        <Card icon="👨‍🍳" titulo="Cocina" link="/dashboard" activo />
        <Card icon="📦" titulo="Productos" link="/productos" activo />
	<Card icon="📄" titulo="Pedidos" link="/dashboard" activo />
      </div>
    </div>
  );
}

/* COMPONENTES */

function Card({ icon, titulo, link, activo }: any) {
  return (
    <div
      style={{
        ...styles.card,
        opacity: activo ? 1 : 0.5,
      }}
      onClick={() => activo && (window.location.href = link)}
      onMouseEnter={(e) => {
        if (activo) e.currentTarget.style.transform = "translateY(-5px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={styles.icon}>{icon}</div>
      <h3>{titulo}</h3>
      <p>{activo ? "Entrar" : "Bloqueado"}</p>
    </div>
  );
}

function Metrica({ titulo, valor }: any) {
  return (
    <div style={styles.metricaCard}>
      <p>{titulo}</p>
      <h2>{valor}</h2>
    </div>
  );
}

/* ESTILOS */

const styles: any = {
  app: {
    minHeight: "100vh",
    padding: 30,
    background: "#f5f7fa",
    fontFamily: "system-ui",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  logo: { margin: 0 },
  sub: { color: "#666" },

  logoutBtn: {
    background: "transparent",
    border: "1px solid #dc3545",
    color: "#dc3545",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },

  metricasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 15,
    marginBottom: 20,
  },

  metricaCard: {
    background: "white",
    padding: 15,
    borderRadius: 12,
  },

  cardPrincipal: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    display: "flex",
    justifyContent: "space-between",
  },

  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 20,
    marginTop: 10,
  },

  alertaError: {
    color: "red",
    marginTop: 10,
  },

  botonPremium: {
    background: "#007bff",
    color: "white",
    padding: 10,
    border: "none",
    borderRadius: 8,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    cursor: "pointer",
    transition: "0.2s",
  },

  icon: { fontSize: 30 },

  loading: {
    padding: 40,
  },
};