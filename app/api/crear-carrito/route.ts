import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre_comercial, slug, activo } = body;

    if (!nombre_comercial || !slug) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("carritos")
      .insert([
        {
          nombre_comercial,
          slug,
          activo: activo ?? true
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ carrito: data });

  } catch (err) {
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
