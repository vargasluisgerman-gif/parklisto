import { supabase } from "@/lib/supabase";

export async function getEmpresaUsuario() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select("empresa_id, rol")
    .eq("id", user.id)
    .single();

  if (error || !data?.empresa_id) {
    return null;
  }

  return data.empresa_id;
}

export async function getRolUsuario() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  return data?.rol ?? null;
}

// Retorna el carrito_id asignado al empleado, o null si tiene acceso a todos
export async function getCarritoEmpleado(): Promise<number | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("carrito_id, rol")
    .eq("id", user.id)
    .single();

  // Si es dueño o no tiene carrito asignado → acceso a todos
  if (!data || data.rol === "duenio" || !data.carrito_id) return null;

  return data.carrito_id;
}