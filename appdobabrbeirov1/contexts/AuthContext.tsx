"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react"
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

  // Refs to keep track of state inside the listener without stale closures
  const userRef = useRef<User | null>(null)
  const barbeiroRef = useRef<BarbeiroInfo | null>(null)

  // Update refs whenever state changes
  useEffect(() => {
    userRef.current = user
    barbeiroRef.current = barbeiro
  }, [user, barbeiro])

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
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && mounted) {
          setUser(session.user)
          userRef.current = session.user
          
          const barberData = await resolveBarbeiro(session.user.id)
          if (mounted) {
             if (barberData) {
                setBarbeiro(barberData)
                barbeiroRef.current = barberData
                setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
                setError(null)
             } else {
                setError("Conta sem barbeiro vinculado.")
             }
             setLoading(false)
          }
        } else if (mounted) {
            setLoading(false)
        }
      } catch (err) {
        console.warn("[Auth] Erro no check inicial:", err)
        if (mounted) setLoading(false)
      }
    }

    initAuth()
    
    // Listener continua existindo para monitorar mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      const currentUser = userRef.current
      const currentBarbeiro = barbeiroRef.current

      // Se o evento for apenas refresh de token e já temos o usuário, não faz nada
      if (event === "TOKEN_REFRESHED" && currentUser && session?.user?.id === currentUser.id) {
          return
      }
      
      // Se o evento for SIGNED_IN (ex: tab focus) e já estamos logados com o mesmo usuário
      if (event === "SIGNED_IN" && currentUser && session?.user?.id === currentUser.id) {
          // Se já temos barbeiro carregado, ignoramos para não recarregar a tela
          if (currentBarbeiro) return
      }

      if (session?.user) {
        // Se o usuário mudou ou se ainda não carregamos os dados do barbeiro
        if (!currentUser || currentUser.id !== session.user.id || !currentBarbeiro) {
            setUser(session.user)
            userRef.current = session.user
            
            // Só exibe loading se for uma troca real de usuário e não tivermos dados
            if (!currentBarbeiro) setLoading(true)
            
            const barberData = await resolveBarbeiro(session.user.id)

            if (mounted) {
                if (barberData) {
                    setBarbeiro(barberData)
                    barbeiroRef.current = barberData
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
            userRef.current = null
            barbeiroRef.current = null
            
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
