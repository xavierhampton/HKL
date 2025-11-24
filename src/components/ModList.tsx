import { useState } from 'react'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Trash2, ExternalLink } from 'lucide-react'

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
}

const mockMods: Mod[] = [
  {
    id: '1',
    name: 'Custom Knight',
    description: 'Customize the appearance of the Knight',
    version: '1.5.0',
    author: 'PrashantMohta',
    enabled: true,
    installed: true,
    type: 'mod',
    githubUrl: 'https://github.com/PrashantMohta/HollowKnight.CustomKnight',
    dependencies: ['Satchel', 'Vasi'],
    integrations: [],
  },
  {
    id: '2',
    name: 'QoL',
    description: 'Quality of life improvements',
    version: '4.3.1',
    author: 'fifty-six',
    enabled: true,
    installed: true,
    type: 'mod',
    githubUrl: 'https://github.com/fifty-six/HollowKnight.QoL',
    dependencies: [],
    integrations: ['Randomizer 4'],
  },
  {
    id: '3',
    name: 'Randomizer 4',
    description: 'Randomize item locations',
    version: '4.1.0',
    author: 'homothetyhk',
    enabled: false,
    installed: true,
    type: 'mod',
    githubUrl: 'https://github.com/homothetyhk/RandomizerMod',
    dependencies: ['MenuChanger', 'ItemChanger'],
    integrations: ['Benchwarp', 'QoL'],
  },
  {
    id: '4',
    name: 'Benchwarp',
    description: 'Fast travel between benches',
    version: '2.1.3',
    author: 'homothetyhk',
    enabled: false,
    installed: true,
    type: 'mod',
    githubUrl: 'https://github.com/homothetyhk/HollowKnight.BenchwarpMod',
    dependencies: [],
    integrations: ['Randomizer 4'],
  },
  {
    id: '5',
    name: 'Speedrun Pack',
    description: 'Essential mods for speedrunning',
    version: '1.0.0',
    author: 'Community',
    enabled: false,
    installed: true,
    type: 'modpack',
    githubUrl: 'https://github.com/community/speedrun-pack',
    dependencies: ['QoL', 'Benchwarp'],
    integrations: [],
  },
  {
    id: '6',
    name: 'Rando Complete',
    description: 'Full randomizer experience with QoL',
    version: '2.0.1',
    author: 'Community',
    enabled: true,
    installed: true,
    type: 'modpack',
    githubUrl: 'https://github.com/community/rando-complete',
    dependencies: ['Randomizer 4', 'QoL', 'Benchwarp'],
    integrations: ['Custom Knight'],
  },
]

export function ModList({ searchQuery, type, filter }: { searchQuery: string; type: TabType; filter: FilterType }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredMods = mockMods
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
                >
                  <Trash2 className="h-4 w-4" />
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

                {mod.githubUrl && mod.type === 'mod' && (
                  <div className="flex gap-3">
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
