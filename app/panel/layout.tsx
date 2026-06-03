"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [rol, setRol] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    async function cargarRol() {
      const { getRolUsuario } = await import("@/lib/getEmpresa");
      const r = await getRolUsuario();
      setRol(r);

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

  // Cerrar menú al cambiar de ruta en mobile
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function navItem(route: string, label: string) {
    const isActive = pathname === route || pathname.startsWith(route + "/");
    return (
      <div
        onClick={() => router.push(route)}
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          borderRadius: 6,
          background: isActive ? "#333" : "transparent",
          color: "white",
          fontWeight: isActive ? "bold" : "normal",
          fontSize: 15,
          userSelect: "none",
        }}
      >
        {label}
      </div>
    );
  }

  const esDuenio = rol === "duenio" || rol === null;

  const sidebarContent = (
    <>
      {/* LOGO */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
        <Image
          src="/logo.png"
          alt="Parklisto"
          width={160}
          height={80}
          style={{ objectFit: "contain" }}
          priority
        />
      </div>

      {/* MENÚ */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {esDuenio && navItem("/panel", "Panel")}
        {navItem("/panel/caja", "Caja")}
        {navItem("/panel/dashboard", "Cocina")}
        {esDuenio && (
          <>
            {navItem("/panel/productos", "Productos")}
            {navItem("/panel/empleados", "Empleados")}
            {navItem("/panel/suscripcion", "Suscripcion")}
            {navItem("/panel/carritos", "Carritos")}
            {navItem("/panel/stock", "Stock")}
            {navItem("/panel/recetas", "Recetas")}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 16 }}>
        {rol && (
          <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10, textAlign: "center" }}>
            {rol === "duenio" ? "Dueno" : "Empleado"}
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
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui" }}>

      {/* SIDEBAR DESKTOP — fijo, visible en pantallas anchas */}
      <div style={{
        width: 220,
        background: "#111",
        color: "white",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        height: "100vh",
        top: 0,
        left: 0,
        zIndex: 100,
        overflowY: "auto",
      }}
        className="sidebar-desktop"
      >
        {sidebarContent}
      </div>

      {/* OVERLAY MOBILE — oscurece el fondo cuando el menú está abierto */}
      {menuAbierto && (
        <div
          onClick={() => setMenuAbierto(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 150,
          }}
        />
      )}

      {/* SIDEBAR MOBILE — deslizable */}
      <div style={{
        width: 240,
        background: "#111",
        color: "white",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        height: "100vh",
        top: 0,
        left: menuAbierto ? 0 : -260,
        zIndex: 200,
        transition: "left 0.25s ease",
        overflowY: "auto",
      }}
        className="sidebar-mobile"
      >
        {/* Botón cerrar en mobile */}
        <button
          onClick={() => setMenuAbierto(false)}
          style={{
            alignSelf: "flex-end",
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            fontSize: 22,
            cursor: "pointer",
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
        {sidebarContent}
      </div>

      {/* BARRA SUPERIOR MOBILE con botón hamburguesa */}
      <div
        className="topbar-mobile"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          backgroundColor: "#111",
          zIndex: 100,
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}
      >
        <button
          onClick={() => setMenuAbierto(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: 22,
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ☰
        </button>
        <Image src="/logo.png" alt="Parklisto" width={90} height={45} style={{ objectFit: "contain" }} priority />
      </div>

      {/* CONTENIDO */}
      <div
        className="panel-content"
        style={{
          marginLeft: 220,
          flex: 1,
          background: "#f5f7fa",
          minHeight: "100vh",
        }}
      >
        {children}
      </div>

      {/* ESTILOS RESPONSIVE */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
          .topbar-mobile { display: flex !important; }
          .panel-content { margin-left: 0 !important; padding-top: 52px; }
        }
        @media (min-width: 769px) {
          .sidebar-mobile { display: none !important; }
          .topbar-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}