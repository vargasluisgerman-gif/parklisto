import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const empresa_id = searchParams.get("empresa_id");

    if (!empresa_id) {
      return NextResponse.json({ error: "empresa_id es obligatorio" }, { status: 400 });
    }

    // Hoy desde las 00:00
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, total, estado, created_at")
      .eq("empresa_id", empresa_id)
      .gte("created_at", hoy.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pedidos = data || [];

    const totalVentas = pedidos.reduce((acc, p) => acc + (p.total || 0), 0);
    const cantidadPedidos = pedidos.length;
    const ticketPromedio = cantidadPedidos > 0
      ? Math.round(totalVentas / cantidadPedidos)
      : 0;
    const enPreparacion = pedidos.filter((p) => p.estado !== "Listo").length;

    return NextResponse.json({
      data: {
        totalVentas,
        cantidadPedidos,
        ticketPromedio,
        enPreparacion,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}