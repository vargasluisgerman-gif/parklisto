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
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // 🔊 audio global
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
      console.log("AUDIO DESBLOQUEADO ✅");
    } catch (e) {
      console.log("ERROR AUDIO:", e);
    }
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  async function cargarPedidos() {
    const res = await fetch(
      "/api/pedidos?carrito_id=5&empresa_id=1"
    );

    const json = await res.json();

    setPedidos(json.data || []);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Panel del Carrito</h1>

      {/* 🔊 ACTIVAR AUDIO */}
      {!audioReady && (
        <button
          onClick={unlockAudio}
          style={{
            marginBottom: 20,
            padding: "10px 18px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Activar sonido 🔊
        </button>
      )}

      {pedidos.length === 0 && <p>No hay pedidos</p>}

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
                border: "1px solid #ccc",
                padding: 20,
                marginBottom: 20,
                borderRadius: 8,
                backgroundColor:
                  pedido.estado === "Listo"
                    ? "#e6ffed"
                    : "#fff3cd",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <h2>
                <a
                  href={`/pedidos/${pedido.id}`}
                  style={{
                    textDecoration: "none",
                    color: "black",
		    fontSize: "30px",
		    fontWeight: "bold",
                  }}
                >
                  Pedido #{pedido.id}
                </a>
              </h2>

              <p>
                <b>Cliente:</b> {pedido.nombre}
              </p>

              <p>
                <b>Estado:</b> {pedido.estado}
              </p>

              <p>
                <b>Total:</b> ${pedido.total}
              </p>

              {/* 🔥 PRODUCTOS */}
              <div style={{ marginTop: 10 }}>
                {pedido.productos?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "25px",
			fontWeight: "bold",
                    }}
                  >
                    <span>
                      {item.cantidad} x{" "}
                      {item.productos?.nombre_producto ||
                        "Producto"}
                    </span>

                    <span>
                      $
                      {item.cantidad *
                        item.precio_unitario}
                    </span>
                  </div>
                ))}
              </div>

              {/* 🔥 QR */}
              <div style={{ marginTop: 15 }}>
                <QRCodeCanvas value={url} size={120} />
                <p style={{ fontSize: 12 }}>
                  Escanear para ver pedido
                </p>
              </div>

              {/* 🔥 BOTÓN LISTO */}
              {pedido.estado !== "Listo" ? (
                <button
                  onClick={async () => {
                    await fetch("/api/pedidos/estado", {
                      method: "POST",
                      headers: {
                        "Content-Type":
                          "application/json",
                      },
                      body: JSON.stringify({
                        pedido_id: pedido.id,
                        estado: "Listo",
                      }),
                    });

                    cargarPedidos();
                  }}
                  style={{
                    marginTop: "10px",
                    padding: "10px 18px",
                    background:
                      "linear-gradient(135deg, #28a745, #218838)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    boxShadow:
                      "0 2px 6px rgba(0,0,0,0.2)",
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
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  ✔ Ya listo
                </span>
              )}
            </div>
          );
        })}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}