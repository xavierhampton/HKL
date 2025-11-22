import { useState } from 'react'
import { ModList } from './components/ModList'
import { ModInstaller } from './components/ModInstaller'
import { Input } from './components/ui/input'
import { Search } from 'lucide-react'

type FilterType = 'all' | 'enabled' | 'installed'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight">HKL</h1>
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
            {(['all', 'enabled', 'installed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === f
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
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
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto p-4">
          <ModList searchQuery={searchQuery} filter={filter} />
        </main>
        <aside className="w-80 border-l border-border/40 p-4 overflow-auto">
          <ModInstaller />
        </aside>
      </div>
    </div>
  )
}
