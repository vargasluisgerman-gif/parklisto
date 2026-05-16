import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pedido_id = Number(body.pedido_id);
    const estado = body.estado;

    if (!pedido_id || !estado) {
      return NextResponse.json(
        { error: "pedido_id y estado son requeridos" },
        { status: 400 }
      );
    }

    // Actualizar estado del pedido
    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .update({ estado })
      .eq("id", pedido_id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si el pedido está listo, enviar notificación push
    if (estado === "Listo") {
      const { data: suscripciones } = await supabaseAdmin
        .from("push_suscripciones")
        .select("*")
        .eq("pedido_id", pedido_id);

      if (suscripciones && suscripciones.length > 0) {
        const payload = JSON.stringify({
          title: "Tu pedido esta listo!",
          body: `El pedido #${pedido_id} esta listo para retirar`,
          url: `/pedidos/${pedido_id}`,
        });

        await Promise.allSettled(
          suscripciones.map((s: any) =>
            webpush.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              payload
            ).catch((err) => {
              console.error("[Push] Error enviando notificacion:", err.message);
              // Si el endpoint es inválido, borrar la suscripción
              if (err.statusCode === 410) {
                supabaseAdmin
                  .from("push_suscripciones")
                  .delete()
                  .eq("endpoint", s.endpoint);
              }
            })
          )
        );

        console.log(`[Push] Notificacion enviada para pedido #${pedido_id}`);
      }
    }

    return NextResponse.json({ data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}