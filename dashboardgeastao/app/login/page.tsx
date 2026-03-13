'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Lock, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Cliente Supabase local (apenas para login inicial)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Tentando login com:", email) // DEBUG
    setLoading(true)
    setError(null)

    try {
      // 1. Tenta login no Supabase
      console.log("Chamando supabase.auth.signInWithPassword...") // DEBUG
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log("Resposta Supabase:", { data, error }) // DEBUG

      if (error) {
        throw new Error(error.message === 'Invalid login credentials' 
          ? 'Credenciais inválidas.' 
          : error.message)
      }

      // 2. Verificação HARDCODED de Segurança (Camada Extra)
      // Só permite o SEU email. Qualquer outro login válido é bloqueado aqui.
      const ALLOWED_EMAIL = 't3barber@gmail.com'
      
      console.log("Verificando email permitido:", data.user?.email) // DEBUG
      if (data.user?.email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut() // Desloga imediatamente
        throw new Error('Acesso não autorizado. Este painel é restrito.')
      }

      // 3. Sucesso -> Redireciona para Dashboard
      console.log("Login sucesso! Redirecionando...") // DEBUG
      router.push('/')
      router.refresh()
      
    } catch (err: any) {
      console.error("Erro no login:", err) // DEBUG
      setError(err.message || 'Ocorreu um erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Acesso Restrito</CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Painel Administrativo T3Barber
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@t3barber.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 focus:border-amber-500 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 focus:border-amber-500 text-white"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}