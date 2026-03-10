'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfile(nome: string, telefone: string) {
  const supabase = await createClient()

  // 1. Valida sessao no servidor
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser()

  if (sessionError || !user) {
    console.error('[onboarding/actions] Sessao invalida:', sessionError)
    return { error: 'Sessao expirada. Faca login novamente.' }
  }

  console.log('[onboarding/actions] Iniciando upsert para user_id:', user.id)
  console.log('[onboarding/actions] Nome:', nome, '| Telefone:', telefone)

  // 2. Tenta upsert na tabela clientes salvando nome e telefone
  const { data, error: upsertError } = await supabase
    .from('clientes')
    .upsert(
      { user_id: user.id, nome, telefone },
      { onConflict: 'user_id' }
    )
    .select()

  if (upsertError) {
    console.error('[onboarding/actions] Erro no upsert:', {
      code: upsertError.code,
      message: upsertError.message,
      details: upsertError.details,
      hint: upsertError.hint,
    })
    return {
      error: `Erro ao salvar: ${upsertError.message} (code: ${upsertError.code})`,
    }
  }

  console.log('[onboarding/actions] Upsert bem-sucedido:', data)

  redirect('/')
}
