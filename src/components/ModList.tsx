import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Trash2 } from 'lucide-react'

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
  },
]

export function ModList({ searchQuery, type, filter }: { searchQuery: string; type: TabType; filter: FilterType }) {
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
      {filteredMods.map((mod) => (
        <div
          key={mod.id}
          className="group flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/20 hover:bg-card/40 transition-colors"
        >
          <Switch checked={mod.enabled} className="flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="font-medium truncate">{mod.name}</h3>
              <span className="text-xs text-muted-foreground flex-shrink-0">{mod.version}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{mod.description}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
