import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Definição de rotas públicas e estáticas que NUNCA devem ser bloqueadas
  const path = request.nextUrl.pathname
  
  // Arquivos estáticos do Next.js, imagens, favicon, etc.
  if (
    path.startsWith('/_next') || 
    path.startsWith('/static') || 
    path.includes('.') || // Arquivos com extensão (js, css, png, etc)
    path === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Rotas públicas de autenticação
  if (path.startsWith('/login') || path.startsWith('/auth')) {
    return NextResponse.next()
  }

  // 2. Configuração do Cliente Supabase
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 3. Verificação de Sessão
  // getUser é mais seguro que getSession para middleware
  const { data: { user } } = await supabase.auth.getUser()

  // Se NÃO estiver logado -> Redireciona para Login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    // Evita loop de redirecionamento se já estiver indo pro login (embora o check acima já resolva)
    return NextResponse.redirect(loginUrl)
  }

  // 4. Verificação de E-mail (Segurança Hardcoded)
  const ALLOWED_EMAIL = 't3barber@gmail.com'
  
  if (user.email !== ALLOWED_EMAIL) {
    // Se for uma requisição de API, retorna JSON
    if (path.startsWith('/api')) {
       return new NextResponse(
        JSON.stringify({ error: 'Acesso negado. Usuário não autorizado.' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
    }
    
    // Se for página, faz logout e manda pro login com erro
    await supabase.auth.signOut()
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  return response
}

// Configuração do Matcher para ser o mais abrangente possível, 
// deixando a lógica de exclusão para o código (mais seguro e previsível)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}