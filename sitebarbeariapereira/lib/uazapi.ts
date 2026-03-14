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
    // Endpoint correto da Uazapi/Evolution API v1.x/v2.x
    // Ajuste para evitar erro 405 (Method Not Allowed)
    const response = await fetch(`${UAZAPI_URL}/message/sendText/barbearias`, {
      method: 'POST',
      headers: {
        'apikey': UAZAPI_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanPhone,
        options: {
          delay: 1000,
          presence: "composing",
          linkPreview: false
        },
        textMessage: {
          text: message
        }
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
