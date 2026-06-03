import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ingrediente_id = searchParams.get("ingrediente_id");

    if (!ingrediente_id) {
      return NextResponse.json({ error: "ingrediente_id requerido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("movimientos_stock")
      .select("id, tipo, cantidad, motivo, remito, pedido_id, created_at")
      .eq("ingrediente_id", ingrediente_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ingrediente_id, empresa_id, tipo, cantidad, motivo, remito, pedido_id } = await req.json();

    if (!ingrediente_id || !empresa_id || !tipo || cantidad === undefined) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("movimientos_stock")
      .insert({
        ingrediente_id,
        empresa_id,
        tipo,
        cantidad,
        motivo: motivo || null,
        remito: remito || null,
        pedido_id: pedido_id || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}