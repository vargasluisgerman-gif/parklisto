import { supabase } from "@/lib/supabase";

export async function getEmpresaUsuario() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("ERROR PERFIL:", error);
    return null;
  }

  return data?.empresa_id;
}