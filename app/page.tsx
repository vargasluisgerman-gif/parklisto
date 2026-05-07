"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        // Ya hay sesión — verificar rol y redirigir
        const { getRolUsuario } = await import("@/lib/getEmpresa");
        const rol = await getRolUsuario();

        if (!rol) {
          // Usuario sin perfil → onboarding
          router.replace("/onboarding");
        } else if (rol === "empleado") {
          router.replace("/panel/caja");
        } else {
          router.replace("/panel");
        }
      } else {
        // Sin sesión → pantalla de login
        router.replace("/login");
      }
    }

    checkSession();
  }, [router]);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f3f4f6",
    }}>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando...</p>
    </div>
  );
}