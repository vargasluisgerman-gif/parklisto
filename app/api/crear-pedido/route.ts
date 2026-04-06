import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { withLicencia } from "../../lib/withLicencia";

export const POST = withLicencia(async (req: Request, empresa: any) => {
  try {
    const body = await req.json();

    // 🔥 aceptar productos o items
    const { carrito_id, nombre, productos, items } = body;

    const lista = productos || items;

    if (!carrito_id || !lista || lista.length === 0) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const nombreFinal = nombre || "Cliente Mostrador";

    // 1️⃣ Obtener último número
    const { data: ultimoPedido } = await supabase
      .from("pedidos")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1);

    const nuevoNumero =
      ultimoPedido && ultimoPedido.length > 0
        ? ultimoPedido[0].numero + 1
        : 1;

    // 2️⃣ Crear pedido (🔥 empresa dinámica)
    const { data: pedidoData, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([
        {
          carrito_id,
          numero: nuevoNumero,
          nombre: nombreFinal,
          estado: "Esperando",
          total: 0,
          empresa_id: empresa.id, // 🔥 CLAVE
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

    // 3️⃣ IDs productos
    const ids = lista.map((p: any) => p.producto_id);

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

    // 4️⃣ Validar pertenencia al carrito
    for (const prod of productosDB) {
      if (prod.carrito_id !== carrito_id) {
        return NextResponse.json(
          { error: "Producto no pertenece al carrito" },
          { status: 400 }
        );
      }
    }

    // 5️⃣ Armar detalle
    let totalCalculado = 0;

    const detalle = lista.map((p: any) => {
      const productoReal = productosDB.find(
        (db) => db.id === p.producto_id
      );

      if (!productoReal) {
        throw new Error("Producto no encontrado");
      }

      const subtotal = productoReal.precio * p.cantidad;
      totalCalculado += subtotal;

      return {
        pedido_id: pedido.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: productoReal.precio,
      };
    });

    // 6️⃣ Insertar detalle
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

    // 7️⃣ Actualizar total
    const { error: errorTotal } = await supabase
      .from("pedidos")
      .update({ total: totalCalculado })
      .eq("id", pedido.id);

    if (errorTotal) {
      console.log("ERROR TOTAL:", errorTotal);
      return NextResponse.json(
        { error: errorTotal.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Pedido creado correctamente",
      pedido_id: pedido.id,
      total: totalCalculado,
    });

  } catch (err: any) {
    console.log("ERROR GENERAL:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
});