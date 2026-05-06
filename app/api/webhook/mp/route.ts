import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mp, Payment } from "@/lib/mercadopago";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLANES: Record<string, { pedidos: number; precio: number }> = {
  basico:   { pedidos: 100, precio: 15000 },
  pro:      { pedidos: 250, precio: 25000 },
  business: { pedidos: 500, precio: 40000 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[MP Webhook] Evento recibido:", JSON.stringify(body));

    // MP manda type "payment" para pagos
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true, ignorado: body.type });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    // Obtener detalles del pago desde MP
    const pago = await new Payment(mp).get({ id: paymentId });
    console.log("[MP Webhook] Pago:", pago.status, pago.external_reference);

    if (pago.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    // external_reference = "empresa_id__plan_id"
    const [empresaIdStr, planId] = (pago.external_reference || "").split("__");
    const empresaId = Number(empresaIdStr);
    const plan = PLANES[planId];

    if (!empresaId || !plan) {
      console.error("[MP Webhook] Referencia inválida:", pago.external_reference);
      return NextResponse.json({ ok: true });
    }

    // Idempotencia — verificar si ya procesamos este pago
    const { data: yaProcessado } = await supabaseAdmin
      .from("suscripciones")
      .select("id")
      .eq("mp_payment_id", String(paymentId))
      .single();

    if (yaProcessado) {
      console.log("[MP Webhook] Pago ya procesado:", paymentId);
      return NextResponse.json({ ok: true, duplicado: true });
    }

    // Calcular fechas
    const ahora = new Date();
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30);

    // Actualizar suscripción pendiente → activa
    const { error: updateError } = await supabaseAdmin
      .from("suscripciones")
      .update({
        estado: "activa",
        pedidos_usados: 0,
        pedidos_incluidos: plan.pedidos,
        fecha_inicio: ahora.toISOString(),
        fecha_vencimiento: vencimiento.toISOString(),
        mp_payment_id: String(paymentId),
      })
      .eq("empresa_id", empresaId)
      .eq("estado", "pendiente");

    if (updateError) {
      console.error("[MP Webhook] Error actualizando suscripción:", updateError);
    }

    // Actualizar empresa con plan activo
    await supabaseAdmin
      .from("empresas")
      .update({
        plan: planId,
        pago_habilitado: true,
        fecha_vencimiento: vencimiento.toISOString(),
      })
      .eq("id", empresaId);

    console.log(`[MP Webhook] Plan ${planId} activado para empresa ${empresaId}`);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error("[MP Webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}