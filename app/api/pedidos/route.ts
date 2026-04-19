import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const carrito_id = Number(searchParams.get("carrito_id")) || null;
    const empresa_id = Number(searchParams.get("empresa_id")) || null;

    if (!empresa_id) {
      return NextResponse.json(
        { error: "empresa_id es obligatorio" },
        { status: 400 }
      );
    }

    // 🔥 Traer pedidos + productos
    let query = supabase
      .from("pedidos")
      .select(`
        id,
        numero,
        nombre,
        estado,
        created_at,
        pedido_productos (
          id,
          cantidad,
          precio_unitario,
          producto_id
        )
      `)
      .eq("empresa_id", empresa_id)
      .order("created_at", { ascending: false });

    if (carrito_id) {
      query = query.eq("carrito_id", carrito_id);
    }

    const { data: pedidos, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 🔥 Resolver nombres de productos manualmente
    const pedidosConTotal = await Promise.all(
      pedidos.map(async (pedido: any) => {
        const items = pedido.pedido_productos || [];
        const productosIds = items.map((i: any) => i.producto_id);
        let productosMap: any = {};

        if (productosIds.length > 0) {
          const { data: productosData } = await supabase
            .from("productos")
            .select("id, nombre_producto")
            .in("id", productosIds);

          productosMap = Object.fromEntries(
            (productosData || []).map((p: any) => [p.id, p])
          );
        }

        const itemsConNombre = items.map((item: any) => ({
          ...item,
          productos: productosMap[item.producto_id] || null,
        }));

        const total = itemsConNombre.reduce(
          (acc: number, item: any) =>
            acc + item.cantidad * item.precio_unitario,
          0
        );

        return {
          id: pedido.id,
          numero: pedido.numero,
          nombre: pedido.nombre,
          estado: pedido.estado,
          total,
          created_at: pedido.created_at,
          productos: itemsConNombre,
        };
      })
    );

    return NextResponse.json({ data: pedidosConTotal });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}