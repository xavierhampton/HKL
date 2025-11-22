import { useState } from 'react'
import { ModList } from './components/ModList'
import { ModInstaller } from './components/ModInstaller'
import { Input } from './components/ui/input'
import { Search, Package, Boxes } from 'lucide-react'

type TabType = 'mods' | 'packs'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('mods')

  return (
    <div className="h-screen flex bg-background">
      <aside className="w-64 border-r border-border/40 flex flex-col">
        <div className="p-4 border-b border-border/40">
          <h1 className="text-xl font-bold">HKL</h1>
        </div>

        <nav className="flex-1 p-3">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('mods')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'mods'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Boxes className="h-4 w-4" />
              Mods
            </button>
            <button
              onClick={() => setActiveTab('packs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'packs'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Package className="h-4 w-4" />
              Packs
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-border/40">
          <ModInstaller />
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="border-b border-border/40 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/40"
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <ModList searchQuery={searchQuery} type={activeTab} />
        </div>
      </main>
    </div>
  )
}
