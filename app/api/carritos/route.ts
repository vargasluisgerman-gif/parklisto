import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — listar carritos de una empresa
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresa_id = searchParams.get("empresa_id");

    if (!empresa_id) {
      return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("carritos")
      .select("id, nombre_comercial, slug, activo, created_at")
      .eq("empresa_id", empresa_id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — crear nuevo carrito con validación de límite
export async function POST(req: NextRequest) {
  try {
    const { nombre_comercial, empresa_id } = await req.json();

    if (!nombre_comercial || !empresa_id) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Obtener plan activo de la empresa
    const { data: suscripcion } = await supabaseAdmin
      .from("suscripciones")
      .select("plan")
      .eq("empresa_id", empresa_id)
      .eq("estado", "activa")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!suscripcion) {
      return NextResponse.json({
        error: "Sin suscripcion activa. Contrata un plan para continuar.",
        codigo: "SIN_SUSCRIPCION",
      }, { status: 403 });
    }

    // 2. Obtener límite del plan
    const { data: plan } = await supabaseAdmin
      .from("planes")
      .select("max_carritos")
      .eq("id", suscripcion.plan)
      .single();

    const maxCarritos = plan?.max_carritos ?? 1;

    // 3. Contar carritos actuales
    const { data: carritosActuales } = await supabaseAdmin
      .from("carritos")
      .select("id")
      .eq("empresa_id", empresa_id)
      .eq("activo", true);

    const cantidadActual = carritosActuales?.length || 0;

    if (cantidadActual >= maxCarritos) {
      return NextResponse.json({
        error: `Tu plan ${suscripcion.plan} permite hasta ${maxCarritos} carrito${maxCarritos > 1 ? "s" : ""}. Actualizá tu plan para agregar más.`,
        codigo: "LIMITE_CARRITOS",
        max_carritos: maxCarritos,
        carritos_actuales: cantidadActual,
      }, { status: 403 });
    }

    // 4. Generar slug único
    const slugBase = nombre_comercial
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data: existente } = await supabaseAdmin
      .from("carritos")
      .select("id")
      .eq("slug", slugBase)
      .single();

    const slug = existente ? `${slugBase}-${Date.now()}` : slugBase;

    // 5. Crear carrito
    const { data, error } = await supabaseAdmin
      .from("carritos")
      .insert({
        nombre_comercial,
        slug,
        empresa_id,
        activo: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — actualizar carrito
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nombre_comercial, activo } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const updateData: any = {};
    if (nombre_comercial !== undefined) {
      updateData.nombre_comercial = nombre_comercial;
      updateData.slug = nombre_comercial
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
    if (activo !== undefined) updateData.activo = activo;

    const { error } = await supabaseAdmin
      .from("carritos")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}