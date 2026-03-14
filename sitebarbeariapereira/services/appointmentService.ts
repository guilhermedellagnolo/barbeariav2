// Usa createBrowserClient do @supabase/ssr para sincronizar cookies de sessão
// e garantir que as RLS policies funcionem corretamente no cliente.
// IMPORTANTE: NÃO usar singleton de módulo — createClient() é chamado por função
// para evitar estado stale entre hot-reloads do Next.js e re-uso de conexão cacheada.
import { createClient } from '@/lib/supabase/client'
import { sendWhatsAppNotification } from '@/lib/uazapi'

/** @deprecated Use barbeariaId passado via prop (resolvido pelo middleware). Mantido apenas como fallback interno. */
export const BARBERSHOP_ID = process.env.NEXT_PUBLIC_BARBEARIA_ID || 'fc398d1d-9c4e-4a93-9d45-8ebbaa1cf39a'
const DEFAULT_BARBERSHOP_ID = BARBERSHOP_ID

export interface WorkingHours {
  id: string
  barberId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  lunchStart: string
  lunchEnd: string
  isWorking: boolean
  slotDuration: number // intervalo da grade em minutos (ex: 30)
}

export interface Appointment {
  id: string
  data_hora: string
  status: 'agendado' | 'concluido' | 'cancelado' | 'faltou'
  cliente_nome?: string
  cliente_telefone?: string
  servicos?: { nome: string; duracao?: number; duracao_minutos?: number; preco?: number }
}

export interface TimeSlot {
  time: string
  status: 'livre' | 'ocupado' | 'bloqueado'
  clientName?: string
  clientPhone?: string
  service?: string
}

export interface Barber {
  id: string
  nome: string
  foto_url?: string
}

// ─── Interface para Barbearia (Multi-Tenant dinâmico) ────────────────────────
export interface Barbearia {
  id: string
  nome: string
  subdominio: string
  dominio_customizado: string | null
  ativo: boolean
  foto_fundo_url: string | null
  ano_fundacao: string | null
  slogan_principal: string | null
  descricao_hero: string | null
  fotos_galeria: string[]
  descricao_rodape: string | null
  endereco: string | null
  telefone: string | null
  horarios_texto: string | null
  instagram_url: string | null
}

// ─── Interface para Serviços ──────────────────────────────────────────────────
export interface Servico {
  id: string
  nome: string
  duracao_minutos: number // duração real do serviço (pode ser maior que slotDuration)
  preco?: number | null
}

// ─── Funções de leitura ───────────────────────────────────────────────────────

export async function getBarbearia(barbeariaId: string = BARBERSHOP_ID): Promise<Barbearia | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('barbearias')
    .select('id, nome, subdominio, dominio_customizado, ativo, foto_fundo_url, ano_fundacao, slogan_principal, descricao_hero, fotos_galeria, descricao_rodape, endereco, telefone, horarios_texto, instagram_url')
    .eq('id', barbeariaId)
    .single()

  if (error) {
    console.error('[getBarbearia] Erro:', error.message, '| code:', error.code)
    return null
  }

  return {
    ...data,
    fotos_galeria: data.fotos_galeria || [],
  }
}

export async function getBarberDetails(barberId: string): Promise<Barber | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('barbeiros')
    .select('id, nome, foto_url')
    .eq('id', barberId)
    .single()

  if (error) {
    console.error('[getBarberDetails] Erro:', error.message, '| details:', error.details, '| hint:', error.hint, '| code:', error.code)
    return null
  }
  return data
}

export async function getMainBarberId(barbershopId: string = BARBERSHOP_ID): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('barbeiros')
    .select('id')
    .eq('barbearia_id', barbershopId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getMainBarberId] Erro:', error.message, '| details:', error.details, '| hint:', error.hint, '| code:', error.code)
    return null
  }
  return data?.id || null
}

export async function getAllBarbers(barbershopId: string = BARBERSHOP_ID): Promise<Barber[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('barbeiros')
    .select('id, nome, foto_url')
    .eq('barbearia_id', barbershopId)
    .eq('ativo', true)
    .order('nome')

  if (error) {
    console.error('[getAllBarbers] Erro:', error.message, '| code:', error.code)
    return []
  }
  return data || []
}

export async function getBarberWorkingHours(barberId: string, dayOfWeek: number): Promise<WorkingHours | null> {
  const supabase = createClient()
  // Seleciona colunas explicitamente para detectar colunas ausentes com clareza.
  // Se duracao_slot não existir no banco (migration pendente), o SELECT vai falhar
  // com code 42703 — capturamos e fazemos fallback para SELECT sem ela.
  const { data, error } = await supabase
    .from('horarios_trabalho')
    .select('id, barbeiro_id, dia_semana, inicio, fim, inicio_almoco, fim_almoco, trabalha, duracao_slot')
    .eq('barbeiro_id', barberId)
    .eq('dia_semana', dayOfWeek)
    .maybeSingle()

  if (error) {
    // Coluna duracao_slot ainda não existe no banco (migration pendente)
    if (error.code === '42703') {
      console.warn('[getBarberWorkingHours] Coluna duracao_slot nao existe. Execute: ALTER TABLE horarios_trabalho ADD COLUMN IF NOT EXISTS duracao_slot INTEGER NOT NULL DEFAULT 30; Usando fallback de 30min.')

      const { data: fallback, error: fallbackError } = await supabase
        .from('horarios_trabalho')
        .select('id, barbeiro_id, dia_semana, inicio, fim, inicio_almoco, fim_almoco, trabalha')
        .eq('barbeiro_id', barberId)
        .eq('dia_semana', dayOfWeek)
        .maybeSingle()

      if (fallbackError || !fallback) return null

      return {
        id: fallback.id,
        barberId: fallback.barbeiro_id,
        dayOfWeek: fallback.dia_semana,
        startTime: fallback.inicio,
        endTime: fallback.fim,
        lunchStart: fallback.inicio_almoco,
        lunchEnd: fallback.fim_almoco,
        isWorking: fallback.trabalha,
        slotDuration: 30, // fallback enquanto migration não rodar
      }
    }

    console.error('[getBarberWorkingHours] Erro:', error.message, '| code:', error.code)
    return null
  }

  if (!data) return null

  // [AUDIT-2] Confirma o valor bruto que o banco entregou antes do mapeamento
  console.log('[getBarberWorkingHours] Dados brutos do DB:', JSON.stringify(data))

  return {
    id: data.id,
    barberId: data.barbeiro_id,
    dayOfWeek: data.dia_semana,
    startTime: data.inicio,
    endTime: data.fim,
    lunchStart: data.inicio_almoco,
    lunchEnd: data.fim_almoco,
    isWorking: data.trabalha,
    slotDuration: data.duracao_slot ?? 30,
  }
}

/**
 * Busca os serviços ativos da barbearia, ordenados por nome.
 * Depende das colunas: id, nome, duracao_minutos, preco, ativo (opcional), barbearia_id (opcional).
 * Se a tabela não tiver barbearia_id, remova o filtro correspondente.
 */
export async function getServicos(barbeariaId: string = BARBERSHOP_ID): Promise<Servico[]> {
  const supabase = createClient()
  // Seleciona apenas id e nome primeiro — colunas que certamente existem.
  // duracao_minutos e preco podem ainda não ter sido adicionadas via migration.
  // Se existirem, serão incluídas; se não, o fallback abaixo garante valores default.
  const { data, error } = await supabase
    .from('servicos')
    .select('id, nome, duracao, preco')
    .eq('barbearia_id', barbeariaId)
    .order('nome')

  if (error) {
    // Se falhou por coluna inexistente (42703), tenta buscar só id+nome como fallback
    if (error.code === '42703') {
      console.warn('[getServicos] Colunas duracao/preco nao existem ainda. Execute o SQL de migration. Usando fallback.')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('servicos')
        .select('id, nome')
        .order('nome')

      if (fallbackError) {
        console.error('[getServicos] Fallback erro:', fallbackError.message, '| code:', fallbackError.code)
        return []
      }

      // Injeta duracao_minutos=30 e preco=null como defaults até a migration rodar
      return (fallbackData || []).map((s: { id: string; nome: string }) => ({
        id: s.id,
        nome: s.nome,
        duracao_minutos: 30,
        preco: null,
      }))
    }

    console.error('[getServicos] Erro:', error.message, '| details:', error.details, '| hint:', error.hint, '| code:', error.code)
    return []
  }

  // Garante que nenhum serviço terá duracao_minutos = null mesmo se o banco retornar null.
  // Isso evita que o JSX exiba "null min" em vez da duração real.
  return (data || []).map((s: { id: string; nome: string; duracao?: number | null; preco?: number | null }) => ({
    id: s.id,
    nome: s.nome,
    duracao_minutos: s.duracao ?? 30,
    preco: s.preco ?? null,
  }))
}

export async function getAppointments(date: string, barbershopId: string = BARBERSHOP_ID, barberId?: string): Promise<Appointment[]> {
  const supabase = createClient()
  // date é YYYY-MM-DD, referente ao dia em Brasília (UTC-3).
  // 00:00 Brasília = 03:00 UTC; 23:59 Brasília = 02:59 UTC no dia seguinte.
  const [year, month, day] = date.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0))
  const end = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59))

  let query = supabase
    .from('agendamentos')
    .select('*, servicos(id, nome, preco, duracao, duracao_minutos)')
    .eq('barbearia_id', barbershopId)
    .gte('data_hora', start.toISOString())
    .lte('data_hora', end.toISOString())
    .not('status', 'in', '("cancelado","faltou")')

  if (barberId) {
    query = query.eq('barbeiro_id', barberId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching appointments:', error)
    return []
  }

  return data as Appointment[]
}

/**
 * Gera a grade de horários disponíveis para o cliente.
 *
 * DOIS parâmetros de duração, com papéis distintos:
 *   - workingHours.slotDuration → intervalo da grade (de quanto em quanto tempo aparecem botões)
 *   - serviceDuration            → duração real do serviço escolhido
 *
 * Regra do "corte no fim do expediente":
 *   Um slot só fica 'livre' se (horário_início + serviceDuration) ≤ horário_fechamento.
 *   Slots próximos ao fechamento que não comportem o serviço ficam 'bloqueado'.
 *
 * Regra do almoço: slots que começam dentro do intervalo de almoço ficam 'bloqueado'.
 *
 * Regra das 2h: slots dentro de 2h do momento atual ficam 'bloqueado' (apenas no contexto cliente).
 */
export function generateAvailableSlots(
  date: string,             // YYYY-MM-DD
  workingHours: WorkingHours,
  appointments: Appointment[],
  serviceDuration: number = 30,    // duração do SERVIÇO escolhido (minutos)
  isClientContext: boolean = true
): TimeSlot[] {
  if (!workingHours || !workingHours.isWorking) {
    return []
  }

  const slots: TimeSlot[] = []

  // Grade padronizada em 30 min para o MVP.
  // serviceDuration (duração do serviço) permanece dinâmico para a regra de fechamento.
  const slotStep = 30

  // Parse dos horários de trabalho
  const [startHour, startMinute] = workingHours.startTime.split(':').map(Number)
  const [endHour, endMinute] = workingHours.endTime.split(':').map(Number)
  const [lunchStartHour, lunchStartMinute] = (workingHours.lunchStart || '12:00').split(':').map(Number)
  const [lunchEndHour, lunchEndMinute] = (workingHours.lunchEnd || '13:00').split(':').map(Number)

  const [year, month, day] = date.split('-').map(Number)
  const createDate = (h: number, m: number) => new Date(year, month - 1, day, h, m, 0, 0)

  let current = createDate(startHour, startMinute)
  const closingTime = createDate(endHour, endMinute)
  const lunchStart = createDate(lunchStartHour, lunchStartMinute)
  const lunchEnd = createDate(lunchEndHour, lunchEndMinute)

  // "Agora" em UTC para comparação com timestamp de Brasília
  const now = new Date()
  const twoHoursFromNow = now.getTime() + 2 * 60 * 60 * 1000

  // Converte um Date "local Brasília" para timestamp UTC real (adiciona +3h)
  const toUtcTimestamp = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 3, d.getMinutes())

  while (current < closingTime) {
    const timeString = current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    let status: 'livre' | 'ocupado' | 'bloqueado' = 'livre'

    // ── 1. Verifica se o slot está no intervalo de almoço ──────────────────
    if (current >= lunchStart && current < lunchEnd) {
      status = 'bloqueado'
    }

    // ── 2. Verifica se o SERVIÇO cabe antes do fechamento ─────────────────
    // Se o serviço termina depois do fechamento, o slot não deve estar disponível.
    // Usamos milissegundos para evitar ambiguidade.
    if (status === 'livre') {
      const serviceEndMs = current.getTime() + serviceDuration * 60 * 1000
      const closingMs = closingTime.getTime()
      if (serviceEndMs > closingMs) {
        status = 'bloqueado'
      }
    }

    // ── 3. Verifica overlap com agendamentos existentes ───────────────────
    if (status === 'livre') {
      const isOccupied = appointments.some(apt => {
        const apptStart = new Date(apt.data_hora).getTime()
        const apptDuration = apt.servicos?.duracao ?? apt.servicos?.duracao_minutos ?? 30
        const apptEnd = apptStart + (apptDuration * 60000)
        const slotStart = current.getTime()
        const slotEnd = slotStart + (30 * 60000)
        return (slotStart < apptEnd && slotEnd > apptStart)
      })
      if (isOccupied) {
        status = 'ocupado'
      }
    }

    // ── 4. Regra das 2 horas de antecedência (apenas para o cliente) ───────
    if (isClientContext && status === 'livre') {
      const slotUtcTimestamp = toUtcTimestamp(current)
      if (slotUtcTimestamp < twoHoursFromNow) {
        status = 'bloqueado'
      }
    }

    slots.push({ time: timeString, status })

    // Avança pelo intervalo da GRADE, não pela duração do serviço
    current.setMinutes(current.getMinutes() + slotStep)
  }

  return slots
}

// ─── Criação de agendamento ───────────────────────────────────────────────────

const PG_UNIQUE_VIOLATION = '23505'

export type CreateAppointmentResult =
  | { success: true }
  | { success: false; conflict: true; message: string }
  | { success: false; conflict: false; message: string }

export async function createAppointment(
  barbershopId: string,
  barberId: string,
  clientId: string | null,
  clientName: string,
  clientPhone: string,
  date: string,  // YYYY-MM-DD (dia em Brasília)
  time: string,  // HH:mm (horário em Brasília)
  serviceId: string | null = null
): Promise<CreateAppointmentResult> {
  const supabase = createClient()
  // Constrói o timestamp com offset explícito -03:00 para garantir interpretação
  // correta pelo PostgreSQL independente do fuso do servidor Node.js.
  // Ex: "2026-03-10T14:00:00-03:00" → salvo como "2026-03-10T17:00:00Z" no banco.
  const dataHoraComOffset = `${date}T${time}:00-03:00`

  const { error } = await supabase
    .from('agendamentos')
    .insert({
      barbearia_id: barbershopId,
      barbeiro_id: barberId,
      cliente_id: clientId || null,
      servico_id: serviceId || null,
      data_hora: dataHoraComOffset,
      cliente_nome: clientName,
      cliente_telefone: clientPhone,
      status: 'agendado',
      tipo: 'normal',
    })

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      console.warn('[createAppointment] Conflito de horário (23505):', dataHoraComOffset)
      return {
        success: false,
        conflict: true,
        message: 'Este horário acabou de ser reservado por outro cliente. Por favor, escolha outro horário.',
      }
    }
    console.error('[createAppointment] Erro inesperado:', error)
    return {
      success: false,
      conflict: false,
      message: 'Erro ao realizar o agendamento. Tente novamente.',
    }
  }

  // ─── Notificação WhatsApp (Fire-and-forget) ──────────────────────────────────
  // Não aguarda o envio para não travar a resposta da UI.
  // Busca telefone do barbeiro para notificar
  (async () => {
    try {
      // 1. Busca dados do barbeiro (telefone)
      const { data: barberData } = await supabase
        .from('barbeiros')
        .select('telefone, nome')
        .eq('id', barberId)
        .single()

      if (barberData?.telefone) {
        // 2. Monta mensagem
        const [ano, mes, dia] = date.split('-')
        const dataFormatada = `${dia}/${mes}/${ano}`
        const msg = `✂️ *Novo Agendamento*\n\n👤 Cliente: *${clientName}*\n📅 Data: *${dataFormatada}*\n⏰ Horário: *${time}*\n📱 Contato: ${clientPhone}`
        
        // 3. Envia
        console.log(`[Notification] Enviando para ${barberData.nome} (${barberData.telefone})...`)
        await sendWhatsAppNotification({
          phone: barberData.telefone,
          message: msg
        })
      } else {
        console.warn(`[Notification] Barbeiro ${barberId} sem telefone cadastrado.`)
      }
    } catch (err) {
      console.error('[Notification] Falha ao notificar barbeiro:', err)
    }
  })()

  return { success: true }
}

// ─── Cancelamento (usado pelo service — alternativo ao Server Action) ─────────

export async function cancelAppointment(appointmentId: string) {
  const supabase = createClient()
  const { data: appointment, error: fetchError } = await supabase
    .from('agendamentos')
    .select('data_hora')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    throw new Error('Agendamento não encontrado.')
  }

  const appointmentDate = new Date(appointment.data_hora)
  const now = new Date()
  const twoHoursFromNow = now.getTime() + 2 * 60 * 60 * 1000

  if (appointmentDate.getTime() < twoHoursFromNow) {
    throw new Error('Cancelamento permitido apenas com 2 horas de antecedência.')
  }

  const { error: updateError } = await supabase
    .from('agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', appointmentId)

  if (updateError) {
    throw updateError
  }

  // ─── Notificação WhatsApp (Cancelamento - Simplificado) ───────────────────────
  (async () => {
    try {
      // 1. Busca dados básicos do agendamento (incluindo ID do barbeiro)
      const { data: agendamento } = await supabase
        .from('agendamentos')
        .select('barbeiro_id, cliente_nome, data_hora')
        .eq('id', appointmentId)
        .single()

      if (!agendamento) return

      // 2. Busca telefone do barbeiro separadamente (igual ao createAppointment)
      const { data: barberData } = await supabase
        .from('barbeiros')
        .select('telefone, nome')
        .eq('id', agendamento.barbeiro_id)
        .single()

      if (barberData?.telefone) {
        // 3. Monta mensagem
        const dataObj = new Date(agendamento.data_hora)
        const dia = String(dataObj.getDate()).padStart(2, '0')
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0')
        const hora = String(dataObj.getHours()).padStart(2, '0')
        const min = String(dataObj.getMinutes()).padStart(2, '0')
        const nomeCliente = agendamento.cliente_nome || 'Cliente'

        const msg = `❌ *Agendamento Cancelado*\n\n👤 Cliente: *${nomeCliente}*\n📅 Data: *${dia}/${mes}*\n⏰ Horário: *${hora}:${min}*\n\nO horário está livre novamente.`
        
        console.log(`[CancelNotification] Enviando para ${barberData.nome} (${barberData.telefone})...`)
        await sendWhatsAppNotification({
          phone: barberData.telefone,
          message: msg
        })
      } else {
        console.warn(`[CancelNotification] Barbeiro ${agendamento.barbeiro_id} sem telefone.`)
      }
    } catch (err) {
      console.error('[CancelNotification] Falha ao notificar cancelamento:', err)
    }
  })()
}

export async function ensureClientExists(
  userId: string,
  name: string,
  phone: string,
  barbeariaId: string
): Promise<string | null> {
  const supabase = createClient()

  // 1. Tenta buscar existente
  const { data: existing } = await supabase
    .from('clientes')
    .select('id, nome, telefone')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // Se quiser atualizar dados, pode fazer aqui.
    // Ex: se o usuário trocou o nome no input, atualizamos no banco?
    // Por simplicidade, vamos manter o que está no banco ou atualizar se estiver vazio.
    return existing.id
  }

  // 2. Cria novo
  const { data: newClient, error } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      nome: name,
      telefone: phone,
      barbearia_id: barbeariaId
    })
    .select('id')
    .single()

  if (error) {
    console.error('[ensureClientExists] Erro ao criar cliente:', error)
    return null
  }

  return newClient.id
}
