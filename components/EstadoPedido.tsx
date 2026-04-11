"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function EstadoPedido({ pedidoId }: { pedidoId: number }) {
  const [estado, setEstado] = useState("Esperando");

  // 🔊 control de sonido
  const yaSonóRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false);

  const vibrationInterval = useRef<any>(null);

  // 🔹 inicializar audio
  useEffect(() => {
    audioRef.current = new Audio("/alerta.mp3");
    audioRef.current.loop = true; // 🔥 sonido continuo
  }, []);

  // 🔓 desbloquear audio (OBLIGATORIO en móviles)
  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;

      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      audioUnlocked.current = true;

      console.log("🔊 AUDIO DESBLOQUEADO");
    } catch (e) {
      console.log("ERROR AUDIO:", e);
    }
  };

  // 🔹 estado inicial
  useEffect(() => {
    async function fetchEstado() {
      const { data } = await supabase
        .from("pedidos")
        .select("estado")
        .eq("id", pedidoId)
        .single();

      if (data) {
        setEstado(data.estado);
      }
    }

    fetchEstado();
  }, [pedidoId]);

  // 🔥 REALTIME + SONIDO CONTINUO + VIBRACIÓN
  useEffect(() => {
    const channel = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: `id=eq.${pedidoId}`,
        },
        (payload) => {
          const nuevoEstado = payload.new.estado;

          console.log("CAMBIO PEDIDO:", nuevoEstado);

          // 🔥 ACTIVAR ALERTA SOLO UNA VEZ
          if (nuevoEstado === "Listo" && !yaSonóRef.current) {
            yaSonóRef.current = true;

            // 🔊 SONIDO CONTINUO
            if (audioRef.current && audioUnlocked.current) {
              audioRef.current.play().catch(() => {});
            }

            // 📳 VIBRACIÓN CONTINUA
            if (navigator.vibrate) {
              vibrationInterval.current = setInterval(() => {
                navigator.vibrate([300, 100, 300]);
              }, 1500);
            }
          }

          setEstado(nuevoEstado);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);

      // 🛑 limpiar sonido y vibración
      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
      }
    };
  }, [pedidoId]);

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      {/* 🔊 BOTÓN OBLIGATORIO */}
      {!audioUnlocked.current && (
        <button
          onClick={unlockAudio}
          style={{
            marginBottom: 10,
            padding: "10px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
          }}
        >
          🔊 Activar sonido
        </button>
      )}

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor:
            estado === "Listo" ? "#28a745" : "#fff3cd",
          color: estado === "Listo" ? "white" : "#856404",
          fontWeight: "bold",
          fontSize: "22px",
          transition: "all 0.3s ease",
          animation:
            estado === "Listo" ? "parpadeo 1s infinite" : "none",
        }}
      >
        {estado === "Listo"
          ? "🔥 PEDIDO LISTO PARA RETIRAR 🔥"
          : "⏳ En preparación"}
      </div>

      {/* 🔥 ANIMACIÓN */}
      <style jsx>{`
        @keyframes parpadeo {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}