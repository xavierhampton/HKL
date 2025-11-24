import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Trash2, ExternalLink } from 'lucide-react'
import { parseModLinks } from '../utils/modLinksParser'

const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer

type TabType = 'mods' | 'packs'
type FilterType = 'all' | 'enabled' | 'installed'

interface Mod {
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

export function ModList({ searchQuery, type, filter, gameDirectory }: { searchQuery: string; type: TabType; filter: FilterType; gameDirectory: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mods, setMods] = useState<Mod[]>([])
  const hasValidDirectory = !!gameDirectory

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-modlinks').then((xmlContent: string) => {
        const modLinks = parseModLinks(xmlContent)

        const parsedMods: Mod[] = modLinks.map((modLink, index) => {
          const author = modLink.repository
            ? modLink.repository.split('/').slice(-2, -1)[0] || 'Unknown'
            : 'Unknown'

          const latestLink = modLink.links[0]
          const version = latestLink?.URL
            ? latestLink.URL.split('/').pop()?.replace('.zip', '') || '1.0.0'
            : '1.0.0'

          return {
            id: `${index}`,
            name: modLink.name,
            description: modLink.description || 'No description available',
            version: version,
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

  const filteredMods = mods
    .filter((mod) => {
      if (type === 'mods') return mod.type === 'mod'
      if (type === 'packs') return mod.type === 'modpack'
      return true
    })
    .filter((mod) => {
      if (filter === 'enabled') return mod.enabled
      if (filter === 'installed') return mod.installed
      return true
    })
    .filter(
      (mod) =>
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.author.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <div className="space-y-2">
      {filteredMods.map((mod) => {
        const isExpanded = expandedId === mod.id
        return (
          <div
            key={mod.id}
            className="rounded-lg border border-border/40 bg-card/20 hover:bg-card/40 transition-colors"
          >
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : mod.id)}
            >
              <Switch
                checked={mod.enabled}
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
                disabled={!hasValidDirectory}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-medium truncate">{mod.name}</h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{mod.version}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{mod.description}</p>
              </div>

              {mod.type === 'modpack' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  disabled={!hasValidDirectory}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {mod.type === 'mod' && !mod.installed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  disabled={!hasValidDirectory}
                >
                  Install
                </Button>
              )}

              {mod.type === 'mod' && mod.installed && mod.hasUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  disabled={!hasValidDirectory}
                >
                  Update
                </Button>
              )}
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Author:</span>
                    <span className="ml-2 text-foreground">{mod.author}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <span className="ml-2 text-foreground">{mod.version}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-0.5">Description</p>
                  <p className="text-sm text-foreground">{mod.description}</p>
                </div>

                {mod.dependencies && mod.dependencies.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-0.5">
                      {mod.type === 'modpack' ? 'Mods' : 'Dependencies'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.dependencies.map((dep, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs rounded-md bg-muted/50 text-foreground border border-border/40"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {mod.integrations && mod.integrations.length > 0 && mod.type === 'mod' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-0.5">Integrations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.integrations.map((int, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs rounded-md bg-muted/50 text-foreground border border-border/40"
                        >
                          {int}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {mod.type === 'mod' && (
                  <div className="flex gap-3">
                    {mod.githubUrl && (
                      <>
                        <a
                          href={mod.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View on GitHub
                        </a>
                        <a
                          href={`${mod.githubUrl}#readme`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View README
                        </a>
                      </>
                    )}
                    {mod.installed && (
                      <button
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                        disabled={!hasValidDirectory}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Uninstall Mod
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
