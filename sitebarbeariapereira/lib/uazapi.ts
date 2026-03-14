import { createClient } from './supabase/server'

interface SendMessageProps {
  phone: string
  message: string
}

const UAZAPI_URL = process.env.UAZAPI_URL || 'https://tectonny.uazapi.com'
const UAZAPI_TOKEN = process.env.UAZAPI_TOKEN || 'c26ec12d-d11e-4181-9b4c-b7b8b5506ec5'

export async function sendWhatsAppNotification({ phone, message }: SendMessageProps) {
  if (!UAZAPI_URL || !UAZAPI_TOKEN) {
    console.warn('Uazapi credentials not found in environment variables')
    return { success: false, error: 'Missing credentials' }
  }

  // Formata o telefone: remove tudo que não é dígito e garante 55 no início se não tiver
  let cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    // Assume BR se não tiver DDI
    cleanPhone = '55' + cleanPhone
  }

  try {
    // Endpoint correto descoberto via fluxo n8n: /send/text
    // Payload simplificado: { number, text }
    // Header: { token } em vez de { apikey } ou { Authorization }
    
    // O n8n usa: https://tectonny.uazapi.com/send/text
    const response = await fetch(`${UAZAPI_URL}/send/text`, {
      method: 'POST',
      headers: {
        'token': UAZAPI_TOKEN, // Nome do header específico desta versão
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Uazapi Error:', data)
      return { success: false, error: data }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Uazapi Request Failed:', error)
    return { success: false, error }
  }
}
