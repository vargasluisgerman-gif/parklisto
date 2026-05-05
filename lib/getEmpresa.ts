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