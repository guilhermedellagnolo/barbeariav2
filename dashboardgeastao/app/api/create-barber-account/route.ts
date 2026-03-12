import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BarberAccount {
  email: string
  password: string
  nome: string
}

export async function POST(request: NextRequest) {
  try {
    const { barbers } = (await request.json()) as { barbers: BarberAccount[] }

    if (!barbers || barbers.length === 0) {
      return NextResponse.json({ error: "Nenhum barbeiro fornecido" }, { status: 400 })
    }

    const results: { email: string; userId: string | null; error: string | null }[] = []

    for (const barber of barbers) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: barber.email,
        password: barber.password,
        email_confirm: true, // Conta ativa imediatamente, sem email de confirmação
        user_metadata: { nome: barber.nome, role: "barbeiro" },
      })

      if (error) {
        results.push({ email: barber.email, userId: null, error: error.message })
      } else {
        results.push({ email: barber.email, userId: data.user.id, error: null })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    )
  }
}
