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
    audioRef.current.loop = true;
  }, []);

  // 🔓 desbloquear audio
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

  // 🔥 REALTIME + SONIDO + VIBRACIÓN
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

          if (nuevoEstado === "Listo" && !yaSonóRef.current) {
            yaSonóRef.current = true;

            if (audioRef.current && audioUnlocked.current) {
              audioRef.current.play().catch(() => {});
            }

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
      {/* 🔊 BOTÓN */}
      {!audioUnlocked.current && (
        <button
          onClick={unlockAudio}
          style={{
            marginBottom: 10,
            padding: "10px 16px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          🔊 Activar sonido
        </button>
      )}

      <div
        style={{
          padding: 18,
          borderRadius: 14,

          /* 🔥 COLORES NUEVOS (NO LAVADOS) */
          backgroundColor:
            estado === "Listo" ? "#d1fae5" : "#fef3c7",

          color:
            estado === "Listo" ? "#065f46" : "#92400e",

          /* 🔥 TIPOGRAFÍA IOS FIX */
          fontWeight: 700,
          fontSize: "22px",
          letterSpacing: "0.3px",
          lineHeight: 1.4,

          /* 🔥 IMPORTANTE: eliminar blur */
          textShadow: "none",

          /* 🔥 sombra en caja, no en texto */
          boxShadow: "0 4px 10px rgba(0,0,0,0.08)",

          transition: "all 0.2s ease",

          /* ❌ ELIMINAMOS ANIMACIÓN (causa blur en iOS) */
          animation: "none",
        }}
      >
        {estado === "Listo"
          ? "🔥 PEDIDO LISTO PARA RETIRAR 🔥"
          : "⏳ En preparación"}
      </div>

      {/* ❌ animación eliminada para evitar texto borroso */}
    </div>
  );
}