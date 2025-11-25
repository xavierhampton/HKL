import { useState, useEffect } from 'react'
import { ModList } from './components/ModList'
import { Settings } from './components/Settings'
import { TitleBar } from './components/TitleBar'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Search, Package, Boxes, Settings as SettingsIcon, Play, AlertCircle } from 'lucide-react'
import { parseModLinks } from './utils/modLinksParser'

const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer

type TabType = 'mods' | 'packs' | 'settings'
type FilterType = 'all' | 'enabled' | 'installed'

export interface Mod {
  id: string
  name: string
  description: string
  version: string
  author: string
  enabled: boolean
  installed: boolean
  type: 'mod' | 'modpack'
  githubUrl?: string
  dependencies?: string[]
  integrations?: string[]
  hasUpdate?: boolean
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('mods')
  const [filter, setFilter] = useState<FilterType>('all')
  const [gameDirectory, setGameDirectory] = useState('')
  const [mods, setMods] = useState<Mod[]>([])

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-game-directory').then((dir: string) => {
        setGameDirectory(dir)
      })

      const handleDirectoryUpdate = (_event: any, dir: string) => {
        setGameDirectory(dir)
      }

      ipcRenderer.on('game-directory-updated', handleDirectoryUpdate)

      return () => {
        ipcRenderer.removeListener('game-directory-updated', handleDirectoryUpdate)
      }
    }
  }, [])

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-modlinks').then((xmlContent: string) => {
        const modLinks = parseModLinks(xmlContent)

        const parsedMods: Mod[] = modLinks.map((modLink, index) => {
          const author = modLink.repository
            ? modLink.repository.split('/').slice(-2, -1)[0] || 'Unknown'
            : 'Unknown'

          return {
            id: `${index}`,
            name: modLink.name,
            description: modLink.description || 'No description available',
            version: modLink.version,
            author: author,
            enabled: false,
            installed: false,
            type: 'mod' as const,
            githubUrl: modLink.repository || undefined,
            dependencies: modLink.dependencies || [],
            integrations: [],
            hasUpdate: false,
          }
        })

        setMods(parsedMods)
      })
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 min-w-64 flex-shrink-0 border-r border-border/40 flex flex-col">
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
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </button>
            </div>
          </nav>

          <div className="p-3 border-t border-border/40">
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/80"
              disabled={!gameDirectory}
            >
              <Play className="h-4 w-4 mr-2" />
              Launch Game
            </Button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {activeTab !== 'settings' && (
            <header className="border-b border-border/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
                  {(['all', 'enabled', 'installed'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`w-20 px-2.5 py-1 text-xs rounded transition-colors ${
                        filter === f
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {activeTab === 'packs' && (
                    <Button variant="outline" size="sm" disabled={!gameDirectory}>
                      Create Pack
                    </Button>
                  )}
                  <Button variant="outline" size="sm" disabled={!gameDirectory}>
                    Disable All
                  </Button>
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
          )}

          <div className="flex-1 overflow-auto">
            {activeTab === 'settings' ? (
              <Settings />
            ) : (
              <div className="p-4 space-y-3">
                {!gameDirectory && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-sm text-destructive">No game directory set. Go to Settings to select your Hollow Knight directory.</span>
                  </div>
                )}
                <ModList searchQuery={searchQuery} type={activeTab} filter={filter} gameDirectory={gameDirectory} mods={mods} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
