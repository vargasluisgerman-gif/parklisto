"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

type Producto = {
  id: number;
  cantidad: number;
  precio_unitario: number;
  productos: {
    nombre_producto: string;
  } | null;
};

type Pedido = {
  id: number;
  numero: number;
  nombre: string;
  estado: string;
  total: number;
  productos: Producto[];
};

export default function Dashboard() {
  const [pedidos, setPedidos] = useState([] as Pedido[]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio("/alerta.mp3");
    audioRef.current.volume = 1;
  }, []);

  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;

      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      setAudioReady(true);
    } catch (e) {
      console.log("ERROR AUDIO:", e);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  async function cargarPedidos() {
  const { getEmpresaUsuario } = await import("@/lib/getEmpresa");
  const empresaId = await getEmpresaUsuario();

  if (!empresaId) return;

  const res = await fetch(`/api/pedidos?empresa_id=${empresaId}`);
  const json = await res.json();
  setPedidos(json.data || []);
}
  return (
    <div style={{ padding: 30, backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <h1 style={{ fontWeight: 700, color: "#000", marginBottom: 20 }}>
        🍳 Panel de Cocina
      </h1>

      {!audioReady && (
        <button
          onClick={unlockAudio}
          style={{
            marginBottom: 20,
            padding: "10px 18px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
          }}
        >
          Activar sonido 🔊
        </button>
      )}

      {pedidos.length === 0 && (
        <p style={{ color: "#111827" }}>No hay pedidos</p>
      )}

      {pedidos
        .sort((a, b) => {
          if (a.estado !== b.estado) {
            if (a.estado === "Esperando") return -1;
            if (b.estado === "Esperando") return 1;
          }
          return b.id - a.id;
        })
        .map((pedido) => {
          const url =
            typeof window !== "undefined"
              ? `${window.location.origin}/pedidos/${pedido.id}`
              : "";

          return (
            <div
              key={pedido.id}
              style={{
                border: "1px solid #e5e7eb",
                padding: 20,
                marginBottom: 20,
                borderRadius: 12,

                /* 🔥 COLORES IOS SAFE */
                backgroundColor:
                  pedido.estado === "Listo"
                    ? "#d1fae5"
                    : "#fef3c7",

                color:
                  pedido.estado === "Listo"
                    ? "#065f46"
                    : "#92400e",

                /* 🔥 IMPORTANTE */
                fontWeight: 600,
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",

                /* ❌ quitamos animación */
                animation: "none",
              }}
            >
              <h2>
                <a
                  href={`/pedidos/${pedido.id}`}
                  style={{
                    textDecoration: "none",
                    color: "#000",
                    fontSize: "28px",
                    fontWeight: 700,
                  }}
                >
                  Pedido #{pedido.id}
                </a>
              </h2>

              <p style={{ color: "#111827", fontWeight: 500 }}>
                <b>Cliente:</b> {pedido.nombre}
              </p>

              <p style={{ fontWeight: 700 }}>
                Estado: {pedido.estado === "Listo" ? "✅ Listo" : "⏳ En preparación"}
              </p>

              <p style={{ color: "#000", fontWeight: 700 }}>
                Total: ${pedido.total}
              </p>

              {/* PRODUCTOS */}
              <div style={{ marginTop: 10 }}>
                {pedido.productos?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    <span>
                      {item.cantidad} x{" "}
                      {item.productos?.nombre_producto || "Producto"}
                    </span>

                    <span>
                      ${item.cantidad * item.precio_unitario}
                    </span>
                  </div>
                ))}
              </div>

              {/* QR */}
              <div style={{ marginTop: 15 }}>
                <QRCodeCanvas value={url} size={120} />
                <p style={{ fontSize: 12, color: "#111827" }}>
                  Escanear para ver pedido
                </p>
              </div>

              {/* BOTÓN */}
              {pedido.estado !== "Listo" ? (
                <button
                  onClick={async () => {
                    await fetch("/api/pedidos/estado", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        pedido_id: pedido.id,
                        estado: "Listo",
                      }),
                    });

                    cargarPedidos();
                  }}
                  style={{
                    marginTop: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 700,
                  }}
                >
                  ✅ Marcar como listo
                </button>
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "10px",
                    padding: "8px 12px",
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                    borderRadius: "8px",
                    fontWeight: 700,
                  }}
                >
                  ✔ Ya listo
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}