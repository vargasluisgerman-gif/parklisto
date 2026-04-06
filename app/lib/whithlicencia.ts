import { NextResponse } from "next/server";
import { supabase } from "./supabase";
import { validarLicencia } from "./licencia";

export function withLicencia(handler: Function) {
  return async (req: Request) => {
    try {
      // 🔥 TABLA CORRECTA
      const { data: empresa, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", 1) // ⚠️ luego lo hacemos dinámico
        .single();

      if (error || !empresa) {
        return NextResponse.json(
          { error: "Empresa no encontrada" },
          { status: 404 }
        );
      }

      const validacion = validarLicencia(empresa);

      if (!validacion.ok) {
        return NextResponse.json(
          { error: validacion.motivo },
          { status: 403 }
        );
      }

      return handler(req, empresa);

    } catch (err) {
      return NextResponse.json(
        { error: "Error interno" },
        { status: 500 }
      );
    }
  };
}