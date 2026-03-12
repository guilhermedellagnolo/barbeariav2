
import { AlertTriangle, Clock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ManutencaoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-white text-center">
      <div className="bg-amber-500/10 p-4 rounded-full mb-6">
        <AlertTriangle className="size-12 text-amber-500" />
      </div>
      
      <h1 className="text-3xl font-bold mb-2">Barbearia Indisponível</h1>
      <p className="text-zinc-400 max-w-md mb-8">
        No momento, esta barbearia está temporariamente indisponível ou em manutenção.
        Por favor, tente novamente mais tarde.
      </p>

      <div className="space-y-4 w-full max-w-xs">
        <Button 
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white gap-2"
          onClick={() => window.location.reload()}
        >
          <Clock className="size-4" />
          Tentar Novamente
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white gap-2"
          asChild
        >
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
            <Phone className="size-4" />
            Entrar em Contato
          </a>
        </Button>
      </div>

      <p className="fixed bottom-8 text-xs text-zinc-600">
        Plataforma T3 Barber
      </p>
    </div>
  )
}
