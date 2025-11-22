import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Download, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

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
        <Card key={mod.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{mod.name}</CardTitle>
                  <Badge variant="secondary">{mod.version}</Badge>
                  {mod.enabled && <Badge variant="default">Enabled</Badge>}
                </div>
                <CardDescription className="mt-1">{mod.description}</CardDescription>
                <p className="text-sm text-muted-foreground mt-1">by {mod.author}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
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
              <Button variant="destructive" size="sm">
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
