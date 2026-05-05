"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function EstadoPedido({ pedidoId }: { pedidoId: number }) {
  const [estado, setEstado] = useState("Esperando");
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);

  const yaSonóRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationInterval = useRef<any>(null);

  // Inicializar audio
  useEffect(() => {
    audioRef.current = new Audio("/alerta.mp3");
    audioRef.current.loop = true;
  }, []);

  // Desbloquear audio — necesario en mobile antes de reproducir
  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioDesbloqueado(true);
      console.log("Audio desbloqueado");
    } catch (e) {
      console.log("ERROR AUDIO:", e);
    }
  };

  // Estado inicial del pedido
  useEffect(() => {
    async function fetchEstado() {
      const { data } = await supabase
        .from("pedidos")
        .select("estado")
        .eq("id", pedidoId)
        .single();

      if (data) {
        setEstado(data.estado);

        // Si ya estaba listo cuando el cliente abre la página
        if (data.estado === "Listo") {
          yaSonóRef.current = true;
        }
      }
    }
    fetchEstado();
  }, [pedidoId]);

  // Realtime — escucha cambios de estado
  useEffect(() => {
    const channel = supabase
      .channel(`pedido-estado-${pedidoId}`)
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
          console.log("Cambio de estado:", nuevoEstado);

          if (nuevoEstado === "Listo" && !yaSonóRef.current) {
            yaSonóRef.current = true;

            // Sonido
            if (audioRef.current && audioDesbloqueado) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }

            // Vibración en mobile
            if (navigator.vibrate) {
              vibrationInterval.current = setInterval(() => {
                navigator.vibrate([300, 100, 300]);
              }, 1500);
            }
          }

          setEstado(nuevoEstado);
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Estado pedido:", status);
      });

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
      }
    };
  }, [pedidoId, audioDesbloqueado]);

  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>

      {/* Botón de activar sonido — desaparece cuando se activa */}
      {!audioDesbloqueado && (
        <button
          onClick={unlockAudio}
          style={{
            marginBottom: 16,
            padding: "10px 20px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Activar sonido
        </button>
      )}

      {audioDesbloqueado && (
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          Sonido activado — te avisamos cuando tu pedido este listo
        </p>
      )}

      <div
        style={{
          padding: 18,
          borderRadius: 14,
          backgroundColor: estado === "Listo" ? "#d1fae5" : "#fef3c7",
          color: estado === "Listo" ? "#065f46" : "#92400e",
          fontWeight: 700,
          fontSize: "22px",
          letterSpacing: "0.3px",
          lineHeight: 1.4,
          textShadow: "none",
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
          transition: "all 0.3s ease",
          animation: "none",
        }}
      >
        {estado === "Listo"
          ? "PEDIDO LISTO PARA RETIRAR"
          : "En preparacion..."}
      </div>

      {/* Botón para detener el sonido cuando el pedido está listo */}
      {estado === "Listo" && audioDesbloqueado && (
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            if (vibrationInterval.current) {
              clearInterval(vibrationInterval.current);
            }
          }}
          style={{
            marginTop: 14,
            padding: "8px 16px",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Detener sonido
        </button>
      )}
    </div>
  );
}