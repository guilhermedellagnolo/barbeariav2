import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const FALLBACK_BARBEARIA_ID = process.env.NEXT_PUBLIC_BARBEARIA_ID || 'fc398d1d-9c4e-4a93-9d45-8ebbaa1cf39a'

// Dominio base do SaaS (ex: t3barber.com.br). Subdomínios como pereira.t3barber.com.br
// serão resolvidos extraindo "pereira" e buscando na coluna `subdominio`.
// Defina via env var: ROOT_DOMAIN=t3barber.com.br
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || ''

// ─── Resolve barbearia_id via subdomínio OU domínio customizado ──────────────
async function resolveBarbeariaId(hostname: string): Promise<string | null> {
  // Dev: localhost / 127.0.0.1 → fallback para env var
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return FALLBACK_BARBEARIA_ID
  }

  // Estratégia 1: Subdomínio (pereira.t3barber.com.br → subdominio = "pereira")
  if (ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')
    if (subdomain && subdomain !== 'www') {
      return lookupByColumn('subdominio', subdomain)
    }
    // www.t3barber.com.br ou t3barber.com.br sem sub → 404 ou landing page
    return null
  }

  // Estratégia 2: Domínio customizado (barbeariapereira.com.br → dominio_customizado)
  return lookupByColumn('dominio_customizado', hostname)
}

async function lookupByColumn(column: string, value: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/barbearias?${column}=eq.${encodeURIComponent(value)}&select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate: 300 }, // cache 5 min no edge
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    return data?.[0]?.id || null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  // ── STEP 1: Resolucao Multi-Tenant ──────────────────────────────────────────
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0].replace(/^www\./, '')

  const barbeariaId = await resolveBarbeariaId(hostname)

  if (!barbeariaId) {
    return new NextResponse('Barbearia não encontrada.', { status: 404 })
  }

  // Injeta barbearia_id nos headers do request para leitura em Server Components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-barbearia-id', barbeariaId)

  // ── STEP 2: Supabase Auth Session Refresh (logica original) ─────────────────
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas publicas: acessiveis sem autenticacao
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/auth/')

  // Rotas que exigem autenticacao obrigatoria
  const isProtectedRoute =
    pathname === '/onboarding' ||
    pathname.startsWith('/meus-agendamentos')

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Propaga x-barbearia-id na response tambem
  supabaseResponse.headers.set('x-barbearia-id', barbeariaId)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
