import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // ── EMPRESAS ──────────────────────────────────────────────────
    const { data: empresas } = await supabaseAdmin
      .from("empresas")
      .select("id, nombre_comercial, email, activo, plan, created_at");

    const totalEmpresas = empresas?.length || 0;
    const empresasActivas = empresas?.filter((e: any) => e.activo).length || 0;
    const empresasInactivas = totalEmpresas - empresasActivas;

    // ── SUSCRIPCIONES ─────────────────────────────────────────────
    const { data: suscripciones } = await supabaseAdmin
      .from("suscripciones")
      .select("*")
      .order("created_at", { ascending: false });

    const suscActivas = suscripciones?.filter((s: any) => s.estado === "activa") || [];
    const suscVencidas = suscripciones?.filter((s: any) => {
      return s.estado === "activa" && new Date(s.fecha_vencimiento) < new Date();
    }) || [];

    const hoy = new Date();
    const en7dias = new Date();
    en7dias.setDate(en7dias.getDate() + 7);

    const suscProximasVencer = suscripciones?.filter((s: any) => {
      const vence = new Date(s.fecha_vencimiento);
      return s.estado === "activa" && vence > hoy && vence <= en7dias;
    }) || [];

    // ── INGRESOS POR PLAN ─────────────────────────────────────────
    const ingresosPorPlan: Record<string, { cantidad: number; ingresos: number; pedidos_totales: number }> = {};

    suscripciones?.filter((s: any) => s.estado === "activa" || s.mp_payment_id).forEach((s: any) => {
      if (!ingresosPorPlan[s.plan]) {
        ingresosPorPlan[s.plan] = { cantidad: 0, ingresos: 0, pedidos_totales: 0 };
      }
      if (s.mp_payment_id) {
        ingresosPorPlan[s.plan].ingresos += Number(s.precio);
      }
      if (s.estado === "activa") {
        ingresosPorPlan[s.plan].cantidad++;
        ingresosPorPlan[s.plan].pedidos_totales += s.pedidos_usados || 0;
      }
    });

    // Calcular costo por pedido por plan
    const rentabilidadPorPlan = Object.entries(ingresosPorPlan).map(([plan, data]) => ({
      plan,
      cantidad: data.cantidad,
      ingresos: data.ingresos,
      pedidos_totales: data.pedidos_totales,
      costo_por_pedido: data.pedidos_totales > 0
        ? Math.round(data.ingresos / data.pedidos_totales)
        : 0,
    }));

    // ── INGRESOS TOTALES ──────────────────────────────────────────
    const ingresosTotales = suscripciones
      ?.filter((s: any) => s.mp_payment_id)
      .reduce((acc: number, s: any) => acc + Number(s.precio), 0) || 0;

    // ── PEDIDOS ───────────────────────────────────────────────────
    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("id, empresa_id, created_at");

    const totalPedidos = pedidos?.length || 0;

    // ── ANOMALÍAS ─────────────────────────────────────────────────

    // 1. Empresas sin suscripción activa
    const empresasConSuscActiva = new Set(suscActivas.map((s: any) => s.empresa_id));
    const sinSuscripcion = empresas?.filter((e: any) =>
      e.activo && !empresasConSuscActiva.has(e.id)
    ) || [];

    // 2. Suscripciones vencidas sin renovar
    const vencidasSinRenovar = suscripciones?.filter((s: any) => {
      return s.estado === "activa" && new Date(s.fecha_vencimiento) < new Date();
    }).map((s: any) => ({
      ...s,
      empresa: empresas?.find((e: any) => e.id === s.empresa_id),
    })) || [];

    // 3. Empresas con plan pero sin pedidos en los últimos 7 días
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);

    const empresasConPedidosRecientes = new Set(
      pedidos?.filter((p: any) => new Date(p.created_at) > hace7dias)
        .map((p: any) => p.empresa_id)
    );

    const sinActividadReciente = suscActivas
      .filter((s: any) => !empresasConPedidosRecientes.has(s.empresa_id))
      .map((s: any) => ({
        ...s,
        empresa: empresas?.find((e: any) => e.id === s.empresa_id),
      }));

    // 4. Pagos pendientes sin confirmar
    const pagosPendientes = suscripciones?.filter((s: any) =>
      s.estado === "pendiente" && s.mp_preference_id && !s.mp_payment_id
    ).map((s: any) => ({
      ...s,
      empresa: empresas?.find((e: any) => e.id === s.empresa_id),
    })) || [];

    return NextResponse.json({
      data: {
        resumen: {
          totalEmpresas,
          empresasActivas,
          empresasInactivas,
          totalPedidos,
          ingresosTotales,
          suscripcionesActivas: suscActivas.length,
        },
        rentabilidadPorPlan,
        proximasVencer: suscProximasVencer.map((s: any) => ({
          ...s,
          empresa: empresas?.find((e: any) => e.id === s.empresa_id),
        })),
        anomalias: {
          sinSuscripcion,
          vencidasSinRenovar,
          sinActividadReciente,
          pagosPendientes,
        },
      },
    });

  } catch (err: any) {
    console.error("Error stats admin:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}