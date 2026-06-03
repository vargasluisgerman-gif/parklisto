import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — obtener receta de un producto
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const producto_id = searchParams.get("producto_id");

    if (!producto_id) {
      return NextResponse.json({ error: "producto_id requerido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("recetas")
      .select(`
        id,
        cantidad,
        ingrediente_id,
        ingredientes (
  id,
  nombre,
  unidad,
  stock_actual,
  precio_unitario
)
      `)
      .eq("producto_id", producto_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — agregar ingrediente a una receta
export async function POST(req: NextRequest) {
  try {
    const { producto_id, ingrediente_id, cantidad } = await req.json();

    if (!producto_id || !ingrediente_id || !cantidad) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Verificar si ya existe esa combinación
    const { data: existente } = await supabaseAdmin
      .from("recetas")
      .select("id")
      .eq("producto_id", producto_id)
      .eq("ingrediente_id", ingrediente_id)
      .single();

    if (existente) {
      // Actualizar cantidad si ya existe
      const { error } = await supabaseAdmin
        .from("recetas")
        .update({ cantidad })
        .eq("id", existente.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, actualizado: true });
    }

    const { error } = await supabaseAdmin
      .from("recetas")
      .insert({ producto_id, ingrediente_id, cantidad });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — quitar ingrediente de una receta
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("recetas")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}