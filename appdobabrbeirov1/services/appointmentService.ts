import { supabase } from "@/lib/supabase"
import { CompletedCut, TimeSlot, WorkingHours } from "@/types"

const BARBER_ID = '3088ce7e-4b1f-4b7e-a3fc-fc97bb1f5a43'

export const generateAvailableSlots = (
    date: string, // YYYY-MM-DD
    workingHours: WorkingHours | null,
    existingAppointments: any[], // Dados vindos do banco
    serviceDuration: number = 30,
    isClientContext: boolean = false
): TimeSlot[] => {
    // 1. Regra de Folga
    if (!workingHours || !workingHours.isWorking) {
        return []
    }

    const slots: TimeSlot[] = []
    const [startHour, startMinute] = workingHours.startTime.split(':').map(Number)
    const [endHour, endMinute] = workingHours.endTime.split(':').map(Number)
    const [lunchStartHour, lunchStartMinute] = (workingHours.lunchStart || "12:00").split(':').map(Number)
    const [lunchEndHour, lunchEndMinute] = (workingHours.lunchEnd || "13:00").split(':').map(Number)

    // Configura data base para cálculo
    const current = new Date(`${date}T00:00:00`)
    current.setHours(startHour, startMinute, 0, 0)

    const end = new Date(`${date}T00:00:00`)
    end.setHours(endHour, endMinute, 0, 0)

    const lunchStart = new Date(`${date}T00:00:00`)
    lunchStart.setHours(lunchStartHour, lunchStartMinute, 0, 0)

    const lunchEnd = new Date(`${date}T00:00:00`)
    lunchEnd.setHours(lunchEndHour, lunchEndMinute, 0, 0)

    // Hora atual para a trava de 2 horas (Considerando UTC-3 se necessário, ou local do browser)
    const now = new Date()
    // Margem de segurança de 2 horas em milissegundos
    const bookingThreshold = now.getTime() + (2 * 60 * 60 * 1000)

    while (current < end) {
        const timeString = current.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        let status: "livre" | "ocupado" | "bloqueado" = "livre"
        let clientName = undefined
        let clientPhone = undefined
        let serviceName = undefined
        let servicePrice: number | undefined = undefined
        
        // 2. Regra de Almoço
        if (current >= lunchStart && current < lunchEnd) {
            status = "bloqueado"
        }

        // 3. Regra de Ocupação com overlap (Teorema da Interseção de Conjuntos)
        const isOccupied = existingAppointments.some(apt => {
            if (apt.status === 'cancelado' || apt.status === 'faltou') return false
            const apptStart = new Date(apt.data_hora).getTime()
            const apptDuration = apt.servicos?.duracao ?? apt.servicos?.duracao_minutos ?? 30
            const apptEnd = apptStart + (apptDuration * 60000)
            const slotStart = current.getTime()
            const slotEnd = slotStart + (30 * 60000)
            return (slotStart < apptEnd && slotEnd > apptStart)
        })

        // Busca o agendamento exato para preencher nome/telefone/serviço na UI
        const appointment = isOccupied
            ? existingAppointments.find(apt => {
                if (apt.status === 'cancelado' || apt.status === 'faltou') return false
                const apptStart = new Date(apt.data_hora).getTime()
                const apptDuration = apt.servicos?.duracao ?? apt.servicos?.duracao_minutos ?? 30
                const apptEnd = apptStart + (apptDuration * 60000)
                const slotStart = current.getTime()
                const slotEnd = slotStart + (30 * 60000)
                return (slotStart < apptEnd && slotEnd > apptStart)
            })
            : undefined

        if (isOccupied && appointment) {
            status = appointment.status === 'agendado' ? 'ocupado' : appointment.status
            clientName = appointment.cliente_nome
            clientPhone = appointment.cliente_telefone
            serviceName = appointment.servicos?.nome
            servicePrice = appointment.servicos?.preco ?? undefined
        }

        // 4. Regra de Trava de 2 Horas (Apenas para Site do Cliente)
        if (isClientContext && status === "livre") {
            // Se o slot for antes de agora + 2h, bloqueia ou esconde
            // Para simplificar, marcamos como bloqueado visualmente, ou poderíamos nem retornar no array
            // Convert 'current' (which is conceptually Brasilia time) to a timestamp
            // current is Date(year, month, day, hour, minute) in local system time.
            // We want to interpret it as Brasilia time.
            // Let's construct a UTC date that corresponds to this Brasilia time.
            const slotTimestamp = Date.UTC(
                current.getFullYear(),
                current.getMonth(),
                current.getDate(),
                current.getHours() + 3, // Add 3 hours to get UTC from Brasilia
                current.getMinutes()
            )

            if (slotTimestamp < bookingThreshold) {
                status = "bloqueado" 
            }
        }

        slots.push({
            time: timeString,
            status: status as any,
            id: appointment?.id,
            clientName,
            clientPhone,
            service: serviceName,
            price: servicePrice
        })

        current.setMinutes(current.getMinutes() + 30)
    }

    return slots
}

export const fetchBarberWorkingHours = async (barberId: string, dayOfWeek: number): Promise<WorkingHours | null> => {
    try {
        const { data, error } = await supabase
            .from('horarios_trabalho')
            .select('*')
            .eq('barbeiro_id', barberId)
            .eq('dia_semana', dayOfWeek)
            .maybeSingle() // Use maybeSingle to handle days without config gracefully
        
        if (error) throw error

        return data ? {
            id: data.id,
            barberId: data.barbeiro_id,
            dayOfWeek: data.dia_semana,
            startTime: data.inicio,
            endTime: data.fim,
            lunchStart: data.inicio_almoco,
            lunchEnd: data.fim_almoco,
            isWorking: data.trabalha
        } : null
    } catch (error) {
        console.error("Erro ao carregar horários do barbeiro:", error)
        return null
    }
}

export const updateBarberWorkingHours = async (
    barberId: string, 
    dayOfWeek: number, 
    startTime: string, 
    endTime: string, 
    lunchStart: string, 
    lunchEnd: string, 
    isWorking: boolean
) => {
    try {
        const { error } = await supabase
            .from('horarios_trabalho')
            .upsert({
                barbeiro_id: barberId,
                dia_semana: dayOfWeek,
                inicio: startTime,
                fim: endTime,
                inicio_almoco: lunchStart,
                fim_almoco: lunchEnd,
                trabalha: isWorking
            }, { onConflict: 'barbeiro_id, dia_semana' })
        
        if (error) throw error
    } catch (error) {
        console.error("Erro ao atualizar horários do barbeiro:", error)
        throw error
    }
}

export const fetchMainBarberId = async (): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('barbeiros')
            .select('id')
            .eq('barbearia_id', BARBER_ID)
            .limit(1)
            .maybeSingle() // Use maybeSingle instead of single to avoid PGRST116
        
        if (error) throw error
        return data?.id || null
    } catch (error) {
        console.error("Erro ao buscar barbeiro principal:", error)
        return null
    }
}

export const fetchFinanceHistory = async (): Promise<CompletedCut[]> => {
    try {
        const { data, error } = await supabase
            .from('agendamentos')
            .select('*, servicos(id, nome, preco, duracao, duracao_minutos)')
            .eq('barbearia_id', BARBER_ID)
            .eq('status', 'concluido')
            .order('data_hora', { ascending: false })
            .limit(50)
        
        if (error) throw error
        
        if (data) {
            return data.map((item: any) => ({
                id: item.id,
                clientName: item.cliente_nome,
                value: item.servicos?.preco || 0,
                time: new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                date: new Date(item.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }))
        }
        return []
    } catch (error) {
        console.error("Erro ao carregar histórico financeiro:", error)
        throw error
    }
}

export const fetchAppointments = async (date: Date): Promise<any[]> => {
    try {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${day}`

        const { data, error } = await supabase
            .from('agendamentos')
            .select('*, servicos(id, nome, preco, duracao, duracao_minutos)')
            .eq('barbearia_id', BARBER_ID)
            .gte('data_hora', `${dateString} 00:00:00`)
            .lte('data_hora', `${dateString} 23:59:59`)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error("Erro ao carregar agendamentos:", error)
        throw error
    }
}

export const createAppointment = async (
    clientId: string,
    serviceId: string,
    date: Date,
    time: string,
    clientName: string,
    clientPhone: string
) => {
    const [hours, minutes] = time.split(':')
    const appointmentDate = new Date(date)
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    const isoDate = appointmentDate.toISOString()

    // 1. Check Availability (Race Condition Prevention)
    const { data: existing, error: checkError } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('barbearia_id', BARBER_ID)
        .eq('data_hora', isoDate)
        .not('status', 'in', '("cancelado","faltou")') // Ignore cancelled
        .single()

    if (existing) {
        throw new Error("Este horário já foi ocupado por outro cliente.")
    }

    // 2. Insert
    const { error: aptError } = await supabase
        .from('agendamentos')
        .insert([{
            barbearia_id: BARBER_ID,
            cliente_id: clientId,
            servico_id: serviceId,
            data_hora: isoDate,
            status: 'agendado',
            cliente_nome: clientName,
            cliente_telefone: clientPhone
        }])
    
    if (aptError) throw aptError
}

export const updateAppointmentStatus = async (
    appointmentId: string,
    status: 'concluido' | 'cancelado' | 'faltou'
) => {
    const { error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', appointmentId)

    if (error) throw error
}
