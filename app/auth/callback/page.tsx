"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuth() {
      try {
        // 🔥 CLAVE: procesar el código de Google
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("Error auth:", error.message);
          router.replace("/login");
          return;
        }

        // 🔥 obtener sesión ya procesada
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          router.replace("/panel");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Error general:", err);
        router.replace("/login");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <p className="text-zinc-500 text-sm">
        Iniciando sesión...
      </p>
    </div>
  );
}