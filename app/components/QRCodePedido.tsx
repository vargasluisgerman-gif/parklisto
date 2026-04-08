"use client";

import { QRCodeCanvas } from "qrcode.react";

export default function QRCodePedido({ pedidoId }: { pedidoId: number }) {
  const url = `${window.location.origin}/pedidos/${pedidoId}`;

  return (
    <div style={{ marginTop: 10 }}>
      <QRCodeCanvas value={url} size={128} />

      <p style={{ fontSize: 12, marginTop: 5 }}>
        Escanear para ver pedido
      </p>
    </div>
  );
}//probando cambios