import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Usa service role key para bypass de RLS no Storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = "barbearias"
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const path = formData.get("path") as string | null

    if (!file || !path) {
      return NextResponse.json(
        { error: "Arquivo e caminho são obrigatórios" },
        { status: 400 }
      )
    }

    // Validações
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use JPEG, PNG ou WebP." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 5MB." },
        { status: 400 }
      )
    }

    // Gera caminho único
    const ext = file.name.split(".").pop() || "jpg"
    const uniquePath = `${path}-${Date.now()}.${ext}`

    // Converte File para Buffer para upload no server
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(uniquePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      })

    if (error) {
      console.error("[Upload] Storage error:", error)
      return NextResponse.json(
        { error: `Erro no upload: ${error.message}` },
        { status: 500 }
      )
    }

    // Retorna URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error: any) {
    console.error("[Upload] Server error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
