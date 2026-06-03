import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresa_id = searchParams.get("empresa_id");
    const carrito_id = searchParams.get("carrito_id");

    if (!empresa_id) {
      return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("ingredientes")
      .select("*")
      .eq("empresa_id", empresa_id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (carrito_id) {
      query = query.or(`carrito_id.eq.${carrito_id},carrito_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, unidad, stock_actual, stock_minimo, precio_unitario, empresa_id, carrito_id } = body;

    if (!nombre || !unidad || !empresa_id) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("ingredientes")
      .insert({
        nombre,
        unidad,
        stock_actual: stock_actual ?? 0,
        stock_minimo: stock_minimo ?? 0,
        precio_unitario: precio_unitario ?? 0,
        empresa_id,
        carrito_id: carrito_id || null,
        activo: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Registrar movimiento inicial si hay stock
    if (stock_actual && stock_actual > 0) {
      await supabaseAdmin.from("movimientos_stock").insert({
        ingrediente_id: data.id,
        empresa_id,
        tipo: "entrada",
        cantidad: stock_actual,
        motivo: "Stock inicial",
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre, unidad, stock_actual, stock_minimo, activo, tipo_movimiento, remito, empresa_id, precio_unitario } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Obtener stock anterior para calcular diferencia
    const { data: anterior } = await supabaseAdmin
      .from("ingredientes")
      .select("stock_actual")
      .eq("id", id)
      .single();

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (unidad !== undefined) updateData.unidad = unidad;
    if (stock_actual !== undefined) updateData.stock_actual = stock_actual;
    if (stock_minimo !== undefined) updateData.stock_minimo = stock_minimo;
    if (activo !== undefined) updateData.activo = activo;
    if (precio_unitario !== undefined) updateData.precio_unitario = precio_unitario;

    const { error } = await supabaseAdmin
      .from("ingredientes")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Registrar movimiento si se actualiza el stock
    if (stock_actual !== undefined && empresa_id && anterior) {
      const diferencia = stock_actual - anterior.stock_actual;
      const tipo = tipo_movimiento || (diferencia >= 0 ? "entrada" : "salida");
      const cantidadMovimiento = tipo_movimiento === "ajuste" ? stock_actual : Math.abs(diferencia);

      if (cantidadMovimiento !== 0 || tipo === "ajuste") {
        await supabaseAdmin.from("movimientos_stock").insert({
          ingrediente_id: id,
          empresa_id,
          tipo,
          cantidad: cantidadMovimiento,
          motivo: tipo === "ajuste" ? "Ajuste de inventario" : "Carga manual",
          remito: remito || null,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("ingredientes")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}