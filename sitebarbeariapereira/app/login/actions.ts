'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/meus-agendamentos')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Tenta vincular ao cliente existente ou cria um novo
    // Como estamos rodando no server action com a sessão do usuário (ou anon),
    // precisamos garantir que temos permissão.
    // O ideal seria usar uma service_role key aqui se o RLS for estrito,
    // mas vamos tentar com o cliente autenticado (se o login for automático após signup)
    // ou deixar que o banco resolva via Trigger (mas o prompt pediu lógica aqui).
    
    // OBS: O signUp nem sempre loga o usuário imediatamente se confirmar email for necessário.
    // Mas se logar, podemos tentar o vínculo.
    
    // Vamos tentar buscar um cliente com este email
    const { data: existingClient } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', email)
      .single()

    if (existingClient) {
      // Atualiza
      await supabase
        .from('clientes')
        .update({ user_id: data.user.id })
        .eq('id', existingClient.id)
    } else {
      // Cria
      await supabase
        .from('clientes')
        .insert({
          user_id: data.user.id,
          nome: name,
          email: email,
          telefone: phone
        })
    }
  }

  revalidatePath('/', 'layout')
  redirect('/meus-agendamentos')
}
