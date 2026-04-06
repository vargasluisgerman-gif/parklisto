import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

// 🔥 CREATE
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { nombre_producto, precio, carrito_id, empresa_id } = body;

    if (!nombre_producto || !precio) {
      return NextResponse.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("productos")
      .insert([
        {
          nombre_producto,
          precio,
          activo: true,
          carrito_id,
          
        },
      ])
      .select();

    if (error) {
      console.log("ERROR INSERT:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.log("ERROR POST:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}


// 🔥 READ
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log("ERROR GET:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.log("ERROR GET:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}


// 🔥 UPDATE
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const { id, precio, activo } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID requerido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("productos")
      .update({
        precio,
        activo,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.log("ERROR UPDATE:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    console.log("ERROR PUT:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}


// 🔥 DELETE
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("ERROR DELETE:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.log("ERROR DELETE:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}