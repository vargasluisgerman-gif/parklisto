import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — traer todos los planes
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("planes")
      .select("*")
      .order("precio", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — crear nuevo plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, precio, pedidos, activo, destacado, descripcion } = body;

    if (!id || !nombre || !precio || !pedidos) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("planes")
      .insert({
        id,
        nombre,
        precio,
        pedidos,
        activo: activo ?? true,
        destacado: destacado ?? false,
        descripcion: descripcion || "",
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

// PUT — actualizar plan existente
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, precio, pedidos, activo, destacado, descripcion } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("planes")
      .update({ nombre, precio, pedidos, activo, destacado, descripcion })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}