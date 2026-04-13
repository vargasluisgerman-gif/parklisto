import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {

    const body = await req.json();

    const pedido_id = Number(body.pedido_id);
    const estado = body.estado;

    console.log("BODY:", body);

    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado })
      .eq("id", pedido_id)
      .select();

    console.log("DATA:", data);
    console.log("ERROR:", error);

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