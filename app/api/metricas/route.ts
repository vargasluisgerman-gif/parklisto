import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET() {
  try {
    // 🔥 hoy (inicio del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("pedidos")
      .select("id, total, estado, created_at")
      .gte("created_at", hoy.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message });
    }

    const pedidos = data || [];

    const totalVentas = pedidos.reduce(
      (acc, p) => acc + (p.total || 0),
      0
    );

    const cantidadPedidos = pedidos.length;

    const ticketPromedio =
      cantidadPedidos > 0
        ? Math.round(totalVentas / cantidadPedidos)
        : 0;

    const enPreparacion = pedidos.filter(
      (p) => p.estado !== "Listo"
    ).length;

    return NextResponse.json({
      data: {
        totalVentas,
        cantidadPedidos,
        ticketPromedio,
        enPreparacion,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}