import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pedido_id = Number(body.pedido_id);
    const estado = body.estado;

    if (!pedido_id || !estado) {
      return NextResponse.json(
        { error: "pedido_id y estado son requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .update({ estado })
      .eq("id", pedido_id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}