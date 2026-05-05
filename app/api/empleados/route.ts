import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password, empresa_id } = await req.json();

    if (!email || !password || !empresa_id) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no requiere confirmación de email
    });

    if (authError) {
      console.error("Error creando usuario:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user.id;

    // 2. Crear perfil con rol empleado
    const { error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .insert({
        id: userId,
        empresa_id: empresa_id,
        rol: "empleado",
        created_at: new Date().toISOString(),
      });

    if (perfilError) {
      console.error("Error creando perfil:", perfilError);
      // Rollback — borrar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: perfilError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email });

  } catch (err: any) {
    console.error("Error general:", err);
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

    // Traer empleados de la empresa
    const { data: perfiles, error } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, created_at")
      .eq("empresa_id", empresa_id)
      .eq("rol", "empleado");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Traer emails de auth
    const empleadosConEmail = await Promise.all(
      (perfiles || []).map(async (p) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(p.id);
        return {
          id: p.id,
          email: data.user?.email || "Sin email",
          rol: p.rol,
          created_at: p.created_at,
        };
      })
    );

    return NextResponse.json({ data: empleadosConEmail });

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

    // Borrar perfil
    await supabaseAdmin.from("perfiles").delete().eq("id", id);

    // Borrar usuario de auth
    await supabaseAdmin.auth.admin.deleteUser(id);

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}