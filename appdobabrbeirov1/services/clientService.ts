import { supabase } from "@/lib/supabase"
import { Client } from "@/types"

const BARBER_ID = '3088ce7e-4b1f-4b7e-a3fc-fc97bb1f5a43'

export const fetchClients = async (): Promise<Client[]> => {
    try {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('barbearia_id', BARBER_ID)
        
        if (error) throw error
        
        if (data) {
            return data.map((item: any) => ({
                id: item.id,
                name: item.nome,
                phone: item.telefone,
                cuts: item.total_cortes || 0,
                revenue: item.total_gasto || 0,
                noShows: item.total_faltas || 0
            }))
        }
        return []
    } catch (error) {
        console.error("Erro ao carregar clientes:", error)
        throw error
    }
}

export const upsertClient = async (name: string, phone: string): Promise<Client | null> => {
    try {
        const { data: newClient, error: clientError } = await supabase
            .from('clientes')
            .insert([{
                barbearia_id: BARBER_ID,
                nome: name,
                telefone: phone,
                total_cortes: 0,
                total_gasto: 0,
                total_faltas: 0
            }])
            .select()
            .single()
        
        if (clientError) throw clientError
        if (newClient) {
            return {
                id: newClient.id,
                name: newClient.nome,
                phone: newClient.telefone,
                cuts: 0,
                revenue: 0,
                noShows: 0
            }
        }
        return null
    } catch (error) {
        console.error("Erro ao criar cliente:", error)
        throw error
    }
}

export const updateClientMetrics = async (clientId: string, cuts: number, revenue: number, noShows: number) => {
    try {
        const { error: clientError } = await supabase
            .from('clientes')
            .update({ 
                total_cortes: cuts,
                total_gasto: revenue,
                total_faltas: noShows
            })
            .eq('id', clientId)
        
        if (clientError) throw clientError
    } catch (error) {
        console.error("Erro ao atualizar métricas do cliente:", error)
        throw error
    }
}
