
import { supabase } from "@/lib/supabase"
import { setSessionIds, clearSession } from "@/lib/session-store"

export interface User {
  id: string
  email: string
  name?: string
  role?: string
}

export interface Barbeiro {
  id: string
  barbearia_id: string
  nome: string
  foto_url: string | null
  ativo: boolean
  usuario_id: string
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) return null
  
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.user_metadata?.nome,
    role: session.user.user_metadata?.role
  }
}

export async function getBarbeiroProfile(userId: string): Promise<Barbeiro | null> {
  // Busca o barbeiro vinculado ao usuário logado
  const { data, error } = await supabase
    .from("barbeiros")
    .select("*")
    .eq("usuario_id", userId)
    .single()
    
  if (error || !data) {
    console.error("Erro ao buscar perfil de barbeiro:", error)
    // Tenta buscar por email como fallback (caso usuario_id não tenha sido vinculado corretamente na criação)
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user?.email) {
       // Tenta buscar pelo email que foi usado para criar o barbeiro no dashboard
       // Isso requer que a tabela 'barbeiros' tenha uma forma de linkar email, mas atualmente não tem coluna email explícita
       // O vínculo é feito via 'usuario_id'. Se falhou, é porque o vínculo não existe.
       return null
    }
    return null
  }
  
  // Inicializa a sessão global com os IDs encontrados
  setSessionIds(data.barbearia_id, data.id, data.nome)
  
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
  clearSession()
}
