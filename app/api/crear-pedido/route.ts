import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("BODY:", body);

    const { carrito_id, nombre, productos } = body;

    if (!carrito_id || !productos || productos.length === 0) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    // 🔹 obtener último número
    const { data: ultimoPedido, error: errorUltimo } = await supabase
      .from("pedidos")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1);

    if (errorUltimo) {
      console.log("ERROR ULTIMO:", errorUltimo);
      return NextResponse.json({ error: errorUltimo.message }, { status: 500 });
    }

    const nuevoNumero =
      ultimoPedido && ultimoPedido.length > 0
        ? ultimoPedido[0].numero + 1
        : 1;

    // 🔹 crear pedido
    const { data: pedidoData, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([
        {
          carrito_id,
          numero: nuevoNumero,
          nombre: nombre || "Cliente",
          estado: "Esperando",
          total: 0,
          empresa_id: 1,
        },
      ])
      .select();

    if (errorPedido) {
      console.log("ERROR PEDIDO:", errorPedido);
      return NextResponse.json(
        { error: errorPedido.message },
        { status: 500 }
      );
    }

    const pedido = pedidoData[0];

    // 🔹 traer productos
    const ids = productos.map((p: any) => p.producto_id);

    const { data: productosDB, error: errorProductos } = await supabase
      .from("productos")
      .select("id, precio, carrito_id")
      .in("id", ids);

    if (errorProductos) {
      console.log("ERROR PRODUCTOS:", errorProductos);
      return NextResponse.json(
        { error: errorProductos.message },
        { status: 500 }
      );
    }

    // 🔹 detalle
    let total = 0;

    const detalle = productos.map((p: any) => {
      const prod = productosDB.find((x) => x.id === p.producto_id);

      if (!prod) {
        throw new Error("Producto no encontrado");
      }

      const subtotal = prod.precio * p.cantidad;
      total += subtotal;

      return {
        pedido_id: pedido.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: prod.precio,
      };
    });

    // 🔹 insertar detalle
    const { error: errorDetalle } = await supabase
      .from("pedido_productos")
      .insert(detalle);

    if (errorDetalle) {
      console.log("ERROR DETALLE:", errorDetalle);
      return NextResponse.json(
        { error: errorDetalle.message },
        { status: 500 }
      );
    }

    // 🔹 actualizar total
    const { error: errorTotal } = await supabase
      .from("pedidos")
      .update({ total })
      .eq("id", pedido.id);

    if (errorTotal) {
      console.log("ERROR TOTAL:", errorTotal);
      return NextResponse.json(
        { error: errorTotal.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pedido_id: pedido.id,
      total,
    });

  } catch (err: any) {
    console.log("ERROR GENERAL:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}