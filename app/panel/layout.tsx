"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    async function cargarRol() {
      const { getRolUsuario } = await import("@/lib/getEmpresa");
      const r = await getRolUsuario();
      setRol(r);

      // Si es empleado y está intentando acceder a rutas restringidas
      if (r === "empleado") {
        const rutasPermitidas = ["/panel/caja", "/panel/dashboard"];
        const permitida = rutasPermitidas.some((ruta) => pathname.startsWith(ruta));
        if (!permitida) {
          router.replace("/panel/caja");
        }
      }
    }
    cargarRol();
  }, [pathname]);

  async function cerrarSesion() {
  await supabase.auth.signOut();
  router.replace("/login");
}

  function navClass(route: string) {
    const isActive = pathname === route || pathname.startsWith(route + "/");
    return {
      padding: "10px 14px",
      cursor: "pointer",
      borderRadius: 6,
      background: isActive ? "#333" : "transparent",
      color: "white",
      fontWeight: isActive ? "bold" : "normal",
      fontSize: 15,
    } as React.CSSProperties;
  }

  const esDuenio = rol === "duenio" || rol === null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui" }}>

      {/* SIDEBAR */}
      <div style={{
        width: 220,
        background: "#111",
        color: "white",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        height: "100vh",
      }}>
        <h2 style={{ fontWeight: "bold", marginBottom: 30 }}>PARKLISTO</h2>

        {/* Menú dueño */}
        {esDuenio && (
          <div onClick={() => router.push("/panel")} style={navClass("/panel")}>
            Panel
          </div>
        )}

        <div onClick={() => router.push("/panel/caja")} style={navClass("/panel/caja")}>
          Caja
        </div>

        <div onClick={() => router.push("/panel/dashboard")} style={navClass("/panel/dashboard")}>
          Cocina
        </div>

        {/* Solo dueño */}
        {esDuenio && (
          <>
            <div onClick={() => router.push("/panel/productos")} style={navClass("/panel/productos")}>
              Productos
            </div>
            <div onClick={() => router.push("/panel/empleados")} style={navClass("/panel/empleados")}>
              Empleados
            </div>
          </>
        )}

        <div style={{ marginTop: "auto" }}>
          {rol && (
            <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10, textAlign: "center" }}>
              {rol === "duenio" ? "Dueño" : "Empleado"}
            </p>
          )}
          <button
            onClick={cerrarSesion}
            style={{
              padding: "10px 14px",
              background: "#dc3545",
              border: "none",
              color: "white",
              borderRadius: 6,
              cursor: "pointer",
              width: "100%",
              fontWeight: 700,
            }}
          >
            Cerrar sesion
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ marginLeft: 220, flex: 1, background: "#f5f7fa", minHeight: "100vh" }}>
        {children}
      </div>
    </div>
  );
}