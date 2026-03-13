'use client'

import { useState } from 'react'
import { cancelarAgendamento } from './actions'
import { Button } from '@/components/ui/button'
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

interface CancelButtonProps {
  agendamentoId: string
  dataHora: string // ISO string UTC, ex: "2026-03-10T14:00:00"
}

export function CancelButton({ agendamentoId, dataHora }: CancelButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Calcula se o cancelamento ainda e permitido (mais de 2h de antecedencia)
  // Feito no cliente apenas para UX (desabilitar botao visualmente).
  // A regra definitiva e aplicada na Server Action (fonte da verdade).
  const agora = new Date()
  const dataAgendamento = new Date(dataHora)
  const diferencaHoras = (dataAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60)
  const cancelamentoPermitido = diferencaHoras > 2
  const jaPassou = diferencaHoras <= 0

  // Nao exibe o botao para agendamentos ja passados
  if (jaPassou) return null

  async function handleConfirm() {
    // Guard: impede segunda chamada se o usuario clicar rapido ou fechar/abrir o dialog
    if (loading) return

    setLoading(true)
    setError(null)

    const result = await cancelarAgendamento(agendamentoId)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      setOpen(false)
    }
    // Em caso de sucesso, revalidatePath no server atualiza a lista automaticamente.
    // O loading fica ativo durante o rerender (UX intencional).
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!cancelamentoPermitido || loading}
            className={
              cancelamentoPermitido
                ? 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive transition-colors'
                : 'border-border text-muted-foreground cursor-not-allowed opacity-50'
            }
            title={
              !cancelamentoPermitido
                ? 'Cancelamento nao permitido: prazo de 2h ja expirou'
                : 'Cancelar este agendamento'
            }
          >
            {loading ? (
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
            ) : null}
            Cancelar
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <div className="sr-only">
               <AlertDialogDescription>
                 Confirme se deseja cancelar o agendamento. Esta ação é irreversível.
               </AlertDialogDescription>
            </div>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O horario sera liberado para outros clientes.
              Lembre-se: cancelamentos so sao permitidos com ate 2 horas de antecedencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Cancelando...' : 'Sim, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
