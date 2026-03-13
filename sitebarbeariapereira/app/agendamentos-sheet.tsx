'use client'

import { useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription, // Importado
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Calendar, Clock, Scissors, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cancelarAgendamento } from './meus-agendamentos/actions'

interface Agendamento {
  id: string
  data_hora: string
  status: 'agendado' | 'concluido' | 'cancelado' | 'faltou'
  barbeiros?: { nome: string } | null
}

const STATUS_STYLES = {
  agendado: 'bg-blue-500/10 text-blue-500 border-blue-200',
  concluido: 'bg-green-500/10 text-green-500 border-green-200',
  cancelado: 'bg-red-500/10 text-red-500 border-red-200',
  faltou: 'bg-yellow-500/10 text-yellow-500 border-yellow-200',
} as const

const STATUS_LABEL = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  faltou: 'Faltou',
} as const

// ─── Card de Agendamento com botao de cancelamento inline ────────────────────
function AgendamentoCard({
  agendamento,
  onCanceled,
}: {
  agendamento: Agendamento
  onCanceled: (id: string) => void
}) {
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const dataHora = new Date(agendamento.data_hora)
  const agora = new Date()
  const diferencaHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60)
  const jaPassou = diferencaHoras <= 0
  const cancelamentoPermitido = diferencaHoras > 2

  const barberName =
    agendamento.barbeiros && !Array.isArray(agendamento.barbeiros)
      ? agendamento.barbeiros.nome
      : 'Barbeiro'

  const statusKey = agendamento.status as keyof typeof STATUS_STYLES
  const style = STATUS_STYLES[statusKey] || 'bg-gray-100 text-gray-500'

  async function handleConfirmCancel() {
    if (loadingCancel) return
    setLoadingCancel(true)
    setCancelError(null)

    const result = await cancelarAgendamento(agendamento.id)

    if (result.error) {
      setCancelError(result.error)
      setLoadingCancel(false)
      setDialogOpen(false)
    } else {
      // Avisa o componente pai para remover o card da lista
      onCanceled(agendamento.id)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      {/* Header: status + data */}
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={`${style} border text-xs`}>
          {STATUS_LABEL[statusKey] || agendamento.status}
        </Badge>
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
          #{agendamento.id.slice(0, 8)}
        </span>
      </div>

      {/* Data + hora */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
          {dataHora.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
          {dataHora.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          })}
          <span className="text-xs">(Brasília)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Scissors className="h-4 w-4 text-primary flex-shrink-0" />
          {barberName}
        </div>
      </div>

      {/* Botao de cancelamento — so para agendamentos ativos e futuros */}
      {agendamento.status === 'agendado' && !jaPassou && (
        <div className="pt-2 border-t border-border">
          {cancelError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mb-2">
              {cancelError}
            </p>
          )}
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!cancelamentoPermitido || loadingCancel}
                className={
                  cancelamentoPermitido
                    ? 'w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive transition-colors'
                    : 'w-full border-border text-muted-foreground cursor-not-allowed opacity-50'
                }
                title={
                  !cancelamentoPermitido
                    ? 'Prazo de 2h para cancelamento ja expirou'
                    : 'Cancelar este agendamento'
                }
              >
                {loadingCancel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Cancelar agendamento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acao nao pode ser desfeita. O horario sera liberado para outros clientes.
                  Lembre-se: cancelamentos so sao permitidos com ate 2 horas de antecedencia.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loadingCancel}>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmCancel}
                  disabled={loadingCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {loadingCancel ? 'Cancelando...' : 'Sim, cancelar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

// ─── Sheet principal ──────────────────────────────────────────────────────────
interface AgendamentosSheetProps {
  children: React.ReactNode // trigger (ex: botao "Meus Agendamentos")
  clienteId: string | null  // null = usuario sem registro de cliente ainda
}

export function AgendamentosSheet({ children, clienteId }: AgendamentosSheetProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchAgendamentos = useCallback(async () => {
    if (!clienteId) return

    setLoading(true)
    setFetchError(null)

    // Filtra apenas agendamentos futuros com status 'agendado':
    //   - status = 'agendado'  → exclui concluidos, cancelados e faltas
    //   - data_hora > agora    → exclui passados (usa UTC porque o banco armazena em UTC)
    const nowIso = new Date().toISOString()

    const supabase = createClient()
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id, data_hora, status, barbeiros(nome)')
      .eq('cliente_id', clienteId)
      .eq('status', 'agendado')
      .gt('data_hora', nowIso)
      .order('data_hora', { ascending: true })

    if (error) {
      console.error('[AgendamentosSheet] Erro ao buscar agendamentos:', error)
      setFetchError('Nao foi possivel carregar seus agendamentos. Tente novamente.')
    } else {
      setAgendamentos((data as Agendamento[]) || [])
    }

    setLoading(false)
  }, [clienteId])

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      // Carrega agendamentos toda vez que o sheet abre (dados frescos)
      fetchAgendamentos()
    }
  }

  function handleCanceled(id: string) {
    // Atualiza status localmente para evitar reload completo
    setAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelado' as const } : a))
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        {/* SheetTitle obrigatorio pelo Radix UI (ARIA) */}
        <SheetTitle className="sr-only">Meus Agendamentos</SheetTitle>
        <SheetDescription className="sr-only">
          Lista dos seus agendamentos futuros e passados na barbearia.
        </SheetDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Meus Agendamentos</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>

        {/* Conteudo */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!clienteId ? (
            // Usuario logado mas sem registro de cliente (onboarding incompleto)
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <Scissors className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                Complete seu cadastro para visualizar seus agendamentos.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-destructive">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={fetchAgendamentos}>
                Tentar novamente
              </Button>
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <Calendar className="h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">Nenhum agendamento futuro</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Voce nao tem agendamentos proximos. Que tal marcar um horario?
              </p>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Ver horarios disponíveis
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {agendamentos.map((ag) => (
                <AgendamentoCard key={ag.id} agendamento={ag} onCanceled={handleCanceled} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
