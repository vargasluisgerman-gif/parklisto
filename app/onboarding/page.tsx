"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PAISES = [
  { codigo: "AR", nombre: "Argentina", moneda: "ARS", simbolo: "$" },
  { codigo: "ES", nombre: "España", moneda: "EUR", simbolo: "€" },
  { codigo: "MX", nombre: "México", moneda: "MXN", simbolo: "$" },
  { codigo: "CL", nombre: "Chile", moneda: "CLP", simbolo: "$" },
  { codigo: "CO", nombre: "Colombia", moneda: "COP", simbolo: "$" },
  { codigo: "PE", nombre: "Perú", moneda: "PEN", simbolo: "S/" },
  { codigo: "UY", nombre: "Uruguay", moneda: "UYU", simbolo: "$" },
  { codigo: "PY", nombre: "Paraguay", moneda: "PYG", simbolo: "₲" },
  { codigo: "BO", nombre: "Bolivia", moneda: "BOB", simbolo: "Bs" },
  { codigo: "EC", nombre: "Ecuador", moneda: "USD", simbolo: "$" },
  { codigo: "VE", nombre: "Venezuela", moneda: "USD", simbolo: "$" },
  { codigo: "BR", nombre: "Brasil", moneda: "BRL", simbolo: "R$" },
  { codigo: "US", nombre: "Estados Unidos", moneda: "USD", simbolo: "$" },
  { codigo: "OTHER", nombre: "Otro país", moneda: "USD", simbolo: "$" },
];

export default function Onboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre_comercial: "",
    nombre_carrito: "",
    pais: "AR",
  });
  const [error, setError] = useState("");

  const paisSeleccionado = PAISES.find((p) => p.codigo === form.pais) || PAISES[0];

  async function handleSubmit() {
    if (!form.nombre_comercial || !form.nombre_carrito || !form.pais) {
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

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_comercial: form.nombre_comercial,
          nombre_carrito: form.nombre_carrito,
          user_id: user.id,
          email: user.email,
          pais: paisSeleccionado.codigo,
          moneda: paisSeleccionado.moneda,
          simbolo_moneda: paisSeleccionado.simbolo,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Ocurrió un error. Intentá de nuevo.");
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
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 32,
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}>
        <h1 style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 8 }}>
          Bienvenido a Parklisto
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          Completá los datos de tu negocio para empezar.
        </p>

        {/* PAÍS */}
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          País donde operás
        </label>
        <select
          value={form.pais}
          onChange={(e) => setForm({ ...form, pais: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            marginTop: 6,
            marginBottom: 16,
            boxSizing: "border-box" as any,
            backgroundColor: "#fff",
            color: "#111",
          }}
        >
          {PAISES.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nombre} — {p.moneda}
            </option>
          ))}
        </select>

        {/* NOMBRE EMPRESA */}
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Nombre de tu empresa
        </label>
        <input
          type="text"
          placeholder="Ej: Burger Co."
          value={form.nombre_comercial}
          onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            marginTop: 6,
            marginBottom: 16,
            boxSizing: "border-box" as any,
          }}
        />

        {/* NOMBRE CARRITO */}
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Nombre de tu carrito / puesto
        </label>
        <input
          type="text"
          placeholder="Ej: Puesto Central"
          value={form.nombre_carrito}
          onChange={(e) => setForm({ ...form, nombre_carrito: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            marginTop: 6,
            marginBottom: 8,
            boxSizing: "border-box" as any,
          }}
        />

        {/* INFO MONEDA */}
        <div style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 20,
          fontSize: 12,
          color: "#166534",
        }}>
          Tu sistema usará <strong>{paisSeleccionado.moneda}</strong> ({paisSeleccionado.simbolo}) como moneda.
        </div>

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
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