"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/panel");
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          router.replace("/panel");
        }
      });

      setTimeout(() => {
        subscription.unsubscribe();
        router.replace("/panel");
      }, 3000);
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="text-center">
        <p className="text-zinc-600 font-medium">Iniciando sesión...</p>
        <p className="text-zinc-400 text-sm mt-1">Serás redirigido en unos segundos</p>
      </div>
    </div>
  );
}