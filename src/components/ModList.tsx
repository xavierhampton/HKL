import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Download, Trash2, ToggleLeft, ToggleRight, User } from 'lucide-react'

interface Mod {
  id: string
  name: string
  description: string
  version: string
  author: string
  enabled: boolean
  installed: boolean
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
  },
  {
    id: '2',
    name: 'QoL',
    description: 'Quality of life improvements',
    version: '4.3.1',
    author: 'fifty-six',
    enabled: true,
    installed: true,
  },
  {
    id: '3',
    name: 'Randomizer 4',
    description: 'Randomize item locations',
    version: '4.1.0',
    author: 'homothetyhk',
    enabled: false,
    installed: true,
  },
]

export function ModList({ searchQuery }: { searchQuery: string }) {
  const filteredMods = mockMods.filter(
    (mod) =>
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {filteredMods.map((mod) => (
        <Card
          key={mod.id}
          className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-purple-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl font-bold">{mod.name}</CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-muted/50 text-muted-foreground border border-border/40"
                  >
                    v{mod.version}
                  </Badge>
                  {mod.enabled && (
                    <Badge
                      className="bg-gradient-to-r from-purple-500 to-blue-600 text-white border-0"
                    >
                      Active
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2 text-base">{mod.description}</CardDescription>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{mod.author}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={mod.enabled ? "border-purple-500/30 hover:bg-purple-500/10" : ""}
              >
                {mod.enabled ? (
                  <>
                    <ToggleRight className="h-4 w-4 mr-2" />
                    Disable
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Enable
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-destructive/80 hover:bg-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Uninstall
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
