import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Menu, Scissors, Star } from "lucide-react"

interface LivePreviewMockupProps {
  nome: string
  slogan: string
  fotoFundo: string
  endereco: string
  telefone: string
  horarios: string
  descricaoHero: string
}

export function LivePreviewMockup({
  nome,
  slogan,
  fotoFundo,
  endereco,
  telefone,
  horarios,
  descricaoHero,
}: LivePreviewMockupProps) {
  // Cores baseadas no tema "dark" padrão da barbearia (preto/dourado/branco)
  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-muted/20">
      {/* Moldura do Celular */}
      <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] shadow-2xl border-[8px] border-zinc-800 overflow-hidden flex flex-col">
        {/* Notch / Status Bar Fake */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-zinc-800 z-50 flex justify-center">
            <div className="w-32 h-5 bg-black rounded-b-xl"></div>
        </div>

        {/* Conteúdo do Site (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 text-white scrollbar-hide">
          
          {/* Header Transparente */}
          <div className="absolute top-8 left-0 right-0 px-4 py-3 flex justify-between items-center z-40">
            <div className="text-sm font-bold tracking-tighter text-amber-500 uppercase">
                {nome || "Barbearia"}
            </div>
            <Menu className="w-5 h-5 text-white" />
          </div>

          {/* Hero Section com Foto de Fundo */}
          <div className="relative h-[65%] w-full flex items-center justify-center text-center px-4">
            {/* Imagem de Fundo com Overlay */}
            <div className="absolute inset-0 z-0">
                {fotoFundo ? (
                    <img src={fotoFundo} alt="Fundo" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                        <span className="text-xs">Sem foto</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
            </div>

            {/* Texto Hero */}
            <div className="relative z-10 pt-16">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-medium mb-3">
                    <Star className="w-3 h-3 fill-amber-500" />
                    {slogan || "Seu estilo, nossa tradição"}
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2 leading-tight">
                    {nome ? (
                        <>
                            {nome.split(" ")[0]} <span className="text-amber-500">{nome.split(" ").slice(1).join(" ")}</span>
                        </>
                    ) : (
                        <>BARBEARIA <span className="text-amber-500">PREMIUM</span></>
                    )}
                </h1>
                <p className="text-xs text-zinc-300 max-w-[240px] mx-auto mb-6 line-clamp-3">
                    {descricaoHero || "Agende seu horário e renove seu visual com os melhores profissionais da região."}
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[200px] mx-auto">
                    <div className="h-10 bg-amber-500 text-black font-bold text-xs rounded-lg flex items-center justify-center">
                        AGENDAR HORÁRIO
                    </div>
                </div>
            </div>
          </div>

          {/* Informações (Rodapé/Contato) */}
          <div className="px-4 py-6 space-y-4 bg-zinc-950">
             <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">Horários</h3>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                        {horarios || "Seg-Sex: 09h-20h"}
                    </p>
                </div>
             </div>

             <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-white mb-0.5">Localização</h3>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                        {endereco || "Rua Exemplo, 123 - Centro"}
                    </p>
                </div>
             </div>
             
             {/* Galeria Placeholder */}
             <div className="pt-2">
                <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
                    <Scissors className="w-3 h-3 text-amber-500" /> Galeria
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="aspect-square bg-zinc-900 rounded-md border border-zinc-800"></div>
                    ))}
                </div>
             </div>

          </div>

          {/* Bottom Navigation Fake */}
          <div className="sticky bottom-0 left-0 right-0 h-12 bg-zinc-900 border-t border-zinc-800 flex justify-around items-center px-2">
                <div className="flex flex-col items-center gap-0.5">
                    <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                    <div className="w-8 h-1 bg-zinc-700 rounded-full mt-1"></div>
                </div>
          </div>
        </div>
      </div>
      
      <p className="absolute bottom-2 text-[10px] text-muted-foreground">
        Pré-visualização em tempo real (Estilo Mobile)
      </p>
    </div>
  )
}