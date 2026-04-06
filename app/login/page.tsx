"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Ingreso Empresa</h1>
      <button
        onClick={loginWithGoogle}
        style={{
          padding: 10,
          background: "black",
          color: "white",
          borderRadius: 6
        }}
      >
        Ingresar con Google
      </button>
    </div>
  );
}