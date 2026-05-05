"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre_comercial: "",
    nombre_carrito: "",
  });
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!form.nombre_comercial || !form.nombre_carrito) {
      setError("Completá todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_comercial: form.nombre_comercial,
          nombre_carrito: form.nombre_carrito,
          user_id: user.id,
          email: user.email,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Ocurrió un error. Intentá de nuevo.');
        return;
      }

      router.replace("/panel");

    } catch (err: any) {
      console.error("Error onboarding:", err);
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 8 }}
        >
          Bienvenido a Parklisto 🎉
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Completá los datos de tu negocio para empezar.
        </p>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Nombre de tu empresa
        </label>
        <input
          type="text"
          placeholder="Ej: Burger Co."
          value={form.nombre_comercial}
          onChange={(e) =>
            setForm({ ...form, nombre_comercial: e.target.value })
          }
          style={{
            display: "block",
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            marginTop: 6,
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Nombre de tu carrito / puesto
        </label>
        <input
          type="text"
          placeholder="Ej: Puesto Central"
          value={form.nombre_carrito}
          onChange={(e) =>
            setForm({ ...form, nombre_carrito: e.target.value })
          }
          style={{
            display: "block",
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            marginTop: 6,
            marginBottom: 24,
            boxSizing: "border-box",
          }}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 0",
            backgroundColor: loading ? "#9ca3af" : "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creando tu cuenta..." : "Comenzar →"}
        </button>
      </div>
    </div>
  );
}