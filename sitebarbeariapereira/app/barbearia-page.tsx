"use client"

import { useState, useRef, useEffect } from "react"
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Instagram,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  User,
  LogOut,
  Menu,
  Tag,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  getAllBarbers,
  getBarberWorkingHours,
  getAppointments,
  generateAvailableSlots,
  createAppointment,
  ensureClientExists, // Importado
  getServicos,
  getBarbearia,
  Barber,
  Barbearia,
  Servico,
  TimeSlot,
} from "@/services/appointmentService"
import { createClient } from "@/lib/supabase/client"
import { AgendamentosSheet } from "./agendamentos-sheet"

// Mascara para celular brasileiro: (XX) 9XXXX-XXXX — 11 digitos obrigatorios
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`
}

const FALLBACK_GALLERY = [
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&h=400&fit=crop",
]

// Generate next 7 days
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

const formatDayName = (date: Date) => {
  return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")
}

const formatDayNumber = (date: Date) => {
  return date.getDate().toString()
}

const formatFullDate = (date: Date) => {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// Helper function to format date as YYYY-MM-DD
const formatDateForApi = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper para corrigir URL do Instagram (remove duplicatas de protocolo/dominio)
const fixInstagramUrl = (url?: string) => {
  if (!url) return ''
  // Se a URL contiver duplicidade do prefixo, substitui por um único
  // Ex: https://www.instagram.com/https://www.instagram.com/user -> https://www.instagram.com/user
  return url.replace(/(https?:\/\/(www\.)?instagram\.com\/){2,}/g, 'https://www.instagram.com/')
}

// Formata preco em BRL
const formatPrice = (price?: number | null) => {
  if (price == null) return null
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function BarbeariaPage({ barbeariaId }: { barbeariaId: string }) {
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null)
  const [barbers, setBarbers] = useState<(Barber & { role: string, image: string })[]>([])
  const [selectedBarber, setSelectedBarber] = useState<(Barber & { role: string, image: string }) | null>(null)

  // ── Serviços ──────────────────────────────────────────────────────────────
  const [services, setServices] = useState<Servico[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [selectedService, setSelectedService] = useState<Servico | null>(null)

  const [selectedDay, setSelectedDay] = useState<number>(0)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalStep, setModalStep] = useState<"register" | "success">("register")
  const [formData, setFormData] = useState({ name: "", whatsapp: "" })
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)  // guard: desabilita botao apos 1 clique
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [clientRecord, setClientRecord] = useState<any>(null)

  const scheduleSectionRef = useRef<HTMLDivElement>(null)
  const days = getNextDays()

  // ── Init: usuário + barbeiro ───────────────────────────────────────────────
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        setIsPageLoading(true)
        setPageError(null)

        // Fetch User
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Usa maybeSingle() para evitar erro 406/PGRST116 quando não existe
          const { data } = await supabase.from('clientes').select('*').eq('user_id', user.id).maybeSingle()
          if (data) {
            setClientRecord(data)
            setFormData({ name: data.nome || "", whatsapp: data.telefone || "" })
          }
        }

        // Fetch Barbearia (dados dinâmicos do tenant)
        const barbeariaData = await getBarbearia(barbeariaId)
        if (barbeariaData) {
            setBarbearia(barbeariaData)
        } else {
            // Se não encontrar barbearia, lança erro para não mostrar site vazio/padrão
            throw new Error("Barbearia não encontrada.")
        }

        // Fetch all barbers
        const allBarbers = await getAllBarbers(barbeariaId)
        setBarbers(allBarbers.map(b => ({
          ...b,
          role: "Barbeiro Especialista",
          image: b.foto_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
        })))

      } catch (err: any) {
        console.error("Erro ao carregar barbearia:", err)
        setPageError(err.message || "Erro ao carregar dados.")
      } finally {
        setIsPageLoading(false)
      }
    }
    init()
  }, [])

  // ── Carrega serviços quando barbeiro é selecionado ────────────────────────
  useEffect(() => {
    if (!selectedBarber) return

    async function fetchServices() {
      setLoadingServices(true)
      const data = await getServicos(barbeariaId)
      setServices(data)
      setLoadingServices(false)
    }
    fetchServices()
  }, [selectedBarber])

  // ── Fetch Slots quando serviço ou dia mudam ───────────────────────────────
  // Polling silencioso a cada 60s para manter a vitrine sincronizada
  useEffect(() => {
    // Aguarda o serviço ser selecionado antes de gerar slots
    if (!selectedBarber || !selectedService) return

    let isMounted = true

    async function fetchSlots(silent = false) {
      if (!selectedBarber || !selectedService || !isMounted) return

      // Na carga inicial exibe o spinner; no polling silencioso nao pisca a UI
      if (!silent) setLoadingSlots(true)

      const dateObj = days[selectedDay]
      const dateStr = formatDateForApi(dateObj)
      const dayOfWeek = dateObj.getDay()

      try {
        const [workingHours, appointments] = await Promise.all([
          getBarberWorkingHours(selectedBarber.id, dayOfWeek),
          getAppointments(dateStr, barbeariaId, selectedBarber.id)
        ])

        if (isMounted) {
          if (workingHours) {
            // Passa DUAS durações distintas:
            //   slotDuration (workingHours) = intervalo da grade
            //   selectedService.duracao_minutos = duração real do serviço (para "cabe antes do fechamento")
            setSlots(generateAvailableSlots(dateStr, workingHours, appointments, selectedService.duracao_minutos))
          } else {
            setSlots([])
          }
        }
      } catch (error) {
        console.error("Error fetching slots:", error)
        if (isMounted && !silent) setSlots([])
      } finally {
        if (isMounted && !silent) setLoadingSlots(false)
      }
    }

    // Carga inicial com spinner
    fetchSlots(false)

    // Polling silencioso a cada 60 segundos
    const pollingInterval = setInterval(() => fetchSlots(true), 60_000)

    // Cleanup: cancela o intervalo quando o servico, barbeiro ou dia muda, ou o componente desmonta
    return () => {
      isMounted = false
      clearInterval(pollingInterval)
    }
  }, [selectedBarber, selectedService, selectedDay])

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando barbearia...</p>
      </div>
    )
  }

  if (pageError) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4 p-4 text-center">
          <p className="text-destructive font-semibold">Ocorreu um erro.</p>
          <p className="text-muted-foreground">{pageError}</p>
          <p className="text-sm text-muted-foreground">Tente recarregar a página.</p>
        </div>
      )
  }

  const scrollToSchedule = () => {
    scheduleSectionRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleBarberSelect = (barber: typeof barbers[number]) => {
    setSelectedBarber(barber)
    // Reseta serviço e slots ao trocar de barbeiro
    setSelectedService(null)
    setSlots([])
    setSelectedTime(null)
  }

  // Step 1 → Step 2: cliente escolhe serviço
  const handleServiceSelect = (service: Servico) => {
    setSelectedService(service)
    setSelectedTime(null)
    setSlots([])
  }

  // Step 2 → Step 1: cliente quer trocar serviço
  const handleBackToServices = () => {
    setSelectedService(null)
    setSelectedTime(null)
    setSlots([])
  }

  const handleTimeSelect = (time: string) => {
    // Lazy Login: se nao logado, redireciona direto para /login (sem modal intermediario)
    if (!user) {
      window.location.href = "/login"
      return
    }
    setSelectedTime(time)
    setShowModal(true)
    setModalStep("register")
  }

  const handleConfirmBooking = async () => {
    // Guard: impede duplo clique / segundo envio enquanto aguarda resposta
    const whatsappDigits = formData.whatsapp.replace(/\D/g, '')
    if (bookingLoading || !formData.name || whatsappDigits.length !== 11 || !selectedBarber || !selectedTime || !selectedService) return

    setBookingLoading(true)
    setBookingError(null)

    const dateStr = formatDateForApi(days[selectedDay])

    // 1. Garante que o cliente existe (cria se for o primeiro agendamento)
    let finalClientId = clientRecord?.id || null
    
    if (user && !finalClientId) {
       // Se tem usuario logado mas nao tem clientRecord, cria agora
       finalClientId = await ensureClientExists(user.id, formData.name, formData.whatsapp, barbeariaId)
       // Atualiza estado local para proximas vezes
       if (finalClientId) {
          // Busca o registro completo apenas para manter consistencia do estado, se necessario
          // ou apenas monta um objeto parcial
          setClientRecord({ id: finalClientId, nome: formData.name, telefone: formData.whatsapp, user_id: user.id })
       }
    }

    const result = await createAppointment(
      barbeariaId,
      selectedBarber.id,
      finalClientId, // Usa o ID garantido (ou null se falhou/guest)
      formData.name,
      formData.whatsapp,
      dateStr,
      selectedTime,
      selectedService.id
    )

    if (result.success) {
      setModalStep("success")
      // Recarrega slots para refletir o novo agendamento imediatamente
      if (selectedBarber && selectedService) {
        const dateObj = days[selectedDay]
        const dayOfWeek = dateObj.getDay()
        const [workingHours, appointments] = await Promise.all([
          getBarberWorkingHours(selectedBarber.id, dayOfWeek),
          getAppointments(dateStr, barbeariaId, selectedBarber.id)
        ])
        if (workingHours) {
          setSlots(generateAvailableSlots(dateStr, workingHours, appointments, selectedService.duracao_minutos))
        }
      }
    } else {
      // Exibe mensagem de erro no modal sem fechar (usuario pode escolher outro slot)
      setBookingError(result.message)
      if (result.conflict) {
        // Race condition: fecha o modal e recarrega slots para mostrar o slot ja ocupado
        setTimeout(() => {
          setShowModal(false)
          setSelectedTime(null)
          setBookingError(null)
        }, 2500)
      }
    }

    setBookingLoading(false)
  }

  const handleCloseModal = () => {
    if (bookingLoading) return // nao fecha o modal enquanto aguarda
    setShowModal(false)
    setModalStep("register")
    // Restaura formData do clientRecord para nao perder nome/telefone entre agendamentos
    setFormData({
      name: clientRecord?.nome || "",
      whatsapp: clientRecord?.telefone || "",
    })
    setSelectedTime(null)
    setBookingError(null)
  }

  // Dados dinâmicos com fallback para valores atuais da Barbearia Pereira
  const nomeBarbearia = barbearia?.nome || 'Barbearia Pereira'
  const heroBackground = barbearia?.foto_fundo_url || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop'
  const anoFundacao = barbearia?.ano_fundacao || '2010'
  const sloganPrincipal = barbearia?.slogan_principal || 'Estilo e Tradição em Cada Corte'
  const descricaoHero = barbearia?.descricao_hero || 'Experiência premium em barbearia. Atendimento personalizado com técnicas clássicas e modernas.'
  const galleryImages = barbearia?.fotos_galeria?.length ? barbearia.fotos_galeria : FALLBACK_GALLERY
  const descricaoRodape = barbearia?.descricao_rodape || 'Tradição e qualidade em cortes masculinos desde 2010. Sua experiência premium em barbearia.'
  const enderecoBarbearia = barbearia?.endereco || 'Rua das Palmeiras, 123 - Centro, São Paulo - SP'
  const telefoneBarbearia = barbearia?.telefone || '(11) 99999-9999'
  const horariosTexto = barbearia?.horarios_texto || 'Segunda a Sexta: 08:00 - 19:00\nSábado: 08:00 - 17:00\nDomingo: Fechado'

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroBackground}')` }}>
          <div className="absolute inset-0 bg-black/60" /> {/* Ajustado para bg-black/60 para melhor contraste com imagem visível */}
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">{nomeBarbearia}</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#galeria" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Galeria
            </a>
            <a href="#agendar" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Agendar
            </a>
            {user ? (
              <>
                <AgendamentosSheet clienteId={clientRecord?.id ?? null}>
                  <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    Meus Agendamentos
                  </button>
                </AgendamentosSheet>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </form>
              </>
            ) : (
              <a href="/login" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Entrar
              </a>
            )}
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-card border-border">
                {/* SheetTitle obrigatorio pelo Radix UI para acessibilidade (ARIA) — oculto visualmente */}
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <nav className="flex flex-col gap-1 mt-8">
                  <a
                    href="#galeria"
                    className="px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Galeria
                  </a>
                  <a
                    href="#agendar"
                    className="px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Agendar
                  </a>
                  {user ? (
                    <>
                      <AgendamentosSheet clienteId={clientRecord?.id ?? null}>
                        <button className="px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors w-full text-left">
                          Meus Agendamentos
                        </button>
                      </AgendamentosSheet>
                      <div className="border-t border-border mt-2 pt-2">
                        <form action="/auth/signout" method="post">
                          <button
                            type="submit"
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sair da conta
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="border-t border-border mt-2 pt-2">
                      <a
                        href="/login"
                        className="px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors block"
                      >
                        Entrar
                      </a>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-3xl">
            <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-6">
              Desde {anoFundacao}
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
              {sloganPrincipal}
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              {descricaoHero}
            </p>
            <Button
              size="lg"
              onClick={scrollToSchedule}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-semibold rounded-none"
            >
              Agendar Horário
            </Button>
          </div>
        </div>

        <div className="relative z-10 pb-12 flex justify-center">
          <div className="animate-bounce">
            <ChevronLeft className="h-6 w-6 text-muted-foreground rotate-[-90deg]" />
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeria" className="py-20 px-6 lg:px-12 bg-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4">
              Nosso Trabalho
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Portfólio
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-[4/3] overflow-hidden group"
              >
                <img
                  src={image}
                  alt={`Corte de cabelo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-colors duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Barber Selection Section */}
      <section id="agendar" ref={scheduleSectionRef} className="py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4">
              {barbers.length === 1 ? "Nosso Profissional" : "Nossos Profissionais"}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha seu Barbeiro
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Clique no card para visualizar a agenda disponível
            </p>
          </div>

          {/* Barber Cards Grid */}
          {barbers.length > 0 && (
          <div className={`grid gap-6 justify-items-center ${
            barbers.length === 1 ? "grid-cols-1 max-w-sm mx-auto" :
            barbers.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" :
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto"
          }`}>
            {barbers.map((barber) => {
              const isSelected = selectedBarber?.id === barber.id
              return (
                <Card
                  key={barber.id}
                  className={`w-full max-w-sm cursor-pointer transition-all duration-300 bg-card border-border hover:border-primary/50 ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => handleBarberSelect(barber)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative w-32 h-32 mb-4 overflow-hidden rounded-full border-2 border-primary/20">
                        <img
                          src={barber.image}
                          alt={barber.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{barber.nome}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{barber.role}</p>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        className={`w-full ${isSelected ? "bg-primary text-primary-foreground" : "border-primary/50 text-primary hover:bg-primary/10"}`}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {isSelected ? "Agenda Aberta" : "Ver Agenda"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          )}

          {/* ── STEP 1: Seleção de Serviço ─────────────────────────────────────── */}
          {selectedBarber && !selectedService && (
            <div className="mt-12 animate-in slide-in-from-top-4 duration-500">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Escolha o Serviço
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Selecione o serviço desejado para ver os horários disponíveis
                </p>

                {loadingServices ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum serviço cadastrado. Entre em contato com a barbearia.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 text-left"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {service.nome}
                          </span>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {service.duracao_minutos} min
                            </span>
                            {service.preco != null && (
                              <span className="text-xs font-medium text-primary">
                                {formatPrice(service.preco)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Calendário + Slots (após serviço escolhido) ───────────── */}
          {selectedBarber && selectedService && (
            <div className="mt-12 animate-in slide-in-from-top-4 duration-500">
              <div className="max-w-3xl mx-auto">

                {/* Banner do serviço escolhido com botão "Trocar" */}
                <div className="flex items-center justify-between p-3 mb-8 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground text-sm">{selectedService.nome}</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {selectedService.duracao_minutos} min
                        </span>
                        {selectedService.preco != null && (
                          <span className="text-xs font-medium text-primary">
                            {formatPrice(selectedService.preco)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToServices}
                    className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10 flex-shrink-0"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Trocar
                  </Button>
                </div>

                {/* Days Carousel */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Selecione o Dia
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {days.map((date, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDay(index)}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-lg border transition-all duration-200 ${
                          selectedDay === index
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
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
                </div>

                {/* Time Slots */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Horários Disponíveis
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formatFullDate(days[selectedDay])}
                  </p>
                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : slots.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {slots.map((slot) => {
                      const isDisabled = slot.status !== 'livre'

                      // Regra de UI (Privacidade Absoluta):
                      // Se o slot não estiver livre (seja bloqueado ou ocupado), ele deve parecer idêntico.
                      // Sem texto "Ocupado", botão desabilitado e visualmente apagado.

                      if (isDisabled) {
                         return (
                          <button
                            key={slot.time}
                            disabled={true}
                            className="py-3 px-2 rounded-lg text-sm font-medium bg-muted/20 text-muted-foreground/20 border border-transparent cursor-not-allowed"
                            aria-disabled="true"
                          >
                            {slot.time}
                          </button>
                         )
                      }

                      return (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={`py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                             selectedTime === slot.time
                              ? "bg-primary text-primary-foreground shadow-lg scale-105" // Selecionado
                              : "bg-card text-foreground border border-border hover:border-primary hover:bg-primary/10 hover:shadow-sm" // Livre
                          }`}
                        >
                          {slot.time}
                        </button>
                      )
                    })}
                  </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Nenhum horário disponível para este dia.</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-4">
                    * Horários desabilitados (cinza) já foram reservados ou estão bloqueados por antecedência mínima (2h).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-secondary py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Scissors className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">{nomeBarbearia}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {descricaoRodape}
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Contato</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>{enderecoBarbearia}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{telefoneBarbearia}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Horário de Funcionamento</h4>
              <div className="space-y-2 text-muted-foreground">
                {horariosTexto.split('\n').map((linha, i) => (
                  <p key={i}>{linha}</p>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                {barbearia?.instagram_url && (
                  <a 
                    href={fixInstagramUrl(barbearia.instagram_url)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {nomeBarbearia}. Todos os direitos reservados.
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by <span className="text-primary font-medium">T3 Software</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Content */}
            <div className="p-8">
              {/* Register Step */}
              {modalStep === "register" && (
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2 text-center">
                    Quase lá!
                  </h3>
                  <p className="text-muted-foreground mb-6 text-center">
                    {clientRecord
                      ? "Confirme seu agendamento"
                      : "Complete seu cadastro para confirmar"}
                  </p>

                  {/* Resumo do serviço no modal */}
                  {selectedService && (
                    <div className="mb-5 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground text-sm">{selectedService.nome}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {selectedService.duracao_minutos} min
                          </span>
                          {selectedService.preco != null && (
                            <span className="text-xs font-medium text-primary">
                              {formatPrice(selectedService.preco)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-foreground">Nome Completo</Label>
                      {clientRecord ? (
                        // Perfil já existe: exibe somente-leitura para evitar loop de preenchimento
                        <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-md bg-muted border border-border text-foreground text-sm">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{formData.name}</span>
                        </div>
                      ) : (
                        <Input
                          id="name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
                        />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="whatsapp" className="text-foreground">WhatsApp</Label>
                      {clientRecord ? (
                        // Perfil já existe: exibe somente-leitura
                        <div className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-md bg-muted border border-border text-foreground text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{formData.whatsapp}</span>
                        </div>
                      ) : (
                        <Input
                          id="whatsapp"
                          type="tel"
                          inputMode="numeric"
                          placeholder="(11) 9 9999-9999"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                          className="mt-2 bg-input border-border text-foreground placeholder:text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-foreground">
                      <strong>Atenção:</strong> Cancelamentos apenas com 2h de antecedência.
                    </p>
                  </div>

                  {/* Erro de agendamento (ex: slot ocupado por race condition) */}
                  {bookingError && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-sm text-destructive text-center">{bookingError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleConfirmBooking}
                    disabled={!formData.name || formData.whatsapp.replace(/\D/g, '').length !== 11 || bookingLoading}
                    className="w-full mt-4 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Confirmando...
                      </span>
                    ) : (
                      "Confirmar Agendamento"
                    )}
                  </Button>
                </div>
              )}

              {/* Success Step */}
              {modalStep === "success" && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Agendamento Confirmado!
                  </h3>
                  <p className="text-muted-foreground mb-8">
                    Você receberá uma confirmação no WhatsApp
                  </p>

                  <div className="bg-secondary rounded-lg p-6 mb-6 text-left">
                    <h4 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
                      Resumo do Agendamento
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-primary" />
                        <span className="text-foreground">{selectedBarber?.nome}</span>
                      </div>
                      {selectedService && (
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-primary" />
                          <span className="text-foreground">{selectedService.nome}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span className="text-foreground">{formatFullDate(days[selectedDay])}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-foreground">{selectedTime}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleCloseModal}
                    className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold"
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
