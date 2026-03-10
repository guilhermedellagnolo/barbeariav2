export type TabType = "radar" | "agenda" | "clientes" | "servicos" | "financas" | "ajustes"
export type SlotStatus = "livre" | "ocupado" | "concluido" | "bloqueado" | "faltou"
export type ActionType = "concluir" | "faltou" | "cancelar" | "bloquear" | "desbloquear" | "bloquearDia" | "desbloquearDia"

export interface Service {
  id: string
  name: string
  price: number
  duration: number
  category: 'corte' | 'barba' | 'combo'
}

export interface TimeSlot {
  time: string
  status: SlotStatus
  clientName?: string
  clientPhone?: string
  service?: string
  serviceId?: string
  price?: number
}

export interface Client {
  id: string
  name: string
  phone: string
  cuts: number
  revenue: number
  noShows: number
}

export interface CompletedCut {
  id: string
  clientName: string
  value: number
  time: string
  date: string
}

export interface BarberSettings {
  openTime: string
  closeTime: string
  lunchStart: string
  lunchEnd: string
  slotDuration: string
  hasLunch: boolean
}

export interface WorkingHours {
    id: string
    barberId: string
    dayOfWeek: number
    startTime: string
    endTime: string
    lunchStart: string
    lunchEnd: string
    isWorking: boolean
}

export interface Barber {
    id: string
    barbearia_id: string
    name: string
    active: boolean
}
