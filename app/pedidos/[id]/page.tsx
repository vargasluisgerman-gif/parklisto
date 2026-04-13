import { supabase } from "@/lib/supabase";
import EstadoPedido from "@/components/EstadoPedido";

async function getPedido(id: number) {
  const { data: pedidoData, error: errorPedido } = await supabase
    .from("pedidos")
    .select("estado")
    .eq("id", id)
    .single();

  if (errorPedido) {
    console.log("ERROR PEDIDO:", errorPedido);
    return null;
  }

  const { data, error } = await supabase
    .from("pedido_productos")
    .select(`
      id,
      cantidad,
      precio_unitario,
      producto_id
    `)
    .eq("pedido_id", id);

  if (error || !data) {
    console.log("ERROR PEDIDO_PRODUCTOS:", error);
    return null;
  }

  const { data: productos, error: errorProductos } = await supabase
    .from("productos")
    .select("id, nombre_producto");

  if (errorProductos) {
    console.log("ERROR PRODUCTOS:", errorProductos);
    return null;
  }

  const items = data.map((item) => ({
    ...item,
    productos:
      productos?.find(
        (p) => Number(p.id) === Number(item.producto_id)
      ) || null,
  }));

  return {
    items,
    estado: pedidoData?.estado || "Esperando",
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
    return <div>ID inválido</div>;
  }

  const pedidoData = await getPedido(pedidoId);

  if (!pedidoData || pedidoData.items.length === 0) {
    return <div>No existe el pedido</div>;
  }

  const pedido = pedidoData.items;

  const total = pedido.reduce(
    (acc: number, item: any) =>
      acc + item.cantidad * item.precio_unitario,
    0
  );

  // 🎨 CONFIGURACIÓN DE ESTILOS (EDITÁS TODO ACÁ)
  const styles = {
    container: {
      maxWidth: 400,
      margin: "40px auto",
      fontFamily: "system-ui",
color: "#111", // 🔥 negro fuerte
WebkitTextSizeAdjust: "100%", // 🔥 FIX iPhone
      backgroundColor: "#ffffff",
      padding: 20,
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },

    titulo: {
      textAlign: "center" as const,
      fontSize: 24,
      fontWeight: "bold",
      letterSpacing: 2,
    },

    pedido: {
      textAlign: "center" as const,
      fontSize: 25,
      marginTop: 5,
    },

    linea: {
      margin: "10px 0",
      borderTop: "1px dashed #999",
    },

    item: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 18,
      marginBottom: 6,
    },

    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 20,
      fontWeight: "bold",
      marginTop: 10,
    },

    estadoBox: {
      marginTop: 20,
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.titulo}>PARKLISTO</h2>

      <div style={styles.linea} />

      <p style={styles.pedido}>Pedido N° {pedidoId}</p>

      <div style={styles.linea} />

      {pedido.map((item: any) => (
        <div key={item.id} style={styles.item}>
          <span>
            {item.cantidad} x{" "}
            {item.productos?.nombre_producto || "Producto"}
          </span>
          <span>
            $
            {(
              item.cantidad * item.precio_unitario
            ).toLocaleString()}
          </span>
        </div>
      ))}

      <div style={styles.linea} />

      <div style={styles.totalRow}>
        <strong>Total</strong>
        <strong>${total.toLocaleString()}</strong>
      </div>

      <div style={styles.linea} />

      <div style={styles.estadoBox}>
        <EstadoPedido pedidoId={pedidoId} />
      </div>
    </div>
  );
}