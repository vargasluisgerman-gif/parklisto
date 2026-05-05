import { createClient } from "@supabase/supabase-js";
import EstadoPedido from "@/components/EstadoPedido";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getPedido(id: number) {
  const { data: pedidoData, error: errorPedido } = await supabaseAdmin
    .from("pedidos")
    .select("estado, nombre, numero")
    .eq("id", id)
    .single();

  if (errorPedido || !pedidoData) {
    console.log("ERROR PEDIDO:", errorPedido);
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("pedido_productos")
    .select("id, cantidad, precio_unitario, producto_id")
    .eq("pedido_id", id);

  if (error || !data) {
    console.log("ERROR PEDIDO_PRODUCTOS:", error);
    return null;
  }

  const productosIds = data.map((item) => item.producto_id).filter(Boolean);

  let productosMap: any = {};
  if (productosIds.length > 0) {
    const { data: productos } = await supabaseAdmin
      .from("productos")
      .select("id, nombre_producto")
      .in("id", productosIds);

    productosMap = Object.fromEntries(
      (productos || []).map((p: any) => [p.id, p])
    );
  }

  const items = data.map((item) => ({
    ...item,
    productos: productosMap[item.producto_id] || null,
  }));

  return {
    items,
    estado: pedidoData.estado || "Esperando",
    nombre: pedidoData.nombre || "Cliente",
    numero: pedidoData.numero || id,
  };
}

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedidoId = Number(id);

  if (isNaN(pedidoId)) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p>ID invalido</p>
      </div>
    );
  }

  const pedidoData = await getPedido(pedidoId);

  if (!pedidoData || pedidoData.items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p>No existe el pedido</p>
      </div>
    );
  }

  const total = pedidoData.items.reduce(
    (acc: number, item: any) => acc + item.cantidad * item.precio_unitario,
    0
  );

  const styles = {
    container: {
      maxWidth: 400,
      margin: "40px auto",
      fontFamily: "system-ui",
      color: "#111",
      WebkitTextSizeAdjust: "100%" as any,
      backgroundColor: "#ffffff",
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
    titulo: {
      textAlign: "center" as const,
      fontSize: 24,
      fontWeight: "bold" as const,
      letterSpacing: 2,
      color: "#000",
    },
    subtitulo: {
      textAlign: "center" as const,
      fontSize: 13,
      color: "#6b7280",
      margin: "4px 0 0",
    },
    pedidoNum: {
      textAlign: "center" as const,
      fontSize: 22,
      marginTop: 8,
      fontWeight: 600,
      color: "#111",
    },
    cliente: {
      textAlign: "center" as const,
      fontSize: 14,
      color: "#6b7280",
      margin: "4px 0 0",
    },
    linea: {
      margin: "12px 0",
      borderTop: "1px dashed #d1d5db",
    },
    item: {
      display: "flex" as const,
      justifyContent: "space-between" as const,
      fontSize: 17,
      marginBottom: 8,
      color: "#111",
    },
    totalRow: {
      display: "flex" as const,
      justifyContent: "space-between" as const,
      fontSize: 20,
      fontWeight: "bold" as const,
      marginTop: 10,
      color: "#000",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>PARKLISTO</h2>
      <p style={styles.subtitulo}>Sistema de pedidos</p>

      <div style={styles.linea} />

      <p style={styles.pedidoNum}>Pedido N° {pedidoId}</p>
      <p style={styles.cliente}>Cliente: {pedidoData.nombre}</p>

      <div style={styles.linea} />

      {pedidoData.items.map((item: any) => (
        <div key={item.id} style={styles.item}>
          <span>
            {item.cantidad} x {item.productos?.nombre_producto || "Producto"}
          </span>
          <span>${(item.cantidad * item.precio_unitario).toLocaleString()}</span>
        </div>
      ))}

      <div style={styles.linea} />

      <div style={styles.totalRow}>
        <strong>Total</strong>
        <strong>${total.toLocaleString()}</strong>
      </div>

      <div style={styles.linea} />

      <EstadoPedido pedidoId={pedidoId} />
    </div>
  );
}