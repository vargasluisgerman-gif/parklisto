"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuth() {
      try {
        // Bug 2 fix: extraer solo el code de la URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
          console.error("No se encontró code en la URL");
          router.replace("/login");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Error auth:", error.message);
          router.replace("/login");
          return;
        }

        // Bug 3 fix: esperar sesión confirmada antes de verificar perfil
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          router.replace("/login");
          return;
        }

        // Verificar perfil
        const { data: perfil, error: errPerfil } = await supabase
          .from("perfiles")
          .select("empresa_id, rol")
          .eq("id", user.id)
          .single();

        console.log("Perfil encontrado:", perfil, "Error:", errPerfil);

        if (!perfil || !perfil.empresa_id) {
          // Usuario nuevo → onboarding
          router.replace("/onboarding");
        } else if (perfil.rol === "empleado") {
          router.replace("/panel/caja");
        } else {
          router.replace("/panel");
        }

      } catch (err) {
        console.error("Error general:", err);
        router.replace("/login");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f3f4f6"
    }}>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Iniciando sesión...</p>
    </div>
  );
}