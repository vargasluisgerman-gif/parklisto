import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { empresa_id, tipo_suscripcion } = body;

  await supabase
    .from("empresas")
    .update({ tipo_suscripcion })
    .eq("id", empresa_id);

  return NextResponse.json({ ok: true });
}