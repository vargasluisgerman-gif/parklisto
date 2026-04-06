import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    const { data, error } = await supabase
      .from("empresas") // 🔥 CORREGIDO
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.log(error);
      return NextResponse.json({ error: error.message });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}