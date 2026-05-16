import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { pedido_id, suscripcion } = await req.json();

    if (!pedido_id || !suscripcion?.endpoint) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Borrar suscripción anterior del mismo pedido si existe
    await supabaseAdmin
      .from("push_suscripciones")
      .delete()
      .eq("pedido_id", pedido_id);

    // Guardar nueva suscripción
    const { error } = await supabaseAdmin
      .from("push_suscripciones")
      .insert({
        pedido_id,
        endpoint: suscripcion.endpoint,
        p256dh: suscripcion.keys.p256dh,
        auth: suscripcion.keys.auth,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}