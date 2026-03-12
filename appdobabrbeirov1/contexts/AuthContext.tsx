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
      // Add a small timeout for database query too, to avoid infinite loading on db issues
      const dbPromise = supabase
        .from("barbeiros")
        .select("id, barbearia_id, nome")
        .eq("usuario_id", userId)
        .eq("ativo", true)
        .maybeSingle()

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout DB")), 5000)
      )

      const result: any = await Promise.race([dbPromise, timeoutPromise])
      const { data, error: queryError } = result

      if (queryError) {
        console.error("[Auth] Erro ao resolver barbeiro:", queryError)
        return null
      }
      return data
    } catch (err) {
      console.error("[Auth] Erro ao buscar dados do barbeiro (Timeout/Network):", err)
      return null
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true
    const initAuth = async () => {
      try {
        // Timeout de segurança para evitar loading infinito se o Supabase demorar
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout de autenticação")), 8000) // Increased to 8s
        )

        const sessionPromise = supabase.auth.getSession()

        const result: any = await Promise.race([sessionPromise, timeoutPromise])
        const { data: { session } } = result

        if (session?.user && mounted) {
          setUser(session.user)
          const barberData = await resolveBarbeiro(session.user.id)

          if (barberData && mounted) {
            setBarbeiro(barberData)
            setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
          } else if (mounted) {
            setError("Sua conta existe mas nenhum barbeiro foi vinculado a ela. Contate o administrador.")
          }
        }
      } catch (err: any) {
        console.warn("[Auth] Inicialização lenta ou falha de conexão (Timeout).", err)
        if (mounted) {
            setError(`Erro de conexão: ${err.message || "Tempo limite excedido"}. Tente recarregar.`)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Se o evento for apenas refresh de token e já temos o usuário, não faz nada visualmente
      // Isso evita recarregamentos desnecessários ao trocar de aba
      if (event === "TOKEN_REFRESHED" && user && session?.user?.id === user.id) {
          return
      }

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        
        // Só exibe loading se realmente não tivermos dados do barbeiro ainda
        // Se for um re-login rápido ou refresh, tentamos fazer em background se possível
        if (!barbeiro) {
            setLoading(true) 
            const barberData = await resolveBarbeiro(session.user.id)

            if (barberData && mounted) {
                setBarbeiro(barberData)
                setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
                setError(null)
            } else if (mounted) {
                setError("Sua conta existe mas nenhum barbeiro foi vinculado a ela. Contate o administrador.")
            }
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setBarbeiro(null)
        clearSession()
        setError(null)
      } 
      
      // Ensure loading is set to false after any auth event processing
      if (mounted) setLoading(false)
    })

    return () => {
        mounted = false
        subscription.unsubscribe()
    }
  }, [user, barbeiro]) // Adicionado dependências para evitar stale closures

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      const message = authError.message === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : authError.message
      return { error: message }
    }

    if (data.user) {
      const barberData = await resolveBarbeiro(data.user.id)

      if (!barberData) {
        await supabase.auth.signOut()
        return { error: "Sua conta existe mas nenhum barbeiro foi vinculado a ela. Contate o administrador." }
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBarbeiro(null)
    clearSession()
    setError(null)
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
