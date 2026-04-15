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

  // 🔒 AUTH
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  // 🔓 LOGOUT
  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // 📅 FECHAS
  const diasRestantes = empresa?.fecha_vencimiento
    ? Math.ceil(
        (new Date(empresa.fecha_vencimiento).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const activo =
    empresa?.tipo_suscripcion === "mensual"
      ? empresa?.pago_habilitado &&
        (diasRestantes === null || diasRestantes > 0)
      : (empresa?.saldo ?? 0) > 0;

  // 🔄 CARGA INICIAL
  useEffect(() => {
    cargarEmpresa();
    cargarMetricas();
  }, []);

  // 🔥 REALTIME + REFRESH
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel("panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          cargarMetricas();
        }
      )
      .subscribe();

    // 🔁 fallback cada 10s
    const interval = setInterval(() => {
      cargarMetricas();
    }, 10000);

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
    <div style={styles.layout}>
      
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>🍔 PARKLISTO</h2>

        <NavItem label="Panel" onClick={() => router.push("/panel")} />
        <NavItem label="Caja" onClick={() => router.push("/caja")} />
        <NavItem label="Cocina" onClick={() => router.push("/dashboard")} />
        <NavItem label="Productos" onClick={() => router.push("/productos")} />

        <div style={{ marginTop: "auto" }}>
          <button onClick={cerrarSesion} style={styles.logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={styles.content}>
        
        {/* HEADER */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Panel principal</h1>
        </div>

        {/* MÉTRICAS */}
        <div style={styles.metrics}>
          <Metric title="Ventas" value={`$${metricas?.totalVentas || 0}`} />
          <Metric title="Pedidos" value={metricas?.cantidadPedidos || 0} />
          <Metric title="Ticket" value={`$${metricas?.ticketPromedio || 0}`} />
        </div>

        {/* EMPRESA */}
        <div style={styles.card}>
          <h2>{empresa?.nombre_comercial}</h2>
          <p>
            {empresa?.tipo_suscripcion === "mensual"
              ? "Plan mensual"
              : `Saldo: $${empresa?.saldo ?? 0}`}
          </p>
        </div>

        {/* FOOTER */}
        <div style={styles.footer}>
          © PARKLISTO 2026 — Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}

/* COMPONENTES */

function NavItem({ label, onClick }: any) {
  return (
    <div style={styles.navItem} onClick={onClick}>
      {label}
    </div>
  );
}

function Metric({ title, value }: any) {
  return (
    <div style={styles.metric}>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

/* ESTILOS */

const styles: any = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "system-ui",
  },

  sidebar: {
    width: 220,
    background: "#111",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },

  sidebarTitle: {
    fontWeight: "bold",
    marginBottom: 30,
  },

  navItem: {
    padding: 10,
    cursor: "pointer",
  },

  logout: {
    marginTop: 20,
    padding: 10,
    background: "#dc3545",
    border: "none",
    color: "white",
    borderRadius: 6,
  },

  content: {
    flex: 1,
    padding: 30,
    background: "#f5f7fa",
  },

  header: {
    marginBottom: 20,
  },

  headerTitle: {
    fontWeight: "bold",
    fontSize: 28,
  },

  metrics: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
  },

  metric: {
    background: "white",
    padding: 20,
    borderRadius: 10,
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 10,
  },

  footer: {
    marginTop: 40,
    fontSize: 12,
    color: "#777",
  },
};