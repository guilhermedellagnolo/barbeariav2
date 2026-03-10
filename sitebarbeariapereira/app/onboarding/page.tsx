import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Scissors } from 'lucide-react'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Se ja tem telefone, ja foi onboardado
  const { data: cliente } = await supabase
    .from('clientes')
    .select('telefone')
    .eq('user_id', user.id)
    .single()

  if (cliente?.telefone) redirect('/')

  // Nome completo vindo do Google OAuth (editavel pelo usuario no form)
  const nomeGoogle = (user.user_metadata?.full_name as string | undefined) ?? ''
  const primeiroNome = nomeGoogle.split(' ')[0] || 'voce'

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
              Ola, {primeiroNome}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              So mais um passo para agendar seu corte
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Complete seu perfil
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Usaremos para confirmar seus agendamentos
            </p>
          </div>

          {/* Passa o nome do Google para pre-preencher o campo, editavel */}
          <OnboardingForm nomeInicial={nomeGoogle} />
        </div>
      </div>
    </div>
  )
}
