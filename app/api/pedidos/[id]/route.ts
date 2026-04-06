import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // 🔥 ACA está el cambio
    const pedidoId = Number(id);

    if (isNaN(pedidoId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pedido_productos")
      .select(`
        id,
        cantidad,
        precio_unitario,
        productos (
          nombre_producto,
          precio
        )
      `)
      .eq("pedido_id", pedidoId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}