import { useState } from 'react'
import { ModList } from './components/ModList'
import { ModInstaller } from './components/ModInstaller'
import { Input } from './components/ui/input'
import { Search } from 'lucide-react'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold mb-4">Hollow Knight Mod Manager</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <ModList searchQuery={searchQuery} />
        </main>
        <aside className="w-80 border-l p-6 overflow-auto">
          <ModInstaller />
        </aside>
      </div>
    </div>
  )
}
