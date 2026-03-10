import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { LoginButton } from './login-button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/')

  const params = await searchParams
  const errorMsg =
    params.error === 'auth_error'
      ? 'Erro ao autenticar. Tente novamente.'
      : params.error === 'no_code'
      ? 'Link de login invalido. Tente novamente.'
      : null

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Scissors className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Barbearia Pereira
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Agende seu corte com facilidade
            </p>
          </div>
        </div>

        {/* Card de login */}
        <div className="w-full bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Entrar na sua conta
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use sua conta Google para agendar em segundos
            </p>
          </div>

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
            </div>
          )}

          <LoginButton />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Ao continuar, voce concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  )
}
