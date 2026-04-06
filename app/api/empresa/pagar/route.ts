import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST() {
  const { error } = await supabase
    .from("empresas")
    .update({ pago_habilitado: true })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message });
  }

  return NextResponse.json({ ok: true });
}