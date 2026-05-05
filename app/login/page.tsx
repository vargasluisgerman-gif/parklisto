"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"google" | "email">("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loginConGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: "select_account", // siempre pide elegir cuenta
      },
    },
  });
}

  async function loginConEmail() {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    // Verificar rol y redirigir
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (perfil?.rol === "empleado") {
      router.replace("/panel/caja");
    } else {
      router.replace("/panel");
    }

    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f3f4f6",
      padding: 20,
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 32,
        width: "100%",
        maxWidth: 380,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}>
        <h1 style={{ fontWeight: 700, fontSize: 26, color: "#000", marginBottom: 4 }}>
          PARKLISTO
        </h1>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 28 }}>
          Sistema de pedidos para food trucks
        </p>

        {/* TABS */}
        <div style={{
          display: "flex",
          backgroundColor: "#f3f4f6",
          borderRadius: 8,
          padding: 3,
          marginBottom: 24,
        }}>
          <button
            onClick={() => { setModo("google"); setError(""); }}
            style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              backgroundColor: modo === "google" ? "#fff" : "transparent",
              color: modo === "google" ? "#000" : "#6b7280",
              boxShadow: modo === "google" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Dueño
          </button>
          <button
            onClick={() => { setModo("email"); setError(""); }}
            style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              backgroundColor: modo === "email" ? "#fff" : "transparent",
              color: modo === "email" ? "#000" : "#6b7280",
              boxShadow: modo === "email" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Empleado
          </button>
        </div>

        {/* LOGIN GOOGLE */}
        {modo === "google" && (
          <button
            onClick={loginConGoogle}
            style={{
              width: "100%", padding: "12px 0",
              backgroundColor: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 10, fontWeight: 600, fontSize: 15,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Continuar con Google
          </button>
        )}

        {/* LOGIN EMAIL */}
        {modo === "email" && (
          <div style={{ textAlign: "left" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
                marginTop: 6, marginBottom: 14, boxSizing: "border-box" as any,
              }}
            />

            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Contraseña</label>
            <input
              type="password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loginConEmail()}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
                marginTop: 6, marginBottom: 16, boxSizing: "border-box" as any,
              }}
            />

            {error && (
              <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={loginConEmail}
              disabled={loading}
              style={{
                width: "100%", padding: "12px 0",
                backgroundColor: loading ? "#9ca3af" : "#111",
                color: "#fff", border: "none", borderRadius: 10,
                fontWeight: 700, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        )}

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
          Solo usuarios autorizados pueden acceder
        </p>
      </div>
    </div>
  );
}