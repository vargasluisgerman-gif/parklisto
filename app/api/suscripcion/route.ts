import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mp, Preference } from "@/lib/mercadopago";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { empresa_id, plan_id, email } = await req.json();

    if (!empresa_id || !plan_id || !email) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Obtener plan desde DB
    const { data: plan, error: planError } = await supabaseAdmin
      .from("planes")
      .select("*")
      .eq("id", plan_id)
      .eq("activo", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan inválido o inactivo" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Crear preferencia en MP
    const preference = await new Preference(mp).create({
      body: {
        items: [{
          id: plan_id,
          title: `Parklisto ${plan.nombre}`,
          description: `${plan.pedidos} pedidos incluidos por mes`,
          quantity: 1,
          unit_price: Number(plan.precio),
          currency_id: "ARS",
        }],
        payer: { email },
        external_reference: `${empresa_id}__${plan_id}`,
        back_urls: {
          success: `${baseUrl}/panel/suscripcion?estado=ok&plan=${plan_id}`,
          failure: `${baseUrl}/panel/suscripcion?estado=error`,
          pending: `${baseUrl}/panel/suscripcion?estado=pendiente`,
        },
      },
    });

    // Registrar suscripción pendiente en DB
    await supabaseAdmin.from("suscripciones").insert({
      empresa_id,
      plan: plan_id,
      estado: "pendiente",
      pedidos_incluidos: plan.pedidos,
      pedidos_usados: 0,
      precio: plan.precio,
      mp_preference_id: preference.id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });

  } catch (err: any) {
    console.error("Error creando suscripción completo:", JSON.stringify(err, null, 2));
    return NextResponse.json({ error: err.message, detalle: JSON.stringify(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresa_id = searchParams.get("empresa_id");

    if (!empresa_id) {
      return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("suscripciones")
      .select("*")
      .eq("empresa_id", empresa_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}