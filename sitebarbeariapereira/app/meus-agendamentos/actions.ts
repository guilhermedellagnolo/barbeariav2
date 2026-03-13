'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const CANCEL_WINDOW_HOURS = 2

export async function cancelarAgendamento(agendamentoId: string) {
  const supabase = await createClient()

  // 1. Valida sessao
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser()

  if (sessionError || !user) {
    return { error: 'Sessao expirada. Faca login novamente.' }
  }

  // 2. Busca o agendamento — sem !inner para evitar falha de RLS no join
  const { data: agendamento, error: fetchError } = await supabase
    .from('agendamentos')
    .select('id, data_hora, status, cliente_id')
    .eq('id', agendamentoId)
    .single()

  if (fetchError || !agendamento) {
    console.error('[cancelar] Agendamento nao encontrado:', fetchError)
    return { error: 'Agendamento nao encontrado.' }
  }

  // 3. Verifica posse: busca o registro do cliente logado e compara cliente_id
  //    Feito em query separada para nao depender de JOIN cross-table com RLS
  const { data: clienteDoUsuario, error: clienteError } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (clienteError || !clienteDoUsuario) {
    console.error('[cancelar] Cliente nao encontrado para user_id:', user.id)
    return { error: 'Perfil de cliente nao encontrado.' }
  }

  if (agendamento.cliente_id !== clienteDoUsuario.id) {
    console.error(
      '[cancelar] Tentativa de cancelamento nao autorizado.',
      'cliente_id no agendamento:', agendamento.cliente_id,
      '| id do usuario logado:', clienteDoUsuario.id
    )
    return { error: 'Nao autorizado.' }
  }

  // 4. Verifica se ja esta cancelado ou encerrado
  if (agendamento.status === 'cancelado') {
    return { error: 'Este agendamento ja foi cancelado.' }
  }
  if (agendamento.status === 'concluido' || agendamento.status === 'faltou') {
    return { error: 'Nao e possivel cancelar um agendamento ja encerrado.' }
  }

  // 5. Regra de negocio: cancelamento so permitido com mais de 2h de antecedencia (UTC)
  //    Ambos getTime() retornam millisegundos desde epoch em UTC — comparacao correta.
  const agora = new Date()
  const dataAgendamento = new Date(agendamento.data_hora)

  const diferencaMs = dataAgendamento.getTime() - agora.getTime()
  const diferencaHoras = diferencaMs / (1000 * 60 * 60)

  console.log('[cancelar] agendamentoId:', agendamentoId)
  console.log('[cancelar] agora (UTC):', agora.toISOString())
  console.log('[cancelar] data_hora (UTC):', dataAgendamento.toISOString())
  console.log('[cancelar] diferenca em horas:', diferencaHoras.toFixed(2))

  if (diferencaHoras < CANCEL_WINDOW_HOURS) {
    // Converte o horario do agendamento para BRT para exibir na mensagem
    const horarioBrt = dataAgendamento.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
    return {
      error: `Cancelamento nao permitido. O prazo limite era 2h antes do horario marcado (${horarioBrt} - Brasilia).`,
    }
  }

  // 6. Executa o cancelamento
  const { data: updatedData, error: updateError } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', agendamentoId)
    .select()

  if (updateError) {
    console.error('[cancelar] Erro ao atualizar status:', updateError)
    return { error: 'Erro ao cancelar. Tente novamente.' }
  }

  if (!updatedData || updatedData.length === 0) {
    console.error('[cancelar] Update falhou silenciosamente (provavel bloqueio RLS).')
    return { error: 'Erro de permissao ao cancelar.' }
  }

  console.log('[cancelar] Agendamento cancelado com sucesso:', agendamentoId)

  // 7. Revalida a pagina para refletir o novo status sem reload manual
  revalidatePath('/meus-agendamentos')
  revalidatePath('/') // Libera o slot na vitrine imediatamente

  return { success: true }
}
