import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        {/* LOGO / TITULO */}
        <h1
          style={{
            fontSize: 32,
            marginBottom: 10,
            fontWeight: "bold",
          }}
        >
          🍔 PARKLISTO
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: 30,
          }}
        >
          Sistema de pedidos con QR
        </p>

        {/* BOTONES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/caja">
            <button style={styles.primary}>
              💰 Ir a Caja
            </button>
          </Link>

          <Link href="/dashboard">
            <button style={styles.secondary}>
              👨‍🍳 Cocina
            </button>
          </Link>

          <Link href="/productos">
            <button style={styles.secondary}>
              📦 Productos
            </button>
          </Link>
        </div>

        {/* INFO */}
        <div style={{ marginTop: 25, fontSize: 12, color: "#999" }}>
          Plataforma de gestión en tiempo real
        </div>
      </div>
    </div>
  );
}

const styles = {
  primary: {
    padding: "14px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #28a745, #218838)",
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    cursor: "pointer",
  },
  secondary: {
    padding: "14px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    cursor: "pointer",
  },
};