"use client";

import QRCode from "qrcode.react";

export default function QRCodePedido({ pedidoId }: { pedidoId: number }) {
  const url = `http://localhost:3000/pedidos/${pedidoId}`;

  return (
    <div style={{ marginTop: 10 }}>
      <QRCode value={url} size={128} />

      <p style={{ fontSize: 12, marginTop: 5 }}>
        Escanear para ver pedido
      </p>
    </div>
  );
}