"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empleado = {
  id: string;
  email: string;
  rol: string;
  created_at: string;
};

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
    const empId = await getEmpresaUsuario();
    if (!empId) return;
    setEmpresaId(Number(empId));
    cargarEmpleados(Number(empId));
  }

  async function cargarEmpleados(empId: number) {
    const res = await fetch(`/api/empleados?empresa_id=${empId}`);
    const json = await res.json();
    setEmpleados(json.data || []);
  }

  async function crearEmpleado() {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!empresaId) return;

    setLoading(true);
    setError("");
    setExito("");

    const res = await fetch("/api/empleados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, empresa_id: empresaId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Error al crear empleado");
    } else {
      setExito(`Empleado ${email} creado correctamente`);
      setEmail("");
      setPassword("");
      cargarEmpleados(empresaId);
    }

    setLoading(false);
  }

  async function eliminarEmpleado(id: string, emailEmp: string) {
    const confirmar = confirm(`¿Eliminar al empleado ${emailEmp}?`);
    if (!confirmar) return;

    await fetch(`/api/empleados?id=${id}`, { method: "DELETE" });
    setEmpleados((prev) => prev.filter((e) => e.id !== id));
  }

  async function cambiarClave(id: string, emailEmp: string) {
    const nuevaClave = prompt(`Nueva contraseña para ${emailEmp}:`);
    if (!nuevaClave) return;

    if (nuevaClave.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const res = await fetch("/api/empleados/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: nuevaClave }),
    });

    const json = await res.json();

    if (res.ok) {
      alert(`Contraseña actualizada para ${emailEmp}`);
    } else {
      alert("Error: " + json.error);
    }
  }

  return (
    <div style={{ padding: 30, maxWidth: 600 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, color: "#000", marginBottom: 6 }}>
        Gestión de empleados
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        Los empleados solo pueden acceder a Caja y Cocina.
      </p>

      {/* FORMULARIO */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        marginBottom: 24,
      }}>
        <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 16 }}>
          Agregar empleado
        </h2>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Email</label>
        <input
          type="email"
          placeholder="empleado@email.com"
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
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            display: "block", width: "100%", padding: "10px 14px",
            borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14,
            marginTop: 6, marginBottom: 16, boxSizing: "border-box" as any,
          }}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}
        {exito && (
          <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 12 }}>{exito}</p>
        )}

        <button
          onClick={crearEmpleado}
          disabled={loading}
          style={{
            width: "100%", padding: "11px 0",
            backgroundColor: loading ? "#9ca3af" : "#111",
            color: "#fff", border: "none", borderRadius: 8,
            fontWeight: 700, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creando..." : "Crear empleado"}
        </button>
      </div>

      {/* LISTADO */}
      <h2 style={{ fontWeight: 600, fontSize: 16, color: "#000", marginBottom: 12 }}>
        Empleados activos ({empleados.length})
      </h2>

      {empleados.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: 14 }}>No hay empleados cargados aún.</p>
      )}

      {empleados.map((emp) => (
        <div
          key={emp.id}
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ fontWeight: 600, color: "#111", margin: 0, fontSize: 14 }}>
              {emp.email}
            </p>
            <p style={{ color: "#6b7280", margin: "3px 0 0", fontSize: 12 }}>
              Acceso: Caja y Cocina
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => cambiarClave(emp.id, emp.email)}
              style={{
                padding: "6px 12px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cambiar clave
            </button>
            <button
              onClick={() => eliminarEmpleado(emp.id, emp.email)}
              style={{
                padding: "6px 12px",
                backgroundColor: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}