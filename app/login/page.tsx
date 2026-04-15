"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/panel"); // 🔥 ya logueado → salta login
      }
    }

    checkSession();
  }, [router]);

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://parklisto.vercel.app/auth/callback",
      },
    });
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <button onClick={login}>Ingresar con Google</button>
    </div>
  );
}