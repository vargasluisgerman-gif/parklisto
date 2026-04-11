export function validarLicencia(empresa: any) {
  if (!empresa) {
    return { ok: false, motivo: "Empresa no encontrada" };
  }

  if (!empresa.pago_habilitado) {
    return { ok: false, motivo: "Pago no habilitado" };
  }

  if (empresa.fecha_vencimiento) {
    const ahora = Date.now();
    const vencimiento = new Date(empresa.fecha_vencimiento).getTime();

    const dias = Math.ceil(
      (vencimiento - ahora) / (1000 * 60 * 60 * 24)
    );

    if (dias < 0) {
      return { ok: false, motivo: "Licencia vencida" };
    }
  }

  return { ok: true };
}