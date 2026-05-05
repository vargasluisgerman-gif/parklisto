import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { empresa_id: empresaId, nombre, productos, carrito_id } = body;

    console.log("BODY RECIBIDO:", { empresaId, nombre, productos, carrito_id });

    if (!empresaId || !productos || productos.length === 0) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // 1. Obtener carrito — usa el carrito_id si viene, sino busca el primero de la empresa
    let carritoId = carrito_id;

    if (!carritoId) {
      const { data: carrito, error: errorCarrito } = await supabaseAdmin
        .from("carritos")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("activo", true)
        .limit(1)
        .single();

      console.log("CARRITO:", carrito, "ERROR:", errorCarrito);

      if (errorCarrito || !carrito) {
        return NextResponse.json({ error: "No se encontró carrito" }, { status: 500 });
      }

      carritoId = carrito.id;
    }

    // 2. Número de pedido
    const { data: ultimoPedido } = await supabaseAdmin
      .from("pedidos")
      .select("numero")
      .eq("empresa_id", empresaId)
      .order("numero", { ascending: false })
      .limit(1);

    console.log("ULTIMO PEDIDO:", ultimoPedido);

    const nuevoNumero =
      ultimoPedido && ultimoPedido.length > 0
        ? ultimoPedido[0].numero + 1
        : 1;

    // 3. Crear pedido
    const { data: pedidoData, error: errorPedido } = await supabaseAdmin
      .from("pedidos")
      .insert([{
        carrito_id: carritoId,
        empresa_id: empresaId,
        numero: nuevoNumero,
        nombre: nombre || "Cliente",
        estado: "Esperando",
        total: 0,
        created_at: new Date().toISOString(),
      }])
      .select();

    console.log("PEDIDO CREADO:", pedidoData, "ERROR:", errorPedido);

    if (errorPedido || !pedidoData || pedidoData.length === 0) {
      return NextResponse.json({ error: errorPedido?.message || "Error creando pedido" }, { status: 500 });
    }

    const pedido = pedidoData[0];

    // 4. Traer precios de productos
    const ids = productos.map((p: any) => p.producto_id);
    const { data: productosDB, error: errorProductos } = await supabaseAdmin
      .from("productos")
      .select("id, precio")
      .in("id", ids);

    console.log("PRODUCTOS DB:", productosDB, "ERROR:", errorProductos);

    if (errorProductos || !productosDB) {
      return NextResponse.json({ error: "Error trayendo productos" }, { status: 500 });
    }

    // 5. Calcular total y armar detalle
    let total = 0;
    const detalle = productos.map((p: any) => {
      const prod = productosDB.find((x: any) => x.id === p.producto_id);
      const subtotal = (prod?.precio ?? 0) * p.cantidad;
      total += subtotal;
      return {
        pedido_id: pedido.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: prod?.precio ?? 0,
      };
    });

    // 6. Insertar detalle
    const { error: errorDetalle } = await supabaseAdmin
      .from("pedido_productos")
      .insert(detalle);

    console.log("ERROR DETALLE:", errorDetalle);

    if (errorDetalle) {
      return NextResponse.json({ error: errorDetalle.message }, { status: 500 });
    }

    // 7. Actualizar total en pedido
    const { error: errorTotal } = await supabaseAdmin
      .from("pedidos")
      .update({ total })
      .eq("id", pedido.id);

    console.log("ERROR TOTAL:", errorTotal);

    return NextResponse.json({ pedido_id: pedido.id, total });

  } catch (err: any) {
    console.log("ERROR GENERAL:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}