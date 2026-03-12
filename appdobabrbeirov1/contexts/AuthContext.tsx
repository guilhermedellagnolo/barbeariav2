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
  // Esta função deve ser pura e não depender de estado externo se possível
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
    
    // Simplificado: Confia apenas no listener de onAuthStateChange para gerenciar o estado inicial
    // Isso evita a race condition entre getSession() e onAuthStateChange() disparando juntos
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Se o evento for apenas refresh de token e já temos o usuário, não faz nada visualmente
      if (event === "TOKEN_REFRESHED" && user && session?.user?.id === user.id) {
          return
      }
      
      // console.log("[Auth] Event:", event, session?.user?.email)

      if (session?.user) {
        // Se o usuário mudou ou se ainda não carregamos os dados do barbeiro
        if (!user || user.id !== session.user.id || !barbeiro) {
            setUser(session.user)
            
            // Só exibe loading se for uma troca real de usuário
            if (!barbeiro) setLoading(true)
            
            const barberData = await resolveBarbeiro(session.user.id)

            if (mounted) {
                if (barberData) {
                    setBarbeiro(barberData)
                    setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
                    setError(null)
                } else {
                    setError("Conta sem barbeiro vinculado.")
                }
                setLoading(false)
            }
        }
      } else {
        // Sem sessão (Logout ou não logado)
        if (mounted) {
            setUser(null)
            setBarbeiro(null)
            clearSession()
            setError(null)
            setLoading(false)
        }
      }
    })

    return () => {
        mounted = false
        subscription.unsubscribe()
    }
  }, []) // Remove dependências para rodar apenas no mount

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

    // O onAuthStateChange vai lidar com o resto
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
