import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password, empresa_id, carrito_id } = await req.json();

    if (!email || !password || !empresa_id) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Obtener plan activo
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
      .select("max_empleados")
      .eq("id", suscripcion.plan)
      .single();

    const maxEmpleados = plan?.max_empleados ?? 2;

    // 3. Contar empleados actuales
    const { data: empleadosActuales } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("empresa_id", empresa_id)
      .eq("rol", "empleado");

    const cantidadActual = empleadosActuales?.length || 0;

    if (cantidadActual >= maxEmpleados) {
      return NextResponse.json({
        error: `Tu plan ${suscripcion.plan} permite hasta ${maxEmpleados} empleado${maxEmpleados > 1 ? "s" : ""}. Actualizá tu plan para agregar más.`,
        codigo: "LIMITE_EMPLEADOS",
        max_empleados: maxEmpleados,
        empleados_actuales: cantidadActual,
      }, { status: 403 });
    }

    // 4. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user.id;

    // 5. Crear perfil con rol empleado y carrito asignado
    const { error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .insert({
        id: userId,
        empresa_id,
        rol: "empleado",
        carrito_id: carrito_id || null,
        created_at: new Date().toISOString(),
      });

    if (perfilError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: perfilError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresa_id = searchParams.get("empresa_id");

    if (!empresa_id) {
      return NextResponse.json({ error: "empresa_id requerido" }, { status: 400 });
    }

    const { data: perfiles, error } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, carrito_id, created_at")
      .eq("empresa_id", empresa_id)
      .eq("rol", "empleado");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const empleadosConDatos = await Promise.all(
      (perfiles || []).map(async (p) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(p.id);

        let nombreCarrito = "Todos los carritos";
        if (p.carrito_id) {
          const { data: carrito } = await supabaseAdmin
            .from("carritos")
            .select("nombre_comercial")
            .eq("id", p.carrito_id)
            .single();
          nombreCarrito = carrito?.nombre_comercial || "Carrito desconocido";
        }

        return {
          id: p.id,
          email: userData.user?.email || "Sin email",
          rol: p.rol,
          carrito_id: p.carrito_id,
          nombre_carrito: nombreCarrito,
          created_at: p.created_at,
        };
      })
    );

    return NextResponse.json({ data: empleadosConDatos });

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

    await supabaseAdmin.from("perfiles").delete().eq("id", id);
    await supabaseAdmin.auth.admin.deleteUser(id);

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}