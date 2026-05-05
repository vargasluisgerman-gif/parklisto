import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente con service role — bypasea RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { nombre_comercial, nombre_carrito, user_id, email } = await req.json()

    if (!nombre_comercial || !nombre_carrito || !user_id || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // 1. Crear empresa
    const { data: empresa, error: errEmpresa } = await supabaseAdmin
      .from('empresas')
      .insert({
        nombre_comercial,
        email,
        activo: true,
        pago_habilitado: false,
        plan: 'basico',
        saldo: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (errEmpresa) throw errEmpresa

    // 2. Crear carrito
    const slug = nombre_carrito
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { error: errCarrito } = await supabaseAdmin
      .from('carritos')
      .insert({
        nombre_comercial: nombre_carrito,
        slug,
        empresa_id: empresa.id,
        activo: true,
        created_at: new Date().toISOString(),
      })

    if (errCarrito) throw errCarrito

    // 3. Crear perfil del dueño
    const { error: errPerfil } = await supabaseAdmin
      .from('perfiles')
      .insert({
        id: user_id,
        empresa_id: empresa.id,
        rol: 'duenio',
        created_at: new Date().toISOString(),
      })

    if (errPerfil) throw errPerfil

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('Error onboarding API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}