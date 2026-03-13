import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Precisa da service role para criar usuário sem confirmar email

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERRO: Variáveis de ambiente faltando.')
  console.error('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminUser() {
  const email = 'guilherme.delagnolo@gmail.com'
  const password = '1234Gui.'

  console.log(`Tentando criar usuário admin: ${email}...`)

  // 1. Tenta criar o usuário
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Já confirma o email automaticamente
  })

  if (error) {
    console.error('❌ Erro ao criar usuário:', error.message)
    if (error.message.includes('already registered')) {
        console.log('⚠️  O usuário já existe. Tente fazer login ou resetar a senha no painel do Supabase.')
    }
  } else {
    console.log('✅ Usuário ADMIN criado com sucesso!')
    console.log('ID do Usuário:', data.user.id)
    console.log('Agora você pode fazer login no Dashboard.')
  }
}

createAdminUser()