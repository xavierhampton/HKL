import { useState } from 'react'
import { ModList } from './components/ModList'
import { ModInstaller } from './components/ModInstaller'
import { Input } from './components/ui/input'
import { Search, Sparkles } from 'lucide-react'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            Hollow Knight Mod Manager
          </h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-border/40 focus-visible:border-purple-500/50"
          />
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto p-6 bg-background">
          <ModList searchQuery={searchQuery} />
        </main>
        <aside className="w-96 border-l border-border/40 p-6 overflow-auto bg-card/30 backdrop-blur-sm">
          <ModInstaller />
        </aside>
      </div>
    </div>
  )
}
