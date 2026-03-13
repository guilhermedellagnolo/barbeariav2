"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { getBarbeiroId } from "@/lib/session-store"
import {
  Radar,
  Calendar,
  Users,
  DollarSign,
  Settings,
  Plus,
  Lock,
  LockOpen,
  MessageCircle,
  Check,
  UserX,
  Trash2,
  Scissors,
  Search,
  Phone,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  List,
  Edit2,
  LogOut,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { 
  TabType, 
  SlotStatus, 
  ActionType, 
  Service, 
  TimeSlot, 
  Client, 
  CompletedCut, 
  BarberSettings 
} from "@/types"
import * as serviceService from "@/services/serviceService"
import * as clientService from "@/services/clientService"
import * as appointmentService from "@/services/appointmentService"

// Mock Data Initializers
const initialClients: Client[] = [
  { id: "1", name: "Carlos Silva", phone: "11999991111", cuts: 12, revenue: 450, noShows: 1 },
  { id: "2", name: "João Pedro", phone: "11999992222", cuts: 8, revenue: 320, noShows: 0 },
  { id: "3", name: "Marcos Oliveira", phone: "11999998888", cuts: 15, revenue: 600, noShows: 2 },
  { id: "4", name: "Rafael Santos", phone: "11977776666", cuts: 6, revenue: 180, noShows: 0 },
  { id: "5", name: "Lucas Mendes", phone: "11955554444", cuts: 20, revenue: 800, noShows: 1 },
  { id: "6", name: "André Costa", phone: "11933332222", cuts: 10, revenue: 400, noShows: 0 },
]

const initialCompletedCuts: CompletedCut[] = [
  { id: "1", clientName: "Carlos Silva", value: 50, time: "09:00", date: "hoje" },
  { id: "2", clientName: "João Pedro", value: 35, time: "09:30", date: "hoje" },
  { id: "3", clientName: "Felipe Souza", value: 50, time: "17:00", date: "ontem" },
  { id: "4", clientName: "Bruno Lima", value: 35, time: "16:30", date: "ontem" },
]

const initialServices: Service[] = [
  { id: "1", name: "Corte Masculino", price: 35, duration: 30, category: "corte" },
  { id: "2", name: "Barba", price: 25, duration: 30, category: "barba" },
  { id: "3", name: "Combo (Corte + Barba)", price: 50, duration: 45, category: "combo" },
  { id: "4", name: "Pezinho", price: 10, duration: 15, category: "corte" },
]

const navItems: { icon: typeof Radar; label: string; tab: TabType }[] = [
  { icon: Radar, label: "Radar", tab: "radar" },
  { icon: Calendar, label: "Agenda", tab: "agenda" },
  { icon: Users, label: "Clientes", tab: "clientes" },
  { icon: List, label: "Serviços", tab: "servicos" }, // New Tab
  { icon: DollarSign, label: "Finanças", tab: "financas" },
  { icon: Settings, label: "Ajustes", tab: "ajustes" },
]

// Utility function to generate slots with intelligent lunch blocking
const generateSlots = (openTime: string, closeTime: string, intervalMinutes: number, lunchStart: string, lunchEnd: string, hasLunch: boolean): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const [openHour, openMinute] = openTime.split(":").map(Number)
  const [closeHour, closeMinute] = closeTime.split(":").map(Number)
  const [lunchStartHour, lunchStartMinute] = lunchStart.split(":").map(Number)
  const [lunchEndHour, lunchEndMinute] = lunchEnd.split(":").map(Number)

  let current = new Date()
  current.setHours(openHour, openMinute, 0, 0)

  const end = new Date()
  end.setHours(closeHour, closeMinute, 0, 0)

  const lunchStartTime = new Date()
  lunchStartTime.setHours(lunchStartHour, lunchStartMinute, 0, 0)

  const lunchEndTime = new Date()
  lunchEndTime.setHours(lunchEndHour, lunchEndMinute, 0, 0)

  while (current < end) {
    const timeString = current.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    
    // Check for lunch time
    let status: SlotStatus = "livre"
    if (hasLunch) {
        const currentMinutes = current.getHours() * 60 + current.getMinutes()
        const lunchStartMinutes = lunchStartHour * 60 + lunchStartMinute
        const lunchEndMinutes = lunchEndHour * 60 + lunchEndMinute
        
        if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
            status = "bloqueado"
        }
    }

    slots.push({ time: timeString, status })
    current.setMinutes(current.getMinutes() + intervalMinutes)
  }

  return slots
}

export default function BarberApp() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  
  // Local State para dados do Barbeiro (Desacoplado do AuthContext)
  const [barbeiro, setBarbeiro] = useState<any | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Redirect to login if not authenticated with Safety Timeout
  useEffect(() => {
    // 1. Se NÃO estiver carregando E NÃO tiver usuário, manda pro login
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    // 2. Safety Timeout: Se travar no loading por 5s, força recarregamento da página (não logout)
    const safetyTimeout = setTimeout(() => {
        if (authLoading) {
            console.warn("Auth loading timed out. Reloading page...")
            window.location.reload()
        }
    }, 5000)

    return () => clearTimeout(safetyTimeout)
  }, [authLoading, user, router])

  // Fetch Barber Profile when User is Ready
  useEffect(() => {
    if (!user) return

    async function loadBarberProfile() {
        setLoadingProfile(true)
        setProfileError(null)
        try {
            const { data, error } = await supabase
                .from("barbeiros")
                .select("id, barbearia_id, nome")
                .eq("usuario_id", user!.id)
                .eq("ativo", true)
                .maybeSingle()

            if (error) throw error
            
            if (data) {
                setBarbeiro(data)
                // Set global session helpers if needed, but prefer local usage
                // setSessionIds(data.barbearia_id, data.id, data.nome)
            } else {
                setProfileError("Barbeiro não encontrado ou inativo.")
            }
        } catch (err: any) {
            console.error("Error loading profile:", err)
            setProfileError("Erro ao carregar perfil. Verifique sua conexão.")
        } finally {
            setLoadingProfile(false)
        }
    }

    loadBarberProfile()
  }, [user])

  // Realtime Updates (Notificações)
  useEffect(() => {
    if (!barbeiro) return

    // Usa a instância singleton do Supabase (evita múltiplos WebSockets)
    const channel = supabase
      .channel('realtime-appointments')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'agendamentos',
          filter: `barbeiro_id=eq.${barbeiro.id}`,
        },
        (payload) => {
          console.log('Realtime update:', payload)
          
          // Atualiza a lista imediatamente
          fetchAppointments()
          
          if (payload.eventType === 'INSERT') {
             // Feedback visual sutil (toast nativo ou custom)
             console.log("Novo agendamento recebido!")
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [barbeiro])

  // Settings State
  const [activeTab, setActiveTab] = useState<TabType>("radar")

  // Settings State
  const [settings, setSettings] = useState<BarberSettings>({
    openTime: "08:00",
    closeTime: "19:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    slotDuration: "30",
    hasLunch: true,
  })

  // Global Data States
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [completedCuts, setCompletedCuts] = useState<CompletedCut[]>([])
  const [financeMetrics, setFinanceMetrics] = useState({ weekTotal: 0, monthTotal: 0 })
  
  useEffect(() => {
    if (!barbeiro) return
    fetchServices()
    fetchClients()
    fetchFinanceHistory()
  }, [barbeiro])

  const fetchFinanceHistory = async () => {
    try {
      const data = await appointmentService.fetchFinanceHistory()
      setCompletedCuts(data)
      
      const metrics = await appointmentService.fetchFinanceMetrics()
      setFinanceMetrics(metrics)
    } catch (error) {
      console.error("Erro ao carregar histórico financeiro:", error)
    }
  }

  const fetchServices = async () => {
    try {
      const data = await serviceService.fetchServices()
      setServices(data)
    } catch (error) {
      console.error("Erro ao carregar serviços:", error)
    }
  }

  const fetchClients = async () => {
    try {
      const data = await clientService.fetchClients()
      setClients(data)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    }
  }
  
  // Phase 2: Independent Days State
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TimeSlot[]>>({})

  // Modal states
  const [isEncaixeModalOpen, setIsEncaixeModalOpen] = useState(false)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
  const [newClientName, setNewClientName] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)

  // Alert dialog states
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertAction, setAlertAction] = useState<ActionType | null>(null)
  const [alertSlotTime, setAlertSlotTime] = useState<string | null>(null)

  // Agenda states
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [clientSearch, setClientSearch] = useState("")

  // Global Loading State
  const [isLoading, setIsLoading] = useState(false)

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceFormData, setServiceFormData] = useState<Partial<Service>>({
    name: "",
    price: 0,
    duration: 30,
    category: "corte"
  })

  const dateKey = selectedDate.toLocaleDateString("pt-BR")
  
  // Define qual data usar para renderizar a lista de slots
  // Se estiver no Radar, usa HOJE. Se estiver na Agenda, usa a data selecionada.
  const renderDateKey = activeTab === 'radar' 
    ? new Date().toLocaleDateString("pt-BR") 
    : dateKey

  const currentSlots = slotsByDate[renderDateKey] || []

  // Helper to get the correct date based on active tab
  const getTargetDate = () => {
      if (activeTab === 'radar') {
          return new Date()
      }
      return selectedDate
  }

  // Ensure slots exist for the selected date
  useEffect(() => {
    if (!barbeiro) return
    fetchAppointments()
  }, [renderDateKey, barbeiro, activeTab]) // Depende da data de renderização correta

  const fetchAppointments = async () => {
    try {
      const targetDate = getTargetDate()
      
      // CRITICAL FIX: Use local date construction to prevent UTC timezone shifts
      const dateStr = targetDate.getFullYear() + '-' + 
          String(targetDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(targetDate.getDate()).padStart(2, '0');

      const data = await appointmentService.fetchAppointments(dateStr)
      
      // Phase 4: Dynamic Slots Engine
      // 1. Get Barber ID directly from state
      const barberId = barbeiro?.id

      if (!barberId) {
          // Usa a data correta para a chave do estado
          const key = targetDate.toLocaleDateString("pt-BR")
          setSlotsByDate(prev => ({ ...prev, [key]: [] }))
          return
      }

      // 2. Get Working Hours for the selected day
      const dayOfWeek = targetDate.getDay() // 0 = Sunday
      const workingHours = await appointmentService.fetchBarberWorkingHours(barberId, dayOfWeek)

      // Hidrata o formulário de Ajustes com os valores do banco.
      if (workingHours) {
        setSettings(prev => ({
          ...prev,
          openTime: workingHours.startTime.slice(0, 5),
          closeTime: workingHours.endTime.slice(0, 5),
          lunchStart: (workingHours.lunchStart || "12:00").slice(0, 5),
          lunchEnd: (workingHours.lunchEnd || "13:00").slice(0, 5),
        }))
      }

      // 3. Generate Slots using the Engine
      const slots = appointmentService.generateAvailableSlots(
          dateStr, // YYYY-MM-DD (Local)
          workingHours,
          data || [],
          30, // grade padronizada em 30 min (MVP)
          false // isClientContext = false (Barber View)
      )
      
      const key = targetDate.toLocaleDateString("pt-BR")
      setSlotsByDate(prev => ({ ...prev, [key]: slots }))

    } catch (error) {
        console.error("Erro ao carregar agendamentos:", error)
    }
  }

  const isDayOff = currentSlots.length === 0 && !isLoading

  const todayStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  // Calculations based on current day's slots (usado na aba Radar)
  const totalPrevisto = currentSlots
    .filter((s) => s.status === "ocupado" || s.status === "concluido")
    .reduce((acc, curr) => acc + (curr.price || 0), 0)

  const totalConcluido = currentSlots
    .filter((s) => s.status === "concluido")
    .reduce((acc, curr) => acc + (curr.price || 0), 0)

  // ── Finanças: usa data_hora real do agendamento (via completedCuts) ─────────
  // todayKey está fixo em "hoje" independente do dia selecionado na aba Radar.
  // completedCuts.date é gerado por fetchFinanceHistory com base em data_hora,
  // portanto agrupa corretamente pelo dia DO SERVIÇO, não pelo dia em que o
  // barbeiro clicou em "Concluir".
  const todayDateKey = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  const totalHoje = completedCuts
    .filter((c) => c.date === todayDateKey)
    .reduce((acc, c) => acc + (c.value || 0), 0)

  // Action handlers with confirmation
  const openConfirmation = (action: ActionType, time?: string) => {
    setAlertAction(action)
    setAlertSlotTime(time || null)
    setAlertOpen(true)
  }

  // Async Action Handlers
  const handleConcluir = async (slotIndex: number, slot: TimeSlot) => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    try {
        const slotTime = slot.time
        
        // 1. Update Appointment Status in Supabase
        await appointmentService.updateAppointmentStatus(slot.id!, 'concluido')

        // 2. Optimistic UI Updates
        const updatedSlots = [...currentSlots]
        updatedSlots[slotIndex].status = "concluido"
        
        // Update Client Metrics
        if (slot.clientName) {
            const clientIndex = clients.findIndex(c => c.name === slot.clientName || (slot.clientPhone && c.phone === slot.clientPhone))
            const revenueToAdd = slot.price || 0
            
            if (clientIndex >= 0) {
                const client = clients[clientIndex]
                const updatedClients = [...clients]
                updatedClients[clientIndex] = {
                    ...client,
                    cuts: client.cuts + 1,
                    revenue: client.revenue + revenueToAdd
                }
                setClients(updatedClients)

                // 3. Persist Client Metrics in Supabase
                await clientService.updateClientMetrics(client.id, client.cuts + 1, client.revenue + revenueToAdd, client.noShows)
            }
            
            // Add to Finance History
            // Usa o mesmo formato "DD/MM" do fetchFinanceHistory para que
            // o filtro de totalHoje (baseado em data_hora real) funcione corretamente.
            const newCut: CompletedCut = {
                id: Math.random().toString(36).substr(2, 9),
                clientName: slot.clientName,
                value: revenueToAdd,
                time: slot.time,
                date: targetDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
            }
            setCompletedCuts([newCut, ...completedCuts])
        }
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })

        // 4. Update Real Finance Metrics (Semana/Mes)
        // Isso garante que os cards de financas sejam atualizados sem reload
        const newMetrics = await appointmentService.fetchFinanceMetrics()
        setFinanceMetrics(newMetrics)

    } catch (error) {
        console.error("Erro ao concluir agendamento:", error)
        alert("Erro ao concluir agendamento.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleFaltou = async (slotIndex: number, slot: TimeSlot) => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    try {
        const slotTime = slot.time

        // 1. Update Appointment Status in Supabase
        await appointmentService.updateAppointmentStatus(slot.id!, 'faltou')

        // 2. Optimistic UI Updates
        const updatedSlots = [...currentSlots]
        updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], status: "faltou" }
        
        // Update No-Show Metrics
        if (slot.clientName) {
            const clientIndex = clients.findIndex(c => c.name === slot.clientName || (slot.clientPhone && c.phone === slot.clientPhone))
            if (clientIndex >= 0) {
                const client = clients[clientIndex]
                const updatedClients = [...clients]
                updatedClients[clientIndex] = {
                    ...client,
                    noShows: client.noShows + 1
                }
                setClients(updatedClients)

                // 3. Persist Client Metrics in Supabase
                await clientService.updateClientMetrics(client.id, client.cuts, client.revenue, client.noShows + 1)
            }
        }
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })
    } catch (error) {
        console.error("Erro ao registrar falta:", error)
        alert("Erro ao registrar falta.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleCancelar = async (slotIndex: number) => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    try {
        const slot = currentSlots[slotIndex]
        const slotTime = slot.time

        // 1. Cancel Appointment in Supabase
        await appointmentService.updateAppointmentStatus(slot.id!, 'cancelado')

        // 2. Optimistic UI Updates
        const updatedSlots = [...currentSlots]
        updatedSlots[slotIndex] = {
            ...updatedSlots[slotIndex],
            status: "livre",
            clientName: undefined,
            clientPhone: undefined,
            service: undefined,
            serviceId: undefined,
            price: undefined
        }
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })
    } catch (error) {
        console.error("Erro ao cancelar agendamento:", error)
        alert("Erro ao cancelar agendamento.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleBloquear = async (slotIndex: number) => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    const previousSlots = [...currentSlots]
    try {
        // 1. Atualização otimista da UI
        const updatedSlots = [...currentSlots]
        updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], status: "bloqueado" }
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })

        // 2. Persistir no Supabase
        const barberId = barbeiro?.id
        const newId = await appointmentService.blockSlot(targetDate, currentSlots[slotIndex].time, barberId)

        // 3. Atualiza o ID do slot para permitir desbloqueio posterior
        updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], id: newId }
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })
    } catch (error) {
        console.error("Erro ao bloquear horário:", error)
        // Reverte o estado local em caso de falha
        setSlotsByDate({ ...slotsByDate, [key]: previousSlots })
        alert("Erro ao bloquear horário. Tente novamente.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleDesbloquear = async (slotIndex: number) => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    const previousSlots = [...currentSlots]
    try {
        const slot = currentSlots[slotIndex]

        // Só remove do banco se o bloqueio tiver um ID (foi persistido).
        // Bloqueios de almoço são gerados pela engine e não possuem ID.
        if (slot.id) {
            await appointmentService.unblockSlot(slot.id)
        }

        // Atualiza a UI após sucesso
        const updatedSlots = [...currentSlots]
        updatedSlots[slotIndex] = { ...updatedSlots[slotIndex], status: "livre", id: undefined }
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })
    } catch (error) {
        console.error("Erro ao desbloquear horário:", error)
        setSlotsByDate({ ...slotsByDate, [key]: previousSlots })
        alert("Erro ao desbloquear horário. Tente novamente.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleBloquearDia = async () => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    const previousSlots = [...currentSlots]
    try {
        // 1. Identifica todos os slots livres para bloquear
        const slotsToBlock = currentSlots
            .filter(slot => slot.status === "livre")
            .map(slot => slot.time)

        if (slotsToBlock.length === 0) return

        // 2. Atualização otimista da UI
        const updatedSlots = currentSlots.map(slot =>
            slot.status === "livre" ? { ...slot, status: "bloqueado" as const } : { ...slot }
        )
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })

        // 3. Persistir no Supabase (batch insert)
        const barberId = getBarbeiroId()
        const results = await appointmentService.blockMultipleSlots(targetDate, slotsToBlock, barberId)

        // 4. Atualiza IDs retornados no estado local
        const finalSlots = updatedSlots.map(slot => {
            const match = results.find(r => r.time === slot.time)
            return match ? { ...slot, id: match.id } : slot
        })
        setSlotsByDate({ ...slotsByDate, [key]: finalSlots })
    } catch (error) {
        console.error("Erro ao bloquear dia:", error)
        setSlotsByDate({ ...slotsByDate, [key]: previousSlots })
        alert("Erro ao bloquear dia inteiro. Tente novamente.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleDesbloquearDia = async () => {
    setIsLoading(true)
    const targetDate = getTargetDate()
    const key = targetDate.toLocaleDateString("pt-BR")
    const previousSlots = [...currentSlots]
    try {
        // 1. Coleta IDs dos slots bloqueados manualmente (que possuem ID no banco).
        //    Bloqueios de almoço (gerados pela engine, sem ID) são ignorados —
        //    a engine os recriará automaticamente no próximo fetch.
        const idsToUnblock = currentSlots
            .filter(slot => slot.status === "bloqueado" && slot.id)
            .map(slot => slot.id!)

        // 2. Atualização otimista da UI — libera apenas os que possuem ID
        const updatedSlots = currentSlots.map(slot =>
            slot.status === "bloqueado" && slot.id
                ? { ...slot, status: "livre" as const, id: undefined }
                : { ...slot }
        )
        setSlotsByDate({ ...slotsByDate, [key]: updatedSlots })

        // 3. Persistir no Supabase (batch delete)
        if (idsToUnblock.length > 0) {
            await appointmentService.unblockMultipleSlots(idsToUnblock)
        }
    } catch (error) {
        console.error("Erro ao desbloquear dia:", error)
        setSlotsByDate({ ...slotsByDate, [key]: previousSlots })
        alert("Erro ao desbloquear dia inteiro. Tente novamente.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    if (alertAction === null) return

    const slotIndex = alertSlotTime 
      ? currentSlots.findIndex(s => s.time === alertSlotTime) 
      : -1

    if ((alertAction !== "bloquearDia" && alertAction !== "desbloquearDia") && slotIndex === -1) return

    const slot = currentSlots[slotIndex]

    switch (alertAction) {
      case "concluir":
        await handleConcluir(slotIndex, slot)
        break
      case "faltou":
        await handleFaltou(slotIndex, slot)
        break
      case "cancelar":
        await handleCancelar(slotIndex)
        break
      case "bloquear":
        await handleBloquear(slotIndex)
        break
      case "desbloquear":
        await handleDesbloquear(slotIndex)
        break
      case "bloquearDia":
        await handleBloquearDia()
        break
      case "desbloquearDia":
        await handleDesbloquearDia()
        break
    }

    setAlertOpen(false)
    setAlertAction(null)
    setAlertSlotTime(null)
  }

  const getAlertMessage = () => {
    switch (alertAction) {
      case "concluir": return "Tem a certeza que deseja concluir este horário?"
      case "faltou": return "Tem a certeza que deseja marcar como falta?"
      case "cancelar": return "Tem a certeza que deseja cancelar este agendamento? O horário voltará a ficar livre."
      case "bloquear": return "Tem a certeza que deseja bloquear este horário?"
      case "desbloquear": return "Tem a certeza que deseja desbloquear este horário?"
      case "bloquearDia": return "Tem a certeza que deseja bloquear todos os horários livres do dia?"
      case "desbloquearDia": return "Tem a certeza que deseja libertar todos os horários bloqueados do dia?"
      default: return ""
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "")
    
    // Limita a 11 dígitos (DDD + 9 dígitos)
    const limit = numbers.slice(0, 11)

    // Aplica a máscara (XX) XXXXX-XXXX
    if (limit.length <= 2) return limit
    if (limit.length <= 7) return `(${limit.slice(0, 2)}) ${limit.slice(2)}`
    return `(${limit.slice(0, 2)}) ${limit.slice(2, 7)}-${limit.slice(7)}`
  }

  const handleEncaixe = (index: number) => {
    setSelectedSlotIndex(index)
    setNewClientName("")
    setNewClientPhone("")
    setSelectedServiceId("")
    setIsEncaixeModalOpen(true)
  }

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewClientName(value)
    setShowClientSuggestions(value.length > 0)
  }

  const selectClientSuggestion = (client: Client) => {
    setNewClientName(client.name)
    setNewClientPhone(formatPhoneNumber(client.phone))
    setShowClientSuggestions(false)
  }

  const handleSaveEncaixe = async () => {
    if (selectedSlotIndex !== null && newClientName.trim() && selectedServiceId) {
      setIsLoading(true)
      try {
          // 1. Get or Create Client
          let clientId = null
          const cleanNewPhone = newClientPhone.replace(/\D/g, "")
          
          const existingClient = clients.find(c => {
            const cleanClientPhone = c.phone.replace(/\D/g, "")
            return (cleanNewPhone && cleanClientPhone === cleanNewPhone) || c.name.toLowerCase() === newClientName.toLowerCase()
          })

          if (existingClient) {
              clientId = existingClient.id
          } else {
              const newClient = await clientService.upsertClient(newClientName, newClientPhone)
              if (newClient) {
                  clientId = newClient.id
                  // Optimistic update
                  setClients([...clients, newClient])
              }
          }

          // 2. Create Appointment
          if (clientId) {
              const slotTime = currentSlots[selectedSlotIndex].time
              const targetDate = getTargetDate() // USA A DATA DA ABA ATIVA (RADAR=HOJE, AGENDA=SELECIONADA)
              
              const { id: newAppointmentId } = await appointmentService.createAppointment(
                  clientId,
                  selectedServiceId,
                  targetDate,
                  slotTime,
                  newClientName,
                  newClientPhone
              )

              // 3. Force Refresh (Recarrega slots para calcular ocupação correta e evitar duplicidade visual)
              await fetchAppointments()
              setIsEncaixeModalOpen(false)
          }

      } catch (error: any) {
          console.error("Erro ao salvar encaixe:", error)
          alert(error.message || "Erro ao salvar agendamento.")
      } finally {
          setIsLoading(false)
      }
    }
  }

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      window.open(`https://wa.me/55${phone.replace(/\D/g, "")}`, "_blank")
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
        const barberId = barbeiro?.id

        // Apply settings to Monday (1) through Saturday (6)
        const days = [1, 2, 3, 4, 5, 6]
        const updatePromises = days.map(day => 
            appointmentService.updateBarberWorkingHours(
                barberId,
                day,
                settings.openTime,
                settings.closeTime,
                settings.lunchStart,
                settings.lunchEnd,
                true // isWorking
            )
        )

        // Set Sunday (0) as day off
        updatePromises.push(
            appointmentService.updateBarberWorkingHours(
                barberId,
                0,
                settings.openTime,
                settings.closeTime,
                settings.lunchStart,
                settings.lunchEnd,
                false // isWorking = false
            )
        )

        await Promise.all(updatePromises)

        // Force regeneration
        setSlotsByDate({}) 
        await fetchAppointments()
        
        alert("Configurações guardadas! A agenda foi atualizada.")
    } catch (error) {
        console.error("Erro ao salvar configurações:", error)
        alert("Erro ao salvar configurações.")
    } finally {
        setIsLoading(false)
    }
  }

  // Service Handlers
  const openServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setServiceFormData(service)
    } else {
      setEditingService(null)
      setServiceFormData({ name: "", price: 0, duration: 30, category: "corte" })
    }
    setIsServiceModalOpen(true)
  }

  const handleSaveService = async () => {
    if (!serviceFormData.name || !serviceFormData.price) return

    setIsLoading(true)
    try {
        const payload = {
            name: serviceFormData.name!,
            price: Number(serviceFormData.price),
            duration: Number(serviceFormData.duration),
            category: serviceFormData.category || 'corte'
        }

        if (editingService) {
            await serviceService.updateService(editingService.id, payload)
        } else {
            await serviceService.createService(payload)
        }
        
        await fetchServices() // Reload list
        setIsServiceModalOpen(false)
    } catch (error) {
        console.error("Erro ao salvar serviço:", error)
        alert("Erro ao salvar serviço. Verifique o console.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleDeleteService = async (id: string) => {
    if (window.confirm("Tem a certeza que deseja excluir este serviço?")) {
        setIsLoading(true)
        try {
            await serviceService.deleteService(id)
            await fetchServices() // Reload list
        } catch (error) {
            console.error("Erro ao excluir serviço:", error)
            alert("Erro ao excluir serviço. Verifique o console.")
        } finally {
            setIsLoading(false)
        }
    }
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (number | null)[] = []

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i)
    }

    return days
  }

  const changeMonth = (delta: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1))
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.phone.includes(clientSearch)
  )
  
  // Suggestions logic
  const clientSuggestions = clients.filter(
    (client) => 
      newClientName && 
      client.name.toLowerCase().includes(newClientName.toLowerCase())
  ).slice(0, 3)

  const blockedSlotsCount = currentSlots.filter(s => s.status === "bloqueado").length
  const totalSlots = currentSlots.length
  const isMajorityBlocked = totalSlots > 0 && blockedSlotsCount > (totalSlots / 3)

  const renderContent = () => {
    switch (activeTab) {
      case "radar":
        const radarDate = new Date().toLocaleDateString("pt-BR")
        return (
          <main className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Agenda do Dia ({radarDate})
              </h2>
              <span className="text-xs text-muted-foreground">
                {currentSlots.filter((s) => s.status === "ocupado").length} agendamentos
              </span>
            </div>
            
            {isDayOff ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Calendar className="h-10 w-10 mb-2 opacity-20" />
                    <p>{!currentSlots.length && isLoading ? "Carregando agenda..." : "Dia de folga ou não configurado."}</p>
                    <p className="text-xs">{!currentSlots.length && isLoading ? "" : "Não há horários disponíveis para hoje."}</p>
                </div>
            ) : (
                <div className="space-y-2">
                  {currentSlots.map((slot, index) => (
                    <SlotCard
                      key={slot.time}
                      slot={slot}
                      onEncaixe={() => handleEncaixe(index)}
                      onBloquear={() => openConfirmation("bloquear", slot.time)}
                      onDesbloquear={() => openConfirmation("desbloquear", slot.time)}
                      onConcluir={() => openConfirmation("concluir", slot.time)}
                      onFaltou={() => openConfirmation("faltou", slot.time)}
                      onCancelar={() => openConfirmation("cancelar", slot.time)}
                      onWhatsApp={() => handleWhatsApp(slot.clientPhone)}
                    />
                  ))}
                </div>
            )}
          </main>
        )

      case "agenda":
        return (
          <main className="p-4">
            {/* Mini Calendar */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-sm">
                    {selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
                    <div key={i} className="font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                  {getDaysInMonth(selectedDate).map((day, i) => (
                    <button
                      key={i}
                      onClick={() => day && setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                      className={`py-1.5 rounded-md text-sm transition-colors ${
                        day === selectedDate.getDate()
                          ? "bg-primary text-primary-foreground font-bold"
                          : day
                          ? "hover:bg-muted"
                          : ""
                      }`}
                      disabled={!day}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Smart Block Button */}
            {isMajorityBlocked ? (
              <Button
                className="w-full mb-4 gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                variant="outline"
                onClick={() => openConfirmation("desbloquearDia")}
              >
                <LockOpen className="h-4 w-4" />
                Desbloquear Dia Inteiro
              </Button>
            ) : (
              <Button
                className="w-full mb-4 gap-2"
                variant="outline"
                onClick={() => openConfirmation("bloquearDia")}
              >
                <Lock className="h-4 w-4" />
                Bloquear Dia Inteiro
              </Button>
            )}

            {/* Slots List */}
            <div className="space-y-2">
              {currentSlots.map((slot, index) => {
                 // DEDUPLICATION LOGIC:
                 // Se o slot atual tem o mesmo ID do anterior, significa que é continuação de um serviço longo.
                 // Neste caso, não renderizamos este slot (o anterior já ocupa o espaço visualmente se fizéssemos um card maior, 
                 // mas como o pedido é "mostrar o próximo horário livre", apenas ocultar já resolve a duplicidade visual).
                 const prevSlot = index > 0 ? currentSlots[index - 1] : null
                 if (slot.id && prevSlot?.id === slot.id && slot.status !== 'livre') {
                     return null
                 }

                 return (
                    <SlotCard
                      key={slot.time}
                      slot={slot}
                      onEncaixe={() => handleEncaixe(index)}
                      onBloquear={() => openConfirmation("bloquear", slot.time)}
                      onDesbloquear={() => openConfirmation("desbloquear", slot.time)}
                      onConcluir={() => openConfirmation("concluir", slot.time)}
                      onFaltou={() => openConfirmation("faltou", slot.time)}
                      onCancelar={() => openConfirmation("cancelar", slot.time)}
                      onWhatsApp={() => handleWhatsApp(slot.clientPhone)}
                    />
                 )
              })}
            </div>
          </main>
        )

      case "clientes":
        return (
          <main className="p-4">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nome ou WhatsApp"
                className="pl-10"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>

            {/* Client List */}
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <Card key={client.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{client.name}</h3>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Phone className="h-3.5 w-3.5" />
                          {client.phone}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-emerald-600 hover:bg-emerald-100"
                        onClick={() => handleWhatsApp(client.phone)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                        <Scissors className="h-3 w-3" />
                        Cortes: {client.cuts}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <DollarSign className="h-3 w-3" />
                        Receita: R$ {client.revenue}
                      </span>
                      {client.noShows > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                          <UserX className="h-3 w-3" />
                          Faltas: {client.noShows}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        )
      
      // Gap 1: Aba Serviços
      case "servicos":
        return (
            <main className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Catálogo de Serviços
                    </h2>
                    <Button size="sm" className="gap-1" onClick={() => openServiceModal()}>
                        <Plus className="h-4 w-4" />
                        Novo
                    </Button>
                </div>
                <div className="space-y-3">
                    {services.map(service => (
                        <Card key={service.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {service.duration} min
                                        </span>
                                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 capitalize">
                                            {service.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-emerald-600 mr-2">
                                        R$ {service.price.toFixed(2).replace('.', ',')}
                                    </span>
                                    <Button variant="ghost" size="icon" onClick={() => openServiceModal(service)}>
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteService(service.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        )

      case "financas":
        return (
          <main className="p-4">
            {/* Today's Revenue — baseado em data_hora do agendamento, não no dia selecionado na agenda */}
            <Card className="mb-4 bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">
                  Receita de Hoje ({todayDateKey})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-700">
                  R$ {totalHoje.toFixed(2).replace(".", ",")}
                </p>
              </CardContent>
            </Card>

            {/* Weekly and Monthly Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Esta Semana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-foreground">
                    R$ {financeMetrics.weekTotal.toFixed(2).replace('.', ',')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Este Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-foreground">
                    R$ {financeMetrics.monthTotal.toFixed(2).replace('.', ',')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Completed Cuts */}
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Últimos Cortes Concluídos
            </h2>
            <div className="space-y-2">
              {completedCuts.map((cut) => (
                <Card key={cut.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{cut.clientName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {cut.time} - {cut.date}
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      R$ {cut.value.toFixed(2).replace(".", ",")}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        )

      case "ajustes":
        return (
          <main className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Configurações da Jornada
            </h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openTime">Hora de Abertura</Label>
                    <Input
                      id="openTime"
                      type="time"
                      value={settings.openTime}
                      onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closeTime">Hora de Fecho</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={settings.closeTime}
                      onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Gap 4: Toggle Almoço */}
                <div className="flex items-center justify-between py-2">
                    <Label htmlFor="hasLunch" className="text-base">Habilitar Horário de Almoço</Label>
                    <Switch 
                        id="hasLunch" 
                        checked={settings.hasLunch}
                        onCheckedChange={(checked) => setSettings({ ...settings, hasLunch: checked })}
                    />
                </div>

                {settings.hasLunch && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <Label htmlFor="lunchStart">Início do Almoço</Label>
                        <Input
                        id="lunchStart"
                        type="time"
                        value={settings.lunchStart}
                        onChange={(e) => setSettings({ ...settings, lunchStart: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lunchEnd">Fim do Almoço</Label>
                        <Input
                        id="lunchEnd"
                        type="time"
                        value={settings.lunchEnd}
                        onChange={(e) => setSettings({ ...settings, lunchEnd: e.target.value })}
                        />
                    </div>
                    </div>
                )}


                <Button className="w-full mt-4" size="lg" onClick={handleSaveSettings} disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Guardar Configurações"}
                </Button>
              </CardContent>
            </Card>
          </main>
        )
    }
  }

  // ─── Auth Guards ─────────────────────────────────────────────────────────
  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">{authLoading ? "Autenticando..." : "Carregando perfil..."}</p>
        </div>
      </div>
    )
  }

  if (!user) return null // Will redirect via useEffect

  if (!barbeiro || profileError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-sm mb-4">{profileError || "Erro desconhecido ao carregar perfil."}</p>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm hover:bg-zinc-700 transition-colors"
          >
            Sair e Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{barbeiro.nome}</h1>
              <p className="text-xs text-muted-foreground capitalize">{todayStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Previsto hoje</p>
              <p className="text-lg font-bold text-emerald-600">
                R$ {totalPrevisto.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground">
                Concluído: R$ {totalConcluido.toFixed(2).replace(".", ",")}
              </p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {renderContent()}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card shadow-lg">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                activeTab === item.tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${activeTab === item.tab ? "stroke-[2.5]" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Modal Encaixe */}
      <Dialog open={isEncaixeModalOpen} onOpenChange={setIsEncaixeModalOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Novo Encaixe</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do cliente e serviço para realizar o agendamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Gap 3: Autocomplete */}
            <div className="space-y-2 relative">
              <Label htmlFor="clientName">Nome do Cliente</Label>
              <Input
                id="clientName"
                placeholder="Digite o nome..."
                value={newClientName}
                onChange={handleClientNameChange}
                autoComplete="off"
              />
              {showClientSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-popover text-popover-foreground border rounded-md shadow-md mt-1 overflow-hidden">
                      {clientSuggestions.map(client => (
                          <button
                            key={client.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => selectClientSuggestion(client)}
                          >
                              <div className="font-medium">{client.name}</div>
                              <div className="text-xs text-muted-foreground">{client.phone}</div>
                          </button>
                      ))}
                  </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">WhatsApp (Obrigatório)</Label>
              <Input
                id="clientPhone"
                placeholder="(11) 99999-9999"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(formatPhoneNumber(e.target.value))}
                maxLength={15}
              />
            </div>
            
            {/* Gap 2: Select Serviço */}
            <div className="space-y-2">
                <Label htmlFor="service">Serviço</Label>
                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger id="service">
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {services.map(service => (
                            <SelectItem key={service.id} value={service.id}>
                                {service.name} - R$ {service.price.toFixed(2)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEncaixeModalOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEncaixe} disabled={!newClientName.trim() || !selectedServiceId || newClientPhone.replace(/\D/g, "").length < 11 || isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Serviços */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados do serviço.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Nome do Serviço</Label>
              <Input
                id="serviceName"
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                placeholder="Ex: Corte Degrade"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="servicePrice">Preço (R$)</Label>
                <Input
                    id="servicePrice"
                    type="number"
                    value={serviceFormData.price}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="serviceDuration">Duração (min)</Label>
                <Select 
                    value={String(serviceFormData.duration)} 
                    onValueChange={(v) => setServiceFormData({ ...serviceFormData, duration: Number(v) })}
                >
                    <SelectTrigger id="serviceDuration">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceCategory">Categoria</Label>
              <Select 
                value={serviceFormData.category} 
                onValueChange={(v) => setServiceFormData({ ...serviceFormData, category: v as any })}
              >
                <SelectTrigger id="serviceCategory">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="corte">Corte</SelectItem>
                    <SelectItem value="barba">Barba</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleSaveService} disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Confirmations */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>{getAlertMessage()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={isLoading}>
              {isLoading ? "Processando..." : "Sim, confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SlotCardProps {
  slot: TimeSlot
  onEncaixe: () => void
  onBloquear: () => void
  onDesbloquear: () => void
  onConcluir: () => void
  onFaltou: () => void
  onCancelar: () => void
  onWhatsApp: () => void
}

function SlotCard({
  slot,
  onEncaixe,
  onBloquear,
  onDesbloquear,
  onConcluir,
  onFaltou,
  onCancelar,
  onWhatsApp,
}: SlotCardProps) {
  // Slot Livre
  if (slot.status === "livre") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
        <span className="text-sm font-semibold text-foreground">{slot.time}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={onEncaixe}
          >
            <Plus className="h-3.5 w-3.5" />
            Encaixe
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onBloquear}
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="sr-only">Bloquear</span>
          </Button>
        </div>
      </div>
    )
  }

  // Slot Ocupado
  if (slot.status === "ocupado") {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-semibold text-foreground">{slot.time}</span>
            <p className="mt-1 text-sm font-medium text-foreground">{slot.clientName}</p>
            <p className="text-xs text-muted-foreground">{slot.service}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
              onClick={onWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="sr-only">WhatsApp</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-sky-600 hover:bg-sky-100 hover:text-sky-700"
              onClick={onConcluir}
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Concluir</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-100 hover:text-orange-700"
              onClick={onFaltou}
            >
              <UserX className="h-4 w-4" />
              <span className="sr-only">Faltou</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:bg-red-100"
              onClick={onCancelar}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Cancelar</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Slot Concluído
  if (slot.status === "concluido") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
        <div className="flex items-start justify-between opacity-70">
          <div>
            <span className="text-sm font-semibold text-foreground">{slot.time}</span>
            <p className="mt-1 text-sm font-medium text-foreground line-through">
              {slot.clientName}
            </p>
            <p className="text-xs text-muted-foreground line-through">{slot.service}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-1">
            <Check className="h-3 w-3 text-white" />
            <span className="text-xs font-medium text-white">Concluído</span>
          </div>
        </div>
      </div>
    )
  }

  // Slot Faltou
  if (slot.status === "faltou") {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 shadow-sm">
        <div className="flex items-start justify-between opacity-80">
          <div>
            <span className="text-sm font-semibold text-foreground">{slot.time}</span>
            <p className="mt-1 text-sm font-medium text-foreground line-through">
              {slot.clientName}
            </p>
            <p className="text-xs text-muted-foreground line-through">{slot.service}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500 px-2 py-1">
            <UserX className="h-3 w-3 text-white" />
            <span className="text-xs font-medium text-white">Faltou</span>
          </div>
        </div>
      </div>
    )
  }

  // Slot Bloqueado/Almoço
  if (slot.status === "bloqueado") {
    return (
      <div className="rounded-lg border border-muted bg-muted p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">{slot.time}</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Indisponível</span>
            </div>
            {/* Bug 2: Botão de Desbloquear */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={onDesbloquear}
            >
              <LockOpen className="h-3.5 w-3.5" />
              <span className="sr-only">Desbloquear</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
