"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PedidoCliente({ id, productos }: any) {

  const [estado, setEstado] = useState("Esperando");

  useEffect(() => {

    const channel = supabase
      .channel("pedidos-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos",
          filter: `id=eq.${id}`,
        },
        (payload) => {

          console.log("CAMBIO:", payload);

          const nuevoEstado = payload.new.estado;

          if (nuevoEstado === "Listo") {
            setEstado("Listo");

            alert("Tu pedido está listo para retirar");

            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [id]);

  const total = productos.reduce(
    (acc: number, item: any) =>
      acc + item.cantidad * item.precio_unitario,
    0
  );

  const fecha = new Date().toLocaleString("es-AR");

  return (
    <div style={styles.container}>
      <div style={styles.ticket}>
        <h2 style={styles.titulo}>🍔 PARKLISTO</h2>
        <p>Pedido N° {id}</p>
        <p>{fecha}</p>

        <p style={{ textAlign: "center", fontWeight: "bold" }}>
          Estado: {estado}
        </p>

        <hr />

        {productos.map((item: any) => (
          <div key={item.id} style={styles.item}>
            <span>
              {item.cantidad} x {item.productos.nombre_producto}
            </span>
            <span>
              ${(item.cantidad * item.precio_unitario).toLocaleString()}
            </span>
          </div>
        ))}

        <hr />

        <div style={styles.total}>
          <strong>TOTAL</strong>
          <strong>${total.toLocaleString()}</strong>
        </div>

        <hr />

        <p style={{ textAlign: "center", fontSize: 12 }}>
          Gracias por su compra
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "40px",
    backgroundColor: "#f4f4f4",
    minHeight: "100vh",
  },
  ticket: {
    backgroundColor: "white",
    padding: "20px",
    width: "320px",
    fontFamily: "monospace",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  titulo: {
    textAlign: "center" as const,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  total: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
  },
};