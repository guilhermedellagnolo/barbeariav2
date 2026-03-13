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
    // 1. Verificação de Segurança da Sessão
    // Precisamos validar se quem está chamando essa rota é o admin autorizado
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
        // Se não tiver header, tenta pegar o cookie via Supabase (caso seja chamado pelo client-side)
        // Como esta é uma rota de API Handler, o middleware já deve ter barrado acessos externos,
        // mas é boa prática ter defesa em profundidade.
    }

    // Nota: Como estamos em um ambiente server-side sem acesso fácil aos cookies do middleware aqui dentro 
    // (a menos que usemos createServerClient), e o middleware JÁ BLOQUEIA acessos não autorizados a /api/* 
    // (se configurado no matcher), vamos confiar no middleware para autenticação básica.
    // Mas para blindagem total, vamos verificar se o body tem um "secret" ou se o usuário está logado.
    
    // Melhor abordagem: Usar o cliente anonimo para verificar a sessao do usuario que fez o request
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Pega o token do header
    const token = authHeader?.replace('Bearer ', '')
    let user = null
    
    if (token) {
        const { data } = await supabaseAuth.auth.getUser(token)
        user = data.user
    }

    // Hardcoded Security Check
    const ALLOWED_EMAIL = 'guilherme.delagnolo@gmail.com'
    if (!user || user.email !== ALLOWED_EMAIL) {
        return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 })
    }

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
