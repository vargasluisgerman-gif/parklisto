import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const inicio = searchParams.get("inicio") || "";
    const fin = searchParams.get("fin") || "";
    const empresaId = Number(searchParams.get("empresaId") || 0);

    console.log("PARAMS:", { inicio, fin, empresaId });

    // 🔥 CLIENTE SERVER
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🔹 EMPRESA
    const { data: empresa } = await supabase
      .from("empresas")
      .select("nombre_comercial, email")
      .eq("id", empresaId)
      .single();

    console.log("EMPRESA:", empresa);

    // 🔹 PEDIDOS
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("numero, nombre, total, created_at, carrito_id")
      .eq("empresa_id", empresaId);

    console.log("PEDIDOS:", pedidos);

    // 🔹 FILTRO FECHAS (manual para evitar errores)
    const pedidosFiltrados = (pedidos || []).filter((p) => {
      if (!p.created_at) return false;
      const fecha = new Date(p.created_at).getTime();
      return (
        fecha >= new Date(inicio).getTime() &&
        fecha <= new Date(fin).getTime()
      );
    });

    // 🔹 CARRITOS
    const carritoIds = [
      ...new Set(pedidosFiltrados.map((p) => p.carrito_id).filter(Boolean)),
    ];

    let carritos: any[] = [];

    if (carritoIds.length > 0) {
      const { data } = await supabase
        .from("carritos")
        .select("id, nombre_comercial")
        .in("id", carritoIds);

      carritos = data || [];
    }

    const nombreCarritos =
      carritos.length > 0
        ? carritos.map((c) => c.nombre_comercial).join(", ")
        : "Sin carritos";

    const totalGeneral = pedidosFiltrados.reduce(
      (acc, p) => acc + (p.total || 0),
      0
    );

    // 🔥 PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 760;

    page.drawText("INFORME DE VENTAS", {
      x: 180,
      y,
      size: 18,
      font: bold,
    });

    y -= 30;

    page.drawText(`Empresa: ${empresa?.nombre_comercial || "N/A"}`, {
      x: 40,
      y,
      size: 12,
      font,
    });

    y -= 18;

    page.drawText(`Email: ${empresa?.email || "N/A"}`, {
      x: 40,
      y,
      size: 12,
      font,
    });

    y -= 18;

    page.drawText(`Carritos: ${nombreCarritos}`, {
      x: 40,
      y,
      size: 12,
      font,
    });

    y -= 18;

    page.drawText(`Período: ${inicio} al ${fin}`, {
      x: 40,
      y,
      size: 10,
      font,
    });

    y -= 30;

    page.drawText("Fecha", { x: 40, y, size: 12, font: bold });
    page.drawText("Pedido", { x: 140, y, size: 12, font: bold });
    page.drawText("Nombre", { x: 250, y, size: 12, font: bold });
    page.drawText("Total", { x: 450, y, size: 12, font: bold });

    y -= 15;

    pedidosFiltrados.forEach((p) => {
      if (y < 80) return;

      page.drawText(
        p.created_at
          ? new Date(p.created_at).toLocaleDateString()
          : "-",
        { x: 40, y, size: 10, font }
      );

      page.drawText(`${p.numero || "-"}`, { x: 150, y, size: 10, font });
      page.drawText(p.nombre || "-", { x: 250, y, size: 10, font });
      page.drawText(`$${p.total || 0}`, { x: 450, y, size: 10, font });

      y -= 15;
    });

    y -= 20;

    page.drawText(`TOTAL: $${totalGeneral}`, {
      x: 350,
      y,
      size: 14,
      font: bold,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });

  } catch (error) {
    console.log("ERROR REAL:", error);

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
