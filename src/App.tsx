import { LiquidCard } from "@/components/LiquidCard"
import { Play, SkipForward, SkipBack, Heart } from "lucide-react"

function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-10 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <LiquidCard className="flex flex-col items-center text-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-yellow-400 to-orange-500 shadow-lg mb-2 animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold">Liquid Vibes</h2>
            <p className="text-white/70">Apple Music Hits</p>
          </div>

          <div className="flex items-center gap-6 mt-2">
            <SkipBack className="w-8 h-8 fill-white/20 hover:fill-white cursor-pointer" />
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md shadow-inner hover:scale-105 transition-transform cursor-pointer">
              <Play className="w-8 h-8 fill-white ml-1" />
            </div>
            <SkipForward className="w-8 h-8 fill-white/20 hover:fill-white cursor-pointer" />
          </div>
        </LiquidCard>

        <div className="flex flex-col gap-6">
          <LiquidCard className="flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-blue-500/80 rounded-full shadow-lg">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <span className="text-3xl font-bold">26°</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Health</h3>
              <p className="text-sm text-white/60">Heart rate normal</p>
            </div>
          </LiquidCard>

          <LiquidCard className="h-32 flex items-center justify-between px-8">
            <span>Wi-Fi</span>
            <div className="w-12 h-6 bg-green-400 rounded-full relative shadow-inner">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
            </div>
          </LiquidCard>
        </div>
      </div>
    </div>
  )
}

export default App