"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value: string // URL atual
  onChange: (url: string) => void
  onUpload: (file: File) => Promise<string> // Função de upload que retorna URL
  label?: string
  hint?: string // Ex: "Recomendado: 1920x1080"
  aspectRatio?: "video" | "square" | "auto" // 16:9, 1:1, ou livre
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  label,
  hint,
  aspectRatio = "auto",
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const aspectClasses = {
    video: "aspect-video",   // 16:9
    square: "aspect-square", // 1:1
    auto: "min-h-[120px]",   // Livre
  }

  const handleFile = async (file: File) => {
    setError("")

    // Validações
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são permitidas (JPEG, PNG, WebP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5MB")
      return
    }

    setUploading(true)
    try {
      const url = await onUpload(file)
      onChange(url)
    } catch (err: any) {
      setError(err.message || "Erro ao fazer upload")
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input para permitir re-upload do mesmo arquivo
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    onChange("")
    setError("")
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      {value ? (
        // Preview da imagem
        <div className={cn("relative rounded-lg overflow-hidden border border-border bg-muted", aspectClasses[aspectRatio])}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            title="Remover imagem"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        // Upload area
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all",
            aspectClasses[aspectRatio],
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/50",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-8 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Enviando...</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-3">
                <ImageIcon className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Clique ou arraste uma imagem
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG ou WebP (máx. 5MB)
              </p>
              {hint && (
                <p className="text-xs text-muted-foreground/70 mt-1">{hint}</p>
              )}
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
