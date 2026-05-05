import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🔥 CREATE
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre_producto, precio, carrito_id } = body;

    if (!nombre_producto || !precio || !carrito_id) {
      return NextResponse.json(
        { error: "Faltan datos: nombre_producto, precio y carrito_id son requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("productos")
      .insert([
        {
          nombre_producto,
          precio,
          activo: true,
          carrito_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.log("ERROR INSERT:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.log("ERROR POST:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔥 READ — filtra por carrito_id si se pasa como query param
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const carrito_id = searchParams.get("carrito_id");

    let query = supabaseAdmin
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (carrito_id) {
      query = query.eq("carrito_id", carrito_id);
    }

    const { data, error } = await query;

    if (error) {
      console.log("ERROR GET:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.log("ERROR GET:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔥 UPDATE
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, precio, activo } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("productos")
      .update({ precio, activo })
      .eq("id", id)
      .select();

    if (error) {
      console.log("ERROR UPDATE:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.log("ERROR PUT:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔥 DELETE
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("productos")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("ERROR DELETE:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.log("ERROR DELETE:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}