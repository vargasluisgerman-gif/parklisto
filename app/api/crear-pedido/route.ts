import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { empresa_id: empresaId, nombre, productos } = body;

    console.log("BODY RECIBIDO:", { empresaId, nombre, productos });

    if (!empresaId || !productos || productos.length === 0) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 🔥 1. CARRITO DESDE EMPRESA
    const { data: carrito, error: errorCarrito } = await supabase
      .from("carritos")
      .select("id")
      .eq("empresa_id", empresaId)
      .single();

    console.log("CARRITO:", carrito, "ERROR:", errorCarrito);

    if (errorCarrito || !carrito) {
      return NextResponse.json({ error: "No se encontró carrito" }, { status: 500 });
    }

    const carritoId = carrito.id;

    // 🔥 2. NÚMERO DE PEDIDO
    const { data: ultimoPedido } = await supabase
  .from("pedidos")
  .select("numero")
  .order("numero", { ascending: false })
  .limit(1);

console.log("ULTIMO PEDIDO:", ultimoPedido);

const nuevoNumero =
  ultimoPedido && ultimoPedido.length > 0
    ? ultimoPedido[0].numero + 1
    : 1;

    // 🔥 3. CREAR PEDIDO
    const { data: pedidoData, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([{
        carrito_id: carritoId,
        empresa_id: empresaId,
        numero: nuevoNumero,
        nombre: nombre || "Cliente",
        estado: "Esperando",
        total: 0,
      }])
      .select();

    console.log("PEDIDO CREADO:", pedidoData, "ERROR:", errorPedido);

    if (errorPedido) {
      return NextResponse.json({ error: errorPedido.message }, { status: 500 });
    }

    const pedido = pedidoData[0];

    // 🔥 4. TRAER PRODUCTOS
    const ids = productos.map((p: any) => p.producto_id);
    const { data: productosDB, error: errorProductos } = await supabase
      .from("productos")
      .select("id, precio")
      .in("id", ids);

    console.log("PRODUCTOS DB:", productosDB, "ERROR:", errorProductos);

    let total = 0;
    const detalle = productos.map((p: any) => {
      const prod = productosDB!.find((x: any) => x.id === p.producto_id);
      const subtotal = (prod?.precio ?? 0) * p.cantidad;
      total += subtotal;
      return {
        pedido_id: pedido.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: prod.precio,
      };
    });

    // 🔥 5. INSERT DETALLE
    const { error: errorDetalle } = await supabase
      .from("pedido_productos")
      .insert(detalle);

    console.log("ERROR DETALLE:", errorDetalle);

    // 🔥 6. ACTUALIZAR TOTAL
    const { error: errorTotal } = await supabase
      .from("pedidos")
      .update({ total })
      .eq("id", pedido.id);

    console.log("ERROR TOTAL:", errorTotal);

    return NextResponse.json({ pedido_id: pedido.id, total });

  } catch (err: any) {
    console.log("ERROR GENERAL:", JSON.stringify(err), err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}