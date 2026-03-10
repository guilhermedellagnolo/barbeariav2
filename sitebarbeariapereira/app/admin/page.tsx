"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Scissors,
  Calendar,
  Clock,
  UserX,
  Trash2,
  Plus,
  Lock,
  Check,
  Phone,
  Settings,
  Save,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { BARBERSHOP_ID } from "@/services/appointmentService"

// ─── Types ──────────────────────────────────────────────────────────────────

type SlotStatus = "free" | "booked" | "missed" | "blocked" | "encaixe"

interface TimeSlot {
  time: string
  status: SlotStatus
  clientName?: string
  clientPhone?: string
  agendamentoId?: string
}

interface WorkingHoursDB {
  id: string
  barbeiro_id: string
  dia_semana: number
  inicio: string
  fim: string
  inicio_almoco: string
  fim_almoco: string
  trabalha: boolean
  duracao_slot: number // em minutos, ex: 30
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getNextDays = () => {
  const days = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    days.push(date)
  }
  return days
}

const formatDayName = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")

const formatDayNumber = (date: Date) => date.getDate().toString()

const formatFullDate = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })

const formatDateForApi = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Gera lista de horários HH:mm de inicio a fim, pulando almoço, com duração em minutos */
function generateTimeSlots(
  inicio: string,
  fim: string,
  inicioAlmoco: string,
  fimAlmoco: string,
  duracaoMin: number
): string[] {
  const slots: string[] = []
  const [sh, sm] = inicio.split(":").map(Number)
  const [eh, em] = fim.split(":").map(Number)
  const [lsh, lsm] = inicioAlmoco.split(":").map(Number)
  const [leh, lem] = fimAlmoco.split(":").map(Number)

  let cur = sh * 60 + sm
  const end = eh * 60 + em
  const lunchStart = lsh * 60 + lsm
  const lunchEnd = leh * 60 + lem

  while (cur < end) {
    const h = Math.floor(cur / 60)
    const min = cur % 60
    const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
    // Pula horário de almoço
    if (cur < lunchStart || cur >= lunchEnd) {
      slots.push(timeStr)
    }
    cur += duracaoMin
  }
  return slots
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function AdminPage() {
  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [barberId, setBarberId] = useState<string | null>(null)
  const [workingHours, setWorkingHours] = useState<WorkingHoursDB | null>(null)

  // Settings panel
  const [showSettings, setShowSettings] = useState(false)
  const [settingsLoading, setSavingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    inicio: "08:00",
    fim: "19:00",
    inicio_almoco: "12:00",
    fim_almoco: "13:00",
    duracao_slot: 30,
    trabalha: true,
  })

  // Encaixe dialog
  const [encaixeDialog, setEncaixeDialog] = useState<{ open: boolean; time: string }>({ open: false, time: "" })
  const [encaixeForm, setEncaixeForm] = useState({ nome: "", telefone: "" })
  const [encaixeLoading, setEncaixeLoading] = useState(false)
  const [encaixeError, setEncaixeError] = useState<string | null>(null)

  // useMemo garante referências estáveis entre renders,
  // eliminando stale closures no useCallback de loadDayData.
  const days = useMemo(() => getNextDays(), [])
  const supabase = useMemo(() => createClient(), [])

  // ── Carrega barbeiro principal + Bug da Madrugada ──────────────────────────
  // Ao montar, verifica se o horário atual (BRT) já passou do fechamento de hoje.
  // Se sim, avança o dia selecionado para amanhã (index 1) para evitar que o admin
  // abra a barbearia "vazia" na madrugada, dando a impressão de que ainda é hoje.
  useEffect(() => {
    async function loadBarber() {
      const { data, error } = await supabase
        .from("barbeiros")
        .select("id")
        .eq("barbearia_id", BARBERSHOP_ID)
        .limit(1)
        .maybeSingle()

      if (error || !data) {
        console.error("[admin] Barbeiro não encontrado:", error)
        return
      }

      const barberId = data.id
      setBarberId(barberId)

      // ── Bug da Madrugada: auto-avança para amanhã se hoje já fechou ────────
      // Horário atual em BRT (UTC-3): basta subtrair 3h do UTC
      const nowUtc = new Date()
      const nowBrt = new Date(nowUtc.getTime() - 3 * 60 * 60 * 1000)
      const nowBrtMinutes = nowBrt.getUTCHours() * 60 + nowBrt.getUTCMinutes()
      const todayDayOfWeek = nowBrt.getUTCDay() // 0=dom…6=sab, em BRT

      const { data: todayWh } = await supabase
        .from("horarios_trabalho")
        .select("fim, trabalha")
        .eq("barbeiro_id", barberId)
        .eq("dia_semana", todayDayOfWeek)
        .maybeSingle()

      if (todayWh) {
        const [endH, endM] = todayWh.fim.split(":").map(Number)
        const closingMinutes = endH * 60 + endM
        // Se a barbearia não trabalha hoje OU já passou do horário de fechamento → amanhã
        if (!todayWh.trabalha || nowBrtMinutes >= closingMinutes) {
          setSelectedDay(1)
        }
      } else {
        // Sem registro para hoje → trata como dia de folga → avança para amanhã
        setSelectedDay(1)
      }
    }
    loadBarber()
  }, [])

  // ── Carrega agenda do dia selecionado ──────────────────────────────────────
  const loadDayData = useCallback(async () => {
    if (!barberId) return
    setLoadingSlots(true)

    const dateObj = days[selectedDay]
    const dateStr = formatDateForApi(dateObj)
    const dayOfWeek = dateObj.getDay()

    // 1. Busca horários de trabalho do banco (source of truth)
    const { data: wh, error: whError } = await supabase
      .from("horarios_trabalho")
      .select("*")
      .eq("barbeiro_id", barberId)
      .eq("dia_semana", dayOfWeek)
      .maybeSingle()

    if (whError) {
      console.error("[admin] Erro ao buscar horários:", whError)
      setLoadingSlots(false)
      return
    }

    // Usa dados do banco ou fallback padrão
    const whr: WorkingHoursDB = wh ?? {
      id: "",
      barbeiro_id: barberId,
      dia_semana: dayOfWeek,
      inicio: "08:00",
      fim: "19:00",
      inicio_almoco: "12:00",
      fim_almoco: "13:00",
      trabalha: dayOfWeek !== 0, // fecha domingo por padrão
      duracao_slot: 30,
    }

    setWorkingHours(whr)
    setSettingsForm({
      inicio: whr.inicio.slice(0, 5),
      fim: whr.fim.slice(0, 5),
      inicio_almoco: whr.inicio_almoco.slice(0, 5),
      fim_almoco: whr.fim_almoco.slice(0, 5),
      duracao_slot: whr.duracao_slot ?? 30,
      trabalha: whr.trabalha,
    })

    if (!whr.trabalha) {
      setSlots([])
      setLoadingSlots(false)
      return
    }

    // 2. Busca agendamentos do dia (UTC-3 range)
    const [year, month, day] = dateStr.split("-").map(Number)
    const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0))
    const end = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59))

    const { data: agendamentos, error: agError } = await supabase
      .from("agendamentos")
      .select("id, data_hora, status, cliente_nome, cliente_telefone, tipo")
      .eq("barbearia_id", BARBERSHOP_ID)
      .gte("data_hora", start.toISOString())
      .lte("data_hora", end.toISOString())
      .not("status", "in", '("cancelado")')

    if (agError) {
      console.error("[admin] Erro ao buscar agendamentos:", agError)
    }

    // 3. Gera grade de slots — intervalo fixo de 30 min (MVP)
    const timeStrings = generateTimeSlots(
      whr.inicio,
      whr.fim,
      whr.inicio_almoco,
      whr.fim_almoco,
      30
    )

    const builtSlots: TimeSlot[] = timeStrings.map((t) => {
      // Procura agendamento neste horário
      const ag = agendamentos?.find((a) => {
        const aptDate = new Date(a.data_hora)
        const aptTime = aptDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
        return aptTime === t
      })

      if (ag) {
        let status: SlotStatus = "booked"
        if (ag.status === "faltou") status = "missed"
        else if (ag.tipo === "encaixe") status = "encaixe"

        return {
          time: t,
          status,
          clientName: ag.cliente_nome,
          clientPhone: ag.cliente_telefone,
          agendamentoId: ag.id,
        }
      }

      return { time: t, status: "free" }
    })

    setSlots(builtSlots)
    setLoadingSlots(false)
  }, [barberId, selectedDay])

  useEffect(() => {
    loadDayData()
  }, [loadDayData])

  // ── Ações nos slots ────────────────────────────────────────────────────────

  async function updateAgendamentoStatus(agendamentoId: string, status: string) {
    const { error } = await supabase
      .from("agendamentos")
      .update({ status })
      .eq("id", agendamentoId)

    if (error) {
      console.error("[admin] Erro ao atualizar status:", error)
      alert("Erro ao atualizar. Tente novamente.")
      return false
    }
    return true
  }

  const handleMarkCompleted = async (slot: TimeSlot) => {
    if (!slot.agendamentoId) return
    const ok = await updateAgendamentoStatus(slot.agendamentoId, "concluido")
    if (ok) await loadDayData()
  }

  const handleMarkMissed = async (slot: TimeSlot) => {
    if (!slot.agendamentoId) return
    const ok = await updateAgendamentoStatus(slot.agendamentoId, "faltou")
    if (ok) await loadDayData()
  }

  const handleCancelBooking = async (slot: TimeSlot) => {
    if (!slot.agendamentoId) return
    const ok = await updateAgendamentoStatus(slot.agendamentoId, "cancelado")
    if (ok) await loadDayData()
  }

  const handleBlockSlot = async (time: string) => {
    if (!barberId) return
    const dateStr = formatDateForApi(days[selectedDay])
    const dataHora = `${dateStr}T${time}:00-03:00`

    const { error } = await supabase.from("agendamentos").insert({
      barbearia_id: BARBERSHOP_ID,
      barbeiro_id: barberId,
      data_hora: dataHora,
      status: "agendado",
      tipo: "normal",
      cliente_nome: "BLOQUEADO",
      cliente_telefone: "",
    })

    if (error) {
      console.error("[admin] Erro ao bloquear slot:", error)
      alert("Erro ao bloquear horário.")
      return
    }
    await loadDayData()
  }

  const handleUnblockSlot = async (slot: TimeSlot) => {
    if (!slot.agendamentoId) return
    const ok = await updateAgendamentoStatus(slot.agendamentoId, "cancelado")
    if (ok) await loadDayData()
  }

  // ── Encaixe ────────────────────────────────────────────────────────────────

  function openEncaixeDialog(time: string) {
    setEncaixeForm({ nome: "", telefone: "" })
    setEncaixeError(null)
    setEncaixeDialog({ open: true, time })
  }

  async function handleConfirmEncaixe() {
    if (!barberId || !encaixeForm.nome.trim()) return
    setEncaixeLoading(true)
    setEncaixeError(null)

    const dateStr = formatDateForApi(days[selectedDay])
    const dataHora = `${dateStr}T${encaixeDialog.time}:00-03:00`

    // Encaixe usa tipo='encaixe' — contorna o Partial Index de unicidade
    const { error } = await supabase.from("agendamentos").insert({
      barbearia_id: BARBERSHOP_ID,
      barbeiro_id: barberId,
      data_hora: dataHora,
      status: "agendado",
      tipo: "encaixe",
      cliente_nome: encaixeForm.nome.trim(),
      cliente_telefone: encaixeForm.telefone.trim(),
    })

    if (error) {
      console.error("[admin] Erro ao criar encaixe:", error)
      setEncaixeError("Erro ao criar encaixe. Tente novamente.")
      setEncaixeLoading(false)
      return
    }

    setEncaixeDialog({ open: false, time: "" })
    setEncaixeLoading(false)
    await loadDayData()
  }

  // ── Salvar configurações de horário ───────────────────────────────────────

  async function handleSaveSettings() {
    if (!barberId) return
    setSavingSettings(true)

    const dateObj = days[selectedDay]
    const dayOfWeek = dateObj.getDay()

    // Upsert horários de trabalho — atualiza ou cria se não existir
    const payload = {
      barbeiro_id: barberId,
      dia_semana: dayOfWeek,
      inicio: settingsForm.inicio,
      fim: settingsForm.fim,
      inicio_almoco: settingsForm.inicio_almoco,
      fim_almoco: settingsForm.fim_almoco,
      trabalha: settingsForm.trabalha,
      duracao_slot: Number(settingsForm.duracao_slot),
    }

    console.log('[handleSaveSettings] Payload UPSERT:', JSON.stringify(payload))

    // Tenta UPDATE primeiro (registro já existe).
    // Se nenhuma linha foi afetada (rowCount === 0), faz INSERT.
    // Evita depender de UNIQUE CONSTRAINT para o upsert funcionar corretamente.
    const { data: updated, error: updateError } = await supabase
      .from("horarios_trabalho")
      .update({
        inicio: payload.inicio,
        fim: payload.fim,
        inicio_almoco: payload.inicio_almoco,
        fim_almoco: payload.fim_almoco,
        trabalha: payload.trabalha,
        duracao_slot: payload.duracao_slot,
      })
      .eq("barbeiro_id", payload.barbeiro_id)
      .eq("dia_semana", payload.dia_semana)
      .select("id")

    if (updateError) {
      console.error("[admin] Erro no UPDATE:", updateError)
      alert(`Erro ao salvar: ${updateError.message}`)
      setSavingSettings(false)
      return
    }

    // Se UPDATE não encontrou nenhum registro, faz INSERT
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("horarios_trabalho")
        .insert(payload)

      if (insertError) {
        console.error("[admin] Erro no INSERT:", insertError)
        alert(`Erro ao salvar: ${insertError.message}`)
        setSavingSettings(false)
        return
      }
    }

    setSavingSettings(false)
    setShowSettings(false)
    // Recarrega a grade de slots com os novos horários.
    // IMPORTANTE: NÃO chama loadDayData() aqui porque ele sobrescreveria
    // o settingsForm com dados do banco — causando a "amnésia" se o banco
    // retornar os valores antigos antes da replicação concluir.
    // Em vez disso, atualiza workingHours localmente e regenera os slots.
    const newWhr = {
      id: workingHours?.id ?? "",
      barbeiro_id: barberId,
      dia_semana: dayOfWeek,
      inicio: payload.inicio,
      fim: payload.fim,
      inicio_almoco: payload.inicio_almoco,
      fim_almoco: payload.fim_almoco,
      trabalha: payload.trabalha,
      duracao_slot: payload.duracao_slot,
    }
    setWorkingHours(newWhr)
    if (newWhr.trabalha) {
      const timeStrings = generateTimeSlots(
        newWhr.inicio,
        newWhr.fim,
        newWhr.inicio_almoco,
        newWhr.fim_almoco,
        30
      )
      setSlots(timeStrings.map((t) => ({ time: t, status: "free" as const })))
    } else {
      setSlots([])
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="h-7 w-7 text-primary" />
            <div>
              <span className="text-lg font-bold text-foreground">Barbearia Pereira</span>
              <p className="text-xs text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadDayData()}
              title="Recarregar agenda"
              className="text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              title="Configurações de horário"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Days Carousel */}
        <Card className="mb-6 bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              Selecione o Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {days.map((date, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-lg border transition-all duration-200 ${
                    selectedDay === index
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xs uppercase font-medium opacity-80">
                    {formatDayName(date)}
                  </span>
                  <span className="text-2xl font-bold mt-1">
                    {formatDayNumber(date)}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-primary" />
              Agenda — {formatFullDate(days[selectedDay])}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workingHours && !workingHours.trabalha ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">Dia de folga configurado para este dia da semana.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowSettings(true)}
                >
                  Alterar configuração
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((slot) => (
                  <div
                    key={slot.time}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      slot.status === "missed"
                        ? "bg-orange-500/10 border-orange-500/30"
                        : slot.status === "booked"
                        ? "bg-primary/5 border-primary/30"
                        : slot.status === "encaixe"
                        ? "bg-purple-500/5 border-purple-500/30"
                        : slot.status === "blocked"
                        ? "bg-muted border-border opacity-60"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Time + Client Info */}
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-lg font-bold min-w-[60px] ${
                            slot.status === "missed"
                              ? "text-orange-500"
                              : slot.status === "blocked"
                              ? "text-muted-foreground"
                              : slot.status === "encaixe"
                              ? "text-purple-500"
                              : "text-foreground"
                          }`}
                        >
                          {slot.time}
                        </span>

                        {(slot.status === "booked" || slot.status === "encaixe") && slot.clientName !== "BLOQUEADO" && (
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-1.5">
                              {slot.clientName}
                              {slot.status === "encaixe" && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                                  Encaixe
                                </span>
                              )}
                            </p>
                            {slot.clientPhone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {slot.clientPhone}
                              </p>
                            )}
                          </div>
                        )}

                        {slot.status === "missed" && (
                          <div>
                            <p className="font-medium text-orange-500 line-through">{slot.clientName}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-500">
                              Faltou
                            </span>
                          </div>
                        )}

                        {slot.status === "blocked" && (
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Horário Bloqueado
                          </span>
                        )}

                        {slot.status === "free" && (
                          <span className="text-muted-foreground text-sm">Disponível</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {(slot.status === "booked" || slot.status === "encaixe") && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkCompleted(slot)}
                              className="h-9 w-9 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              title="Atendido"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkMissed(slot)}
                              className="h-9 w-9 p-0 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                              title="Não Veio (Falta)"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelBooking(slot)}
                              className="h-9 w-9 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Cancelar Agendamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {slot.status === "free" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEncaixeDialog(slot.time)}
                              className="h-9 w-9 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                              title="Encaixe"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleBlockSlot(slot.time)}
                              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Bloquear"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {slot.status === "blocked" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblockSlot(slot)}
                            className="text-xs border-border text-muted-foreground hover:text-foreground"
                          >
                            Desbloquear
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {slots.length === 0 && !loadingSlots && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum horário gerado. Verifique as configurações de horário.
                  </p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Legenda:</p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-card border border-border" />
                  <span className="text-muted-foreground">Disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
                  <span className="text-muted-foreground">Agendado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
                  <span className="text-muted-foreground">Encaixe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/30" />
                  <span className="text-muted-foreground">Faltou</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-muted border border-border" />
                  <span className="text-muted-foreground">Bloqueado</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="text-primary font-medium">T3 Software</span>
          </p>
        </div>
      </footer>

      {/* ── Dialog: Configurações de Horário ─────────────────────────────────── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configurações — {formatFullDate(days[selectedDay])}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trabalha"
                checked={settingsForm.trabalha}
                onChange={(e) => setSettingsForm((p) => ({ ...p, trabalha: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              <Label htmlFor="trabalha" className="cursor-pointer">
                Dia de trabalho (desmarcado = folga)
              </Label>
            </div>

            {settingsForm.trabalha && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Início</Label>
                    <Input
                      type="time"
                      value={settingsForm.inicio}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, inicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Fim</Label>
                    <Input
                      type="time"
                      value={settingsForm.fim}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, fim: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Início Almoço</Label>
                    <Input
                      type="time"
                      value={settingsForm.inicio_almoco}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, inicio_almoco: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Fim Almoço</Label>
                    <Input
                      type="time"
                      value={settingsForm.fim_almoco}
                      onChange={(e) => setSettingsForm((p) => ({ ...p, fim_almoco: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Duração do slot removida do MVP — grade padronizada em 30 min */}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)} disabled={settingsLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings} disabled={settingsLoading}>
              {settingsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Encaixe ──────────────────────────────────────────────────── */}
      <Dialog open={encaixeDialog.open} onOpenChange={(o) => setEncaixeDialog((p) => ({ ...p, open: o }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Encaixe — {encaixeDialog.time}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div>
              <Label className="text-sm mb-1 block">Nome do cliente *</Label>
              <Input
                placeholder="Nome completo"
                value={encaixeForm.nome}
                onChange={(e) => setEncaixeForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Telefone (opcional)</Label>
              <Input
                placeholder="(11) 9 9999-9999"
                value={encaixeForm.telefone}
                onChange={(e) => setEncaixeForm((p) => ({ ...p, telefone: e.target.value }))}
              />
            </div>
            {encaixeError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                {encaixeError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEncaixeDialog({ open: false, time: "" })}
              disabled={encaixeLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmEncaixe}
              disabled={!encaixeForm.nome.trim() || encaixeLoading}
            >
              {encaixeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Confirmar Encaixe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
