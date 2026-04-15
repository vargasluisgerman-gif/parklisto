"use client";

import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  function navClass(route: string) {
    const isActive = pathname === route;
    return {
      padding: "10px 14px",
      cursor: "pointer",
      borderRadius: 6,
      background: isActive ? "#333" : "transparent",
      color: "white",
      fontWeight: isActive ? "bold" : "normal",
    } as React.CSSProperties;
  }

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
        <h2 style={{ fontWeight: "bold", marginBottom: 30 }}>🍔 PARKLISTO</h2>

        <div onClick={() => router.push("/panel")} style={navClass("/panel")}>Panel</div>
<div onClick={() => router.push("/panel/caja")} style={navClass("/panel/caja")}>Caja</div>
<div onClick={() => router.push("/panel/dashboard")} style={navClass("/panel/dashboard")}>Cocina</div>
<div onClick={() => router.push("/panel/productos")} style={navClass("/panel/productos")}>Productos</div>

        <div style={{ marginTop: "auto" }}>
          <button onClick={cerrarSesion} style={{
            padding: "10px 14px",
            background: "#dc3545",
            border: "none",
            color: "white",
            borderRadius: 6,
            cursor: "pointer",
            width: "100%",
          }}>
            Cerrar sesión
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