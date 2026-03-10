'use client'

import { useState } from 'react'
import { saveProfile } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Mascara para celular brasileiro: (XX) 9XXXX-XXXX — 11 digitos
// Aceita apenas 11 digitos (DDD + 9 + 8 digitos = celular)
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`
}

interface OnboardingFormProps {
  nomeInicial: string
}

export function OnboardingForm({ nomeInicial }: OnboardingFormProps) {
  const [nome, setNome] = useState(nomeInicial)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phoneDigits = phone.replace(/\D/g, '')
  // 11 digitos = DDD (2) + 9 fixo (1) + numero (8) — celular brasileiro obrigatorio
  // O 3o digito DEVE ser '9' para garantir formato WhatsApp valido
  const ninthDigitValid = phoneDigits.length >= 3 && phoneDigits[2] === '9'
  const isValid = nome.trim().length >= 2 && phoneDigits.length === 11 && ninthDigitValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError(null)

    // saveProfile roda no servidor com sessao autenticada via cookie
    // Em caso de sucesso faz redirect('/') — so retorna em caso de erro
    const result = await saveProfile(nome.trim(), phoneDigits)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Nome Completo — pre-preenchido com dado do Google, editavel */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome" className="text-foreground">
          Nome Completo
        </Label>
        <Input
          id="nome"
          type="text"
          placeholder="Seu nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-11 text-base"
          autoComplete="name"
        />
      </div>

      {/* Telefone / WhatsApp */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone" className="text-foreground">
          WhatsApp com DDD
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="(11) 9 9999-9999"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className={`h-11 text-base ${phoneDigits.length >= 3 && !ninthDigitValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          autoComplete="tel"
        />
        {phoneDigits.length >= 3 && !ninthDigitValid && (
          <p className="text-xs text-destructive">
            Celular deve começar com 9 após o DDD: (XX) <strong>9</strong>XXXX-XXXX
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading || !isValid}
        className="w-full h-11 text-base font-medium"
      >
        {loading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          'Confirmar e Entrar'
        )}
      </Button>
    </form>
  )
}
