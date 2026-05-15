import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get("inicio") || "";
    const fin = searchParams.get("fin") || "";
    const empresaId = Number(searchParams.get("empresaId") || 0);

    if (!empresaId || !inicio || !fin) {
      return NextResponse.json({ error: "Parametros incompletos" }, { status: 400 });
    }

    // Empresa
    const { data: empresa } = await supabaseAdmin
      .from("empresas")
      .select("nombre_comercial, email")
      .eq("id", empresaId)
      .single();

    // Parsear timestamps completos (pueden venir con hora o solo fecha)
    const fechaInicio = new Date(inicio.includes("T") ? inicio : `${inicio}T00:00:00.000Z`);
    const fechaFin = new Date(fin.includes("T") ? fin : `${fin}T23:59:59.999Z`);

    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("id, numero, nombre, total, created_at, carrito_id, estado")
      .eq("empresa_id", empresaId)
      .gte("created_at", fechaInicio.toISOString())
      .lte("created_at", fechaFin.toISOString())
      .order("created_at", { ascending: true });

    const pedidosFiltrados = pedidos || [];

    // Carritos
    const carritoIds = [
      ...new Set(pedidosFiltrados.map((p: any) => p.carrito_id).filter(Boolean)),
    ];

    let carritos: any[] = [];
    if (carritoIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("carritos")
        .select("id, nombre_comercial")
        .in("id", carritoIds);
      carritos = data || [];
    }

    const nombreCarritos = carritos.length > 0
      ? carritos.map((c: any) => c.nombre_comercial).join(", ")
      : "Sin carritos";

    const totalGeneral = pedidosFiltrados.reduce(
      (acc: number, p: any) => acc + (p.total || 0), 0
    );
    const cantidadPedidos = pedidosFiltrados.length;
    const ticketPromedio = cantidadPedidos > 0
      ? Math.round(totalGeneral / cantidadPedidos)
      : 0;

    // Formatear período para mostrar en el PDF
    const formatearPeriodo = (dt: Date) => {
      const fecha = dt.toLocaleDateString("es-AR");
      const hora = dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      return `${fecha} ${hora}`;
    };

    const periodoTexto = `${formatearPeriodo(fechaInicio)} al ${formatearPeriodo(fechaFin)}`;

    // ─── PDF ───────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const negro = rgb(0.05, 0.05, 0.05);
    const gris = rgb(0.45, 0.45, 0.45);
    const grisSuave = rgb(0.95, 0.95, 0.95);
    const verde = rgb(0.08, 0.60, 0.28);
    const blanco = rgb(1, 1, 1);
    const naranja = rgb(0.80, 0.45, 0.05);
    const headerBg = rgb(0.08, 0.12, 0.20);

    // ── HEADER ──
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: headerBg });

    page.drawText("PARKLISTO", { x: 32, y: height - 45, size: 26, font: bold, color: verde });
    page.drawText("Sistema de pedidos para food trucks", { x: 32, y: height - 62, size: 9, font, color: rgb(0.65, 0.65, 0.65) });
    page.drawText("INFORME DE VENTAS", { x: width - 190, y: height - 45, size: 15, font: bold, color: blanco });
    page.drawText(`Generado: ${new Date().toLocaleDateString("es-AR")}`, { x: width - 190, y: height - 62, size: 9, font, color: rgb(0.65, 0.65, 0.65) });

    // ── DATOS EMPRESA ──
    let y = height - 110;

    page.drawText("EMPRESA", { x: 32, y, size: 8, font: bold, color: gris });
    y -= 16;
    page.drawText(empresa?.nombre_comercial || "N/A", { x: 32, y, size: 14, font: bold, color: negro });
    y -= 16;
    page.drawText(empresa?.email || "", { x: 32, y, size: 10, font, color: gris });
    y -= 14;
    page.drawText(`Carritos: ${nombreCarritos}`, { x: 32, y, size: 10, font, color: gris });

    // Periodo con hora (derecha)
    page.drawText("PERIODO", { x: width - 220, y: height - 110, size: 8, font: bold, color: gris });
    page.drawText(periodoTexto, { x: width - 220, y: height - 126, size: 10, font: bold, color: negro });

    // ── LINEA DIVISORA ──
    y -= 18;
    page.drawRectangle({ x: 32, y, width: width - 64, height: 1, color: rgb(0.85, 0.85, 0.85) });

    // ── METRICAS RESUMEN ──
    y -= 52;
    const metricW = (width - 64) / 3;

    [
      { label: "Total vendido", value: `$${totalGeneral.toLocaleString("es-AR")}` },
      { label: "Pedidos", value: `${cantidadPedidos}` },
      { label: "Ticket promedio", value: `$${ticketPromedio.toLocaleString("es-AR")}` },
    ].forEach((m, i) => {
      const mx = 32 + i * metricW;
      page.drawRectangle({ x: mx + 4, y: y - 8, width: metricW - 8, height: 48, color: grisSuave });
      page.drawText(m.label, { x: mx + 14, y: y + 24, size: 8, font, color: gris });
      page.drawText(m.value, { x: mx + 14, y: y + 6, size: 16, font: bold, color: verde });
    });

    // ── TABLA HEADER — ahora con columna Hora ──
    y -= 36;
    page.drawRectangle({ x: 32, y, width: width - 64, height: 22, color: headerBg });

    // Columnas ajustadas para incluir Hora
    const cols = {
      fecha: 36,
      hora: 106,
      pedido: 156,
      nombre: 216,
      carrito: 326,
      estado: 416,
      total: 496,
    };

    [
      { x: cols.fecha, t: "Fecha" },
      { x: cols.hora, t: "Hora" },
      { x: cols.pedido, t: "Pedido" },
      { x: cols.nombre, t: "Cliente" },
      { x: cols.carrito, t: "Carrito" },
      { x: cols.estado, t: "Estado" },
      { x: cols.total, t: "Total" },
    ].forEach(({ x, t }) => {
      page.drawText(t, { x, y: y + 7, size: 9, font: bold, color: blanco });
    });

    // ── FILAS ──
    y -= 22;
    let paginaActual = page;
    let filaIndex = 0;

    const dibujarHeaderTabla = (pg: typeof page, posY: number) => {
      pg.drawRectangle({ x: 32, y: posY, width: width - 64, height: 22, color: headerBg });
      [
        { x: cols.fecha, t: "Fecha" },
        { x: cols.hora, t: "Hora" },
        { x: cols.pedido, t: "Pedido" },
        { x: cols.nombre, t: "Cliente" },
        { x: cols.carrito, t: "Carrito" },
        { x: cols.estado, t: "Estado" },
        { x: cols.total, t: "Total" },
      ].forEach(({ x, t }) => {
        pg.drawText(t, { x, y: posY + 7, size: 9, font: bold, color: blanco });
      });
    };

    for (const p of pedidosFiltrados) {
      if (y < 80) {
        paginaActual = pdfDoc.addPage([595, 842]);
        y = height - 40;
        dibujarHeaderTabla(paginaActual, y);
        y -= 22;
        filaIndex = 0;
      }

      if (filaIndex % 2 === 0) {
        paginaActual.drawRectangle({ x: 32, y, width: width - 64, height: 20, color: grisSuave });
      }

      const fechaObj = p.created_at ? new Date(p.created_at) : null;
      const fecha = fechaObj ? fechaObj.toLocaleDateString("es-AR") : "-";
      const hora = fechaObj ? fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "-";

      const carritoNombre = carritos.find((c: any) => c.id === p.carrito_id)?.nombre_comercial || "-";
      const nombre = (p.nombre || "-").length > 13 ? (p.nombre || "-").substring(0, 11) + ".." : (p.nombre || "-");
      const carritoTrunc = carritoNombre.length > 12 ? carritoNombre.substring(0, 10) + ".." : carritoNombre;

      paginaActual.drawText(fecha, { x: cols.fecha, y: y + 6, size: 9, font, color: negro });
      paginaActual.drawText(hora, { x: cols.hora, y: y + 6, size: 9, font, color: gris });
      paginaActual.drawText(`${p.id || "-"}`, { x: cols.pedido, y: y + 6, size: 9, font, color: negro });
      paginaActual.drawText(nombre, { x: cols.nombre, y: y + 6, size: 9, font, color: negro });
      paginaActual.drawText(carritoTrunc, { x: cols.carrito, y: y + 6, size: 9, font, color: negro });

      const estadoColor = p.estado === "Listo" ? verde : naranja;
      paginaActual.drawText(p.estado || "-", { x: cols.estado, y: y + 6, size: 9, font: bold, color: estadoColor });
      paginaActual.drawText(`$${(p.total || 0).toLocaleString("es-AR")}`, { x: cols.total, y: y + 6, size: 9, font: bold, color: negro });

      y -= 20;
      filaIndex++;
    }

    if (pedidosFiltrados.length === 0) {
      paginaActual.drawText("No hay pedidos en el periodo seleccionado.", { x: 40, y: y + 6, size: 10, font: italic, color: gris });
      y -= 20;
    }

    // ── TOTAL FINAL ──
    y -= 10;
    paginaActual.drawRectangle({ x: 32, y, width: width - 64, height: 30, color: headerBg });
    paginaActual.drawText("TOTAL GENERAL", { x: 42, y: y + 10, size: 11, font: bold, color: blanco });
    paginaActual.drawText(`$${totalGeneral.toLocaleString("es-AR")}`, { x: cols.total - 14, y: y + 10, size: 13, font: bold, color: verde });

    // ── FOOTER ──
    const pagesCount = pdfDoc.getPageCount();
    for (let i = 0; i < pagesCount; i++) {
      const pg = pdfDoc.getPage(i);
      pg.drawText(
        `PARKLISTO - Informe generado automaticamente - Pagina ${i + 1} de ${pagesCount}`,
        { x: 32, y: 18, size: 7, font, color: gris }
      );
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="parklisto-informe.pdf"`,
      },
    });

  } catch (error: any) {
    console.log("ERROR REPORTE:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}