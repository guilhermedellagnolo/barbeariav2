import { supabase } from "@/lib/supabase"
import { Service } from "@/types"

const BARBER_ID = process.env.NEXT_PUBLIC_BARBEARIA_ID || '3088ce7e-4b1f-4b7e-a3fc-fc97bb1f5a43'

export const fetchServices = async (): Promise<Service[]> => {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .select('*')
            .eq('barbearia_id', BARBER_ID)
            .eq('is_active', true)
        
        if (error) throw error
        
        if (data) {
            return data.map((item: any) => ({
                id: item.id,
                name: item.nome,
                price: item.preco,
                duration: item.duracao,
                category: item.categoria
            }))
        }
        return []
    } catch (error) {
        console.error("Erro ao carregar serviços:", error)
        throw error
    }
}

export const createService = async (payload: Omit<Service, 'id'>) => {
    try {
        const dbPayload = {
            barbearia_id: BARBER_ID,
            nome: payload.name,
            preco: payload.price,
            duracao: payload.duration,
            categoria: payload.category,
            is_active: true
        }

        const { error } = await supabase
            .from('servicos')
            .insert([dbPayload])

        if (error) throw error
    } catch (error: any) {
        console.error("Erro ao criar serviço:", error.message, error.code, error.details)
        throw error
    }
}

export const updateService = async (id: string, payload: Omit<Service, 'id'>) => {
    try {
        const dbPayload = {
            nome: payload.name,
            preco: payload.price,
            duracao: payload.duration,
            categoria: payload.category
        }

        const { error } = await supabase
            .from('servicos')
            .update(dbPayload)
            .eq('id', id)

        if (error) throw error
    } catch (error: any) {
        console.error("Erro ao atualizar serviço:", error.message, error.code, error.details)
        throw error
    }
}

export const deleteService = async (id: string) => {
    try {
        const { error } = await supabase
            .from('servicos')
            .update({ is_active: false })
            .eq('id', id)
        
        if (error) throw error
    } catch (error) {
        console.error("Erro ao excluir serviço:", error)
        throw error
    }
}
