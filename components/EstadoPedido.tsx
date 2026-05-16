"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export default function EstadoPedido({ pedidoId }: { pedidoId: number }) {
  const [estado, setEstado] = useState("Esperando");
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);
  const [notificacionPermiso, setNotificacionPermiso] = useState<string>("default");

  const yaSonóRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationInterval = useRef<any>(null);

  useEffect(() => {
    audioRef.current = new Audio("/alerta.mp3");
    audioRef.current.loop = true;

    // Verificar permiso actual de notificaciones
    if ("Notification" in window) {
      setNotificacionPermiso(Notification.permission);
    }
  }, []);

  // Pedir permiso de notificaciones y suscribirse al push
  async function activarNotificaciones() {
    try {
      if (!audioRef.current) return;

      // Desbloquear audio
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioDesbloqueado(true);

      // Pedir permiso de notificaciones
      if ("Notification" in window && "serviceWorker" in navigator) {
        const permiso = await Notification.requestPermission();
        setNotificacionPermiso(permiso);

        if (permiso === "granted") {
          await suscribirPush();
        }
      }
    } catch (e) {
      console.error("Error activando notificaciones:", e);
    }
  }

  async function suscribirPush() {
    try {
      const registration = await navigator.serviceWorker.ready;

      const suscripcion = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      // Guardar suscripción en el servidor asociada al pedido
      await fetch("/api/push/suscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_id: pedidoId,
          suscripcion: suscripcion.toJSON(),
        }),
      });

      console.log("[Push] Suscripcion guardada para pedido", pedidoId);
    } catch (e) {
      console.error("[Push] Error suscribiendo:", e);
    }
  }

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

      {/* Botón activar — pide audio Y notificaciones */}
      {!audioDesbloqueado && (
        <button
          onClick={activarNotificaciones}
          style={{
            marginBottom: 16,
            padding: "12px 20px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Activar avisos
        </button>
      )}

      {audioDesbloqueado && notificacionPermiso === "granted" && (
        <p style={{ fontSize: 12, color: "#16a34a", marginBottom: 12 }}>
          Sonido y notificaciones activados
        </p>
      )}

      {audioDesbloqueado && notificacionPermiso !== "granted" && (
        <p style={{ fontSize: 12, color: "#f59e0b", marginBottom: 12 }}>
          Sonido activado. Permite notificaciones para avisos cuando cierres la app.
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

// Convertir clave VAPID a formato Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}