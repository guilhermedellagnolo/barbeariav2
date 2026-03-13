"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { setSessionIds, clearSession } from "@/lib/session-store"
import { User } from "@supabase/supabase-js"

// ─── Types ──────────────────────────────────────────────────────────────────

interface BarbeiroInfo {
  id: string
  barbearia_id: string
  nome: string
}

interface AuthContextType {
  user: User | null
  barbeiro: BarbeiroInfo | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [barbeiro, setBarbeiro] = useState<BarbeiroInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Resolve barbeiro record from auth user ID
  const resolveBarbeiro = async (userId: string): Promise<BarbeiroInfo | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from("barbeiros")
        .select("id, barbearia_id, nome")
        .eq("usuario_id", userId)
        .eq("ativo", true)
        .maybeSingle()

      if (queryError) {
        console.error("[Auth] Erro ao resolver barbeiro:", queryError)
        return null
      }
      return data
    } catch (err) {
      console.error("[Auth] Erro ao buscar dados do barbeiro (Network):", err)
      return null
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true

    // Função única para lidar com a sessão
    const handleSession = async (sessionUser: User | null) => {
        if (!mounted) return

        if (sessionUser) {
            setUser(sessionUser)
            // Se já temos barbeiro carregado para este usuário, não recarrega
            // Isso evita piscar loading se for apenas refresh de token
            if (barbeiro && user?.id === sessionUser.id) {
                setLoading(false)
                return
            }

            // Busca dados do barbeiro
            const barberData = await resolveBarbeiro(sessionUser.id)
            
            if (mounted) {
                if (barberData) {
                    setBarbeiro(barberData)
                    setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
                    setError(null)
                } else {
                    setBarbeiro(null)
                    setError("Conta sem barbeiro vinculado ou inativa.")
                }
                setLoading(false)
            }
        } else {
            // Sem usuário (Logout ou não logado)
            if (mounted) {
                setUser(null)
                setBarbeiro(null)
                clearSession()
                setError(null)
                setLoading(false)
            }
        }
    }

    // 1. Check Inicial (Get Session)
    // Usamos getSession para estado inicial rápido (cache local)
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session?.user ?? null)
    }).catch(err => {
        console.warn("[Auth] Erro no check inicial:", err)
        if (mounted) setLoading(false)
    })
    
    // 2. Listener para mudanças (Login, Logout, Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // O evento INITIAL_SESSION pode disparar logo após getSession
      // Mas nossa função handleSession é idempotente para o mesmo usuário
      await handleSession(session?.user ?? null)
    })

    return () => {
        mounted = false
        subscription.unsubscribe()
    }
  }, []) 

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setError(null)
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setLoading(false)
      const message = authError.message === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : authError.message
      return { error: message }
    }

    // O onAuthStateChange vai capturar o sucesso e atualizar o estado
    return { error: null }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    // O onAuthStateChange vai limpar o estado
  }

  return (
    <AuthContext.Provider value={{ user, barbeiro, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
