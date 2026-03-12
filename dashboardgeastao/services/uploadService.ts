/**
 * Upload Service - Faz upload de imagens via API route (server-side)
 * Usa o service role key no server para bypass de RLS do Storage
 */

/**
 * Faz upload de uma imagem via API route.
 * Retorna a URL pública da imagem.
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("path", path)

  const res = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
  })

  const result = await res.json()

  if (!res.ok) {
    throw new Error(result.error || "Erro ao fazer upload")
  }

  return result.url
}

/**
 * Faz upload da foto de fundo da barbearia.
 * Recomendado: 1920x1080 ou similar (16:9)
 */
export async function uploadFotoFundo(file: File, barbeariaSlug: string): Promise<string> {
  return uploadImage(file, `${barbeariaSlug}/fundo`)
}

/**
 * Faz upload da foto do barbeiro.
 * Recomendado: 400x400 (quadrada)
 */
export async function uploadFotoBarbeiro(file: File, barbeariaSlug: string, barbeiroNome: string): Promise<string> {
  const safeName = barbeiroNome.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  return uploadImage(file, `${barbeariaSlug}/barbeiros/${safeName}`)
}

/**
 * Faz upload de uma foto da galeria.
 * Recomendado: 800x600 ou 4:3
 */
export async function uploadFotoGaleria(file: File, barbeariaSlug: string, index: number): Promise<string> {
  return uploadImage(file, `${barbeariaSlug}/galeria/${index}`)
}
