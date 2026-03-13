import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Scissors, MapPin, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CancelButton } from './cancel-button'

export default async function MeusAgendamentos() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Get Client ID
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('user_id', user.id)
    .single()

  if (!cliente) {
    // Se o cliente nao existe, redireciona para onboarding em vez de mostrar erro
    redirect('/onboarding')
  }

  // 2. Get Appointments
  // Simplified query first to ensure data loads
  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select(`
      id,
      data_hora,
      status,
      barbeiros (
        nome
      )
    `)
    .eq('cliente_id', cliente.id)
    .order('data_hora', { ascending: false })

  if (error) {
    console.error("Error fetching appointments:", error)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline-block">Barbearia Pereira</span>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-sm text-muted-foreground hidden sm:inline-block">Olá, {cliente.nome}</span>
             <form action="/auth/signout" method="post">
               <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                 <LogOut className="h-4 w-4 mr-2" />
                 Sair
               </Button>
             </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus Agendamentos</h1>
            <p className="text-muted-foreground">Histórico de cortes e serviços</p>
          </div>
          <Button asChild>
            <a href="/">Novo Agendamento</a>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agendamentos?.map((agendamento) => {
            const date = new Date(agendamento.data_hora)
            
            // Status logic
            const statusStyles = {
              'agendado': 'bg-blue-500/10 text-blue-500 border-blue-200',
              'concluido': 'bg-green-500/10 text-green-500 border-green-200',
              'cancelado': 'bg-red-500/10 text-red-500 border-red-200',
              'faltou': 'bg-yellow-500/10 text-yellow-500 border-yellow-200'
            }
            const statusLabel = {
              'agendado': 'Agendado',
              'concluido': 'Concluído',
              'cancelado': 'Cancelado',
              'faltou': 'Faltou'
            }
            const statusKey = agendamento.status as keyof typeof statusStyles
            const style = statusStyles[statusKey] || 'bg-gray-100 text-gray-500'

            // Barber Name (safe access)
            const barberName = agendamento.barbeiros && !Array.isArray(agendamento.barbeiros) 
              ? agendamento.barbeiros.nome 
              : 'Barbeiro'

            return (
              <Card key={agendamento.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 bg-muted/5">
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant="outline" className={`${style} border`}>
                      {statusLabel[statusKey] || agendamento.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                      #{agendamento.id.slice(0, 8)}
                    </span>
                  </div>
                  <CardTitle className="text-xl">
                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 font-medium text-foreground/80">
                    <Clock className="h-4 w-4 text-primary" />
                    {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                    <span className="text-xs font-normal text-muted-foreground ml-1">(Brasília)</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{barberName}</p>
                        <p className="text-xs text-muted-foreground">Profissional</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Barbearia Pereira</p>
                        <p className="text-xs text-muted-foreground">Unidade Centro</p>
                      </div>
                    </div>
                  </div>

                  {/* Botao de cancelamento — so visivel para agendamentos ativos e futuros */}
                  {agendamento.status === 'agendado' && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <CancelButton
                        agendamentoId={agendamento.id}
                        dataHora={agendamento.data_hora}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {(!agendamentos || agendamentos.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-muted/5">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhum agendamento</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Você ainda não tem agendamentos registrados. Que tal marcar um corte hoje?
              </p>
              <Button asChild size="lg">
                <a href="/">Agendar Agora</a>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
