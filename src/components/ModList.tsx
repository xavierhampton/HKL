import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Trash2, Power, Package } from 'lucide-react'

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
    name: 'Speedrun Pack',
    description: 'Essential mods for speedrunning',
    version: '1.0.0',
    author: 'Community',
    enabled: false,
    installed: true,
    type: 'modpack',
  },
]

export function ModList({ searchQuery, filter }: { searchQuery: string; filter: FilterType }) {
  const filteredMods = mockMods
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
    <div className="space-y-3">
      {filteredMods.map((mod) => (
        <Card
          key={mod.id}
          className="bg-card/40 border-border/40 hover:border-border transition-all"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {mod.type === 'modpack' && (
                    <Package className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  )}
                  <CardTitle className="text-base truncate">{mod.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {mod.version}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{mod.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{mod.author}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 ${mod.enabled ? 'text-purple-400' : 'text-muted-foreground'}`}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
