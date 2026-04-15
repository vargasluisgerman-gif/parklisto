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

  // 🔒 PROTEGER PANEL (LOGIN)
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

  // ✅ Cálculo de días restantes
  const diasRestantes = empresa?.fecha_vencimiento
    ? Math.ceil(
        (new Date(empresa.fecha_vencimiento).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const licenciaVencida = diasRestantes !== null && diasRestantes < 0;

  // 🔥 LÓGICA REAL DEL SISTEMA
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
    await fetch("/api/empresa/pagar", {
      method: "POST",
    });

    cargarEmpresa();
  }

  if (loading) return <p style={styles.loading}>Cargando...</p>;

  return (
    <div style={styles.app}>
      {/* HEADER CON LOGOUT */}
      <div
        style={{
          ...styles.header,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={styles.logo}>🍔 PARKLISTO</h1>
          <span style={styles.sub}>Sistema de gestión</span>
        </div>

        <button
          onClick={cerrarSesion}
          style={{
            background: "#dc3545",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🚪 Salir
        </button>
      </div>

      {/* MÉTRICAS */}
      <div style={styles.metricasGrid}>
        <Metrica
          titulo="💰 Ventas hoy"
          valor={`$${metricas?.totalVentas?.toLocaleString() || 0}`}
        />
        <Metrica
          titulo="📦 Pedidos"
          valor={metricas?.cantidadPedidos || 0}
        />
        <Metrica
          titulo="🧾 Ticket promedio"
          valor={`$${metricas?.ticketPromedio?.toLocaleString() || 0}`}
        />
        <Metrica
          titulo="👨‍🍳 En preparación"
          valor={metricas?.enPreparacion || 0}
        />
      </div>

      {/* EMPRESA */}
      <div style={styles.cardPrincipal}>
        <div>
          <h2>{empresa?.nombre_comercial}</h2>

          {empresa?.tipo_suscripcion === "por_pedido" && (
            <p style={{ marginTop: 5, fontSize: 13 }}>
              💳 Saldo disponible: ${empresa?.saldo ?? 0}
            </p>
          )}

          {empresa?.tipo_suscripcion === "mensual" && (
            <p style={{ marginTop: 5, fontSize: 13 }}>
              📅 Plan mensual activo
            </p>
          )}

          <span
            style={{
              ...styles.badge,
              backgroundColor: activo ? "#d4edda" : "#f8d7da",
              color: activo ? "#155724" : "#721c24",
            }}
          >
            {activo ? "🟢 Sistema activo" : "🔴 Sistema bloqueado"}
          </span>

          {diasRestantes !== null && diasRestantes > 0 && diasRestantes <= 3 && (
            <p style={styles.alertaWarning}>
              ⚠️ Vence en {diasRestantes} día{diasRestantes === 1 ? "" : "s"}
            </p>
          )}

          {licenciaVencida && (
            <p style={styles.alertaError}>❌ Licencia vencida</p>
          )}
        </div>

        {!empresa?.pago_habilitado &&
          empresa?.tipo_suscripcion === "mensual" && (
            <button style={styles.botonPremium} onClick={activarPago}>
              🔓 Activar sistema
            </button>
          )}
      </div>

      {/* MODULOS */}
      <div style={styles.grid}>
        <Card
          icon="💰"
          titulo="Caja"
          descripcion={
            activo
              ? "Cobrar y generar pedidos"
              : "Sistema bloqueado"
          }
          link="/caja"
          activo={accesoCaja}
        />

        <Card
          icon="👨‍🍳"
          titulo="Cocina"
          descripcion="Pedidos en tiempo real"
          link="/dashboard"
          activo={true}
        />

        <Card
          icon="📦"
          titulo="Productos"
          descripcion="Gestionar menú"
          link="/productos"
          activo={true}
        />
      </div>
    </div>
  );
}

/* COMPONENTES */

function Card({ icon, titulo, descripcion, link, activo }: any) {
  return (
    <div
      style={{
        ...styles.card,
        opacity: activo ? 1 : 0.5,
        cursor: activo ? "pointer" : "not-allowed",
      }}
      onClick={() => {
        if (activo) window.location.href = link;
      }}
    >
      <div style={styles.icon}>{icon}</div>
      <h3>{titulo}</h3>
      <p style={styles.desc}>{descripcion}</p>

      {activo ? (
        <span style={styles.link}>Entrar →</span>
      ) : (
        <span style={styles.lock}>🔒 Bloqueado</span>
      )}
    </div>
  );
}

function Metrica({ titulo, valor }: any) {
  return (
    <div style={styles.metricaCard}>
      <p style={styles.metricaTitulo}>{titulo}</p>
      <h2 style={styles.metricaValor}>{valor}</h2>
    </div>
  );
}

/* ESTILOS (NO TOCADOS) */
const styles: any = { /* ... los tuyos ... */ };