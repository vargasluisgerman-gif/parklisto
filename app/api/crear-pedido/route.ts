import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { empresa_id: empresaId, nombre, productos, carrito_id } = body;

    if (!empresaId || !productos || productos.length === 0) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // ── VERIFICAR SUSCRIPCIÓN ACTIVA ──────────────────────────────
    const { data: suscripcion } = await supabaseAdmin
      .from("suscripciones")
      .select("id, pedidos_incluidos, pedidos_usados, estado, fecha_vencimiento")
      .eq("empresa_id", empresaId)
      .eq("estado", "activa")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!suscripcion) {
      return NextResponse.json({
        error: "Sin suscripcion activa. Contrata un plan para continuar.",
        codigo: "SIN_SUSCRIPCION",
      }, { status: 403 });
    }

    // Verificar si vencio
    if (suscripcion.fecha_vencimiento && new Date(suscripcion.fecha_vencimiento) < new Date()) {
      return NextResponse.json({
        error: "Tu suscripcion vencio. Renova tu plan para continuar.",
        codigo: "SUSCRIPCION_VENCIDA",
      }, { status: 403 });
    }

    // Verificar limite de pedidos
    if (suscripcion.pedidos_usados >= suscripcion.pedidos_incluidos) {
      return NextResponse.json({
        error: `Alcanzaste el limite de ${suscripcion.pedidos_incluidos} pedidos de tu plan. Renova o cambia de plan para continuar.`,
        codigo: "LIMITE_ALCANZADO",
        pedidos_incluidos: suscripcion.pedidos_incluidos,
        pedidos_usados: suscripcion.pedidos_usados,
      }, { status: 403 });
    }

    // ── OBTENER CARRITO ───────────────────────────────────────────
    let carritoId = carrito_id;

    if (!carritoId) {
      const { data: carrito, error: errorCarrito } = await supabaseAdmin
        .from("carritos")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("activo", true)
        .limit(1)
        .single();

      if (errorCarrito || !carrito) {
        return NextResponse.json({ error: "No se encontro carrito" }, { status: 500 });
      }
      carritoId = carrito.id;
    }

    // ── NÚMERO DE PEDIDO ──────────────────────────────────────────
    const { data: ultimoPedido } = await supabaseAdmin
      .from("pedidos")
      .select("numero")
      .eq("empresa_id", empresaId)
      .order("numero", { ascending: false })
      .limit(1);

    const nuevoNumero =
      ultimoPedido && ultimoPedido.length > 0
        ? ultimoPedido[0].numero + 1
        : 1;

    // ── CREAR PEDIDO ──────────────────────────────────────────────
    const { data: pedidoData, error: errorPedido } = await supabaseAdmin
      .from("pedidos")
      .insert([{
        carrito_id: carritoId,
        empresa_id: empresaId,
        numero: nuevoNumero,
        nombre: nombre || "Cliente",
        estado: "Esperando",
        total: 0,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (errorPedido || !pedidoData || pedidoData.length === 0) {
      return NextResponse.json({ error: errorPedido?.message || "Error creando pedido" }, { status: 500 });
    }

    const pedido = pedidoData[0];

    // ── TRAER PRECIOS ─────────────────────────────────────────────
    const ids = productos.map((p: any) => p.producto_id);
    const { data: productosDB, error: errorProductos } = await supabaseAdmin
      .from("productos")
      .select("id, precio")
      .in("id", ids);

    if (errorProductos || !productosDB) {
      return NextResponse.json({ error: "Error trayendo productos" }, { status: 500 });
    }

    // ── CALCULAR TOTAL ────────────────────────────────────────────
    let total = 0;
    const detalle = productos.map((p: any) => {
      const prod = productosDB.find((x: any) => x.id === p.producto_id);
      const subtotal = (prod?.precio ?? 0) * p.cantidad;
      total += subtotal;
      return {
        pedido_id: pedido.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: prod?.precio ?? 0,
      };
    });

    // ── INSERTAR DETALLE ──────────────────────────────────────────
    const { error: errorDetalle } = await supabaseAdmin
      .from("pedido_productos")
      .insert(detalle);

    if (errorDetalle) {
      return NextResponse.json({ error: errorDetalle.message }, { status: 500 });
    }

    // ── ACTUALIZAR TOTAL ──────────────────────────────────────────
    await supabaseAdmin
      .from("pedidos")
      .update({ total })
      .eq("id", pedido.id);

    // ── DESCONTAR 1 CRÉDITO DE LA SUSCRIPCIÓN ────────────────────
    await supabaseAdmin
      .from("suscripciones")
      .update({ pedidos_usados: suscripcion.pedidos_usados + 1 })
      .eq("id", suscripcion.id);

    console.log(`[Pedido] Creado #${nuevoNumero} — Creditos: ${suscripcion.pedidos_usados + 1}/${suscripcion.pedidos_incluidos}`);

    return NextResponse.json({
      pedido_id: pedido.id,
      total,
      creditos_restantes: suscripcion.pedidos_incluidos - (suscripcion.pedidos_usados + 1),
    });

  } catch (err: any) {
    console.log("ERROR GENERAL:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}