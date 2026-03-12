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
  }

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          const barberData = await resolveBarbeiro(session.user.id)

          if (barberData) {
            setBarbeiro(barberData)
            setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
          } else {
            setError("Sua conta existe mas nenhum barbeiro foi vinculado a ela. Contate o administrador.")
          }
        }
      } catch (err) {
        console.error("[Auth] Erro na inicialização:", err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        const barberData = await resolveBarbeiro(session.user.id)

        if (barberData) {
          setBarbeiro(barberData)
          setSessionIds(barberData.barbearia_id, barberData.id, barberData.nome)
          setError(null)
        } else {
          setError("Sua conta existe mas nenhum barbeiro foi vinculado a ela. Contate o administrador.")
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setBarbeiro(null)
        clearSession()
        setError(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
