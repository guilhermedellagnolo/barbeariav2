"use client"

import { useState, useEffect, useCallback } from "react"
import { BarbeariasList } from "@/components/barbearias-list"
import { BarbeariaDetails } from "@/components/barbearia-details"
import { NovaBarbeariaWizard } from "@/components/nova-barbearia-wizard"
import {
  fetchBarbearias,
  updateBarbearia,
  createBarbearia,
  toggleAtivo,
} from "@/services/barbeariaService"
import type { Barbearia, NovaBarbearia } from "@/lib/types"
import { Scissors, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type View = "list" | "details" | "new"

export default function Dashboard() {
  const [barbearias, setBarbearias] = useState<Barbearia[]>([])
  const [currentView, setCurrentView] = useState<View>("list")
  const [selectedBarbearia, setSelectedBarbearia] = useState<Barbearia | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadBarbearias = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchBarbearias()
      setBarbearias(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBarbearias()
  }, [loadBarbearias])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectBarbearia = (barbearia: Barbearia) => {
    setSelectedBarbearia(barbearia)
    setCurrentView("details")
  }

  const handleBack = () => {
    setCurrentView("list")
    setSelectedBarbearia(null)
  }

  const handleNewBarbearia = () => {
    setCurrentView("new")
  }

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      // Optimistic update
      setBarbearias((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ativo } : b))
      )
      await toggleAtivo(id, ativo)
    } catch (err) {
      // Revert on failure
      setBarbearias((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ativo: !ativo } : b))
      )
      setError(err instanceof Error ? err.message : "Erro ao alterar status")
    }
  }

  const handleSaveBarbearia = async (updated: Barbearia) => {
    try {
      setSaving(true)
      await updateBarbearia(updated)
      // Recarregar para pegar dados frescos (IDs reais de novos barbeiros, etc)
      await loadBarbearias()
      handleBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateBarbearia = async (newData: NovaBarbearia) => {
    try {
      setSaving(true)
      await createBarbearia(newData)
      await loadBarbearias()
      handleBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar barbearia")
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-foreground">
              <Scissors className="size-5 text-background" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">BarberSaaS</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Admin</span>
            <div className="size-8 rounded-full bg-muted" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="size-5 text-destructive shrink-0" />
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-destructive"
            >
              Fechar
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando barbearias...</p>
          </div>
        )}

        {/* Empty + Error State */}
        {!loading && error && barbearias.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="size-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nao foi possivel carregar os dados</p>
            <Button variant="outline" onClick={loadBarbearias} className="gap-2">
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {currentView === "list" && (
              <BarbeariasList
                barbearias={barbearias}
                onSelectBarbearia={handleSelectBarbearia}
                onNewBarbearia={handleNewBarbearia}
                onToggleAtivo={handleToggleAtivo}
              />
            )}
            {currentView === "details" && selectedBarbearia && (
              <BarbeariaDetails
                barbearia={selectedBarbearia}
                onBack={handleBack}
                onSave={handleSaveBarbearia}
                saving={saving}
              />
            )}
            {currentView === "new" && (
              <NovaBarbeariaWizard
                onBack={handleBack}
                onCreate={handleCreateBarbearia}
                saving={saving}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
