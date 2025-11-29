import { useState, useEffect, useCallback } from 'react'
import { ModList } from './components/ModList'
import { Settings } from './components/Settings'
import { TitleBar } from './components/TitleBar'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Search, Package, Boxes, Settings as SettingsIcon, Play, AlertCircle, RefreshCw } from 'lucide-react'
import { parseModLinks } from './utils/modLinksParser'
import { Toaster, toast } from 'sonner'
import { CreatePackDialog } from './components/CreatePackDialog'
import { ImportPackDialog } from './components/ImportPackDialog'

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
  downloadUrl?: string
  sha256?: string
  mods?: string[]
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('mods')
  const [filter, setFilter] = useState<FilterType>('all')
  const [gameDirectory, setGameDirectory] = useState('')
  const [mods, setMods] = useState<Mod[]>([])
  const [hklError, setHklError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showCreatePackDialog, setShowCreatePackDialog] = useState(false)
  const [showImportPackDialog, setShowImportPackDialog] = useState(false)
  const [vanillaMode, setVanillaMode] = useState(false)

  const handleLaunchGame = async () => {
    if (ipcRenderer) {
      try {
        const result = await ipcRenderer.invoke('launch-game')
        if (!result.success) {
          toast.error(`Failed to launch game: ${result.error}`)
        } else {
          toast.success(`Game launched in ${vanillaMode ? 'vanilla' : 'modded'} mode`)
        }
      } catch (error) {
        toast.error(`Failed to launch game: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleVanillaModeChange = async (enabled: boolean) => {
    if (ipcRenderer) {
      try {
        const result = await ipcRenderer.invoke('set-vanilla-mode', enabled)
        if (result.success) {
          setVanillaMode(enabled)
          toast.success(`Switched to ${enabled ? 'vanilla' : 'modded'} mode`)
        } else {
          toast.error(`Failed to switch mode: ${result.error}`)
        }
      } catch (error) {
        toast.error(`Failed to switch mode: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleDisableAll = async () => {
    if (!ipcRenderer) return

    const enabledMods = mods.filter(m =>
      m.type === (activeTab === 'mods' ? 'mod' : 'modpack') &&
      m.enabled
    )

    if (enabledMods.length === 0) {
      toast.info('No enabled mods to disable')
      return
    }

    // Show toast confirmation
    toast.warning(`Disable all ${enabledMods.length} enabled mods?`, {
      duration: 10000,
      action: {
        label: 'Disable',
        onClick: async () => {
          setIsInstalling(true)

          // Use batch toggle for better performance
          const changes = enabledMods.map(mod => ({ modName: mod.name, enabled: false }))
          const result = await ipcRenderer.invoke('batch-toggle-mods', changes)

          const successCount = result.success ? enabledMods.length : 0
          const failCount = result.success ? 0 : enabledMods.length

          setIsInstalling(false)
          await new Promise(resolve => setTimeout(resolve, 100))
          loadMods()

          if (failCount === 0) {
            toast.success(`Disabled ${successCount} mods`)
          } else {
            toast.warning(`Disabled ${successCount} mods, ${failCount} failed`)
          }
        }
      }
    })
  }

  const handleUpdateAll = async () => {
    if (!ipcRenderer) return

    const modsToUpdate = mods.filter(m => m.type === 'mod' && m.hasUpdate && m.installed)

    if (modsToUpdate.length === 0) {
      toast.info('No mods to update')
      return
    }

    // Show toast confirmation
    toast.warning(`Update all ${modsToUpdate.length} mods?`, {
      duration: 10000,
      action: {
        label: 'Update',
        onClick: async () => {
          setIsInstalling(true)
          let successCount = 0
          let failCount = 0

          for (const mod of modsToUpdate) {
            try {
              if (!mod.downloadUrl) {
                failCount++
                continue
              }

              const result = await ipcRenderer.invoke('install-mod', {
                name: mod.name,
                version: mod.version,
                downloadUrl: mod.downloadUrl,
                sha256: mod.sha256,
              })

              if (result.success) {
                successCount++
              } else {
                failCount++
              }
            } catch (error) {
              failCount++
            }
          }

          setIsInstalling(false)
          await new Promise(resolve => setTimeout(resolve, 100))
          loadMods()

          if (failCount === 0) {
            toast.success(`Updated ${successCount} mods`)
          } else {
            toast.warning(`Updated ${successCount} mods, ${failCount} failed`)
          }
        }
      }
    })
  }

  const handleCreatePack = async (name: string, description: string, author: string) => {
    if (!ipcRenderer) return

    const enabledMods = mods
      .filter(m => m.type === 'mod' && m.enabled)
      .map(m => m.name)

    if (enabledMods.length === 0) {
      toast.error('No enabled mods to create a pack from')
      return
    }

    try {
      const result = await ipcRenderer.invoke('create-pack', {
        name,
        description,
        author,
        mods: enabledMods
      })

      if (result.success) {
        toast.success(`Pack "${name}" created with ${enabledMods.length} mods`)
        loadMods()
      } else {
        toast.error(`Failed to create pack: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Failed to create pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleImportPack = async (code: string) => {
    if (!ipcRenderer) return

    try {
      const result = await ipcRenderer.invoke('import-pack', code)

      if (result.success) {
        toast.success(`Pack "${result.packName}" imported successfully!`)
        loadMods()
      } else {
        toast.error(`Failed to import pack: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Failed to import pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-game-directory').then((dir: string) => {
        setGameDirectory(dir)

        // Check HKL directory if game directory is set
        if (dir) {
          ipcRenderer.invoke('ensure-hkl-directory').then((result: { success: boolean; error?: string }) => {
            if (!result.success) {
              setHklError(result.error || 'Failed to create HKL directory')
            } else {
              setHklError(null)
            }
          })

          // Load mods after we have the game directory
          loadMods()
        }
      })

      // Load vanilla mode state
      ipcRenderer.invoke('get-vanilla-mode').then((isVanilla: boolean) => {
        setVanillaMode(isVanilla)
      })

      const handleDirectoryUpdate = (_event: any, dir: string) => {
        setGameDirectory(dir)

        // Check HKL directory when directory is updated
        if (dir) {
          ipcRenderer.invoke('ensure-hkl-directory').then((result: { success: boolean; error?: string }) => {
            if (!result.success) {
              setHklError(result.error || 'Failed to create HKL directory')
            } else {
              setHklError(null)
            }
          })

          // Load mods when directory changes
          loadMods()
        }
      }

      ipcRenderer.on('game-directory-updated', handleDirectoryUpdate)

      return () => {
        ipcRenderer.removeListener('game-directory-updated', handleDirectoryUpdate)
      }
    }
  }, [])

  const loadMods = useCallback(async () => {
    if (!ipcRenderer) return

    const xmlContent = await ipcRenderer.invoke('get-modlinks')
    const installedModsData = await ipcRenderer.invoke('get-installed-mods')
    const packsData = await ipcRenderer.invoke('get-packs')

    const modLinks = parseModLinks(xmlContent)
    const installedMods = installedModsData?.InstalledMods?.Mods || {}
    const packs = packsData?.Packs || {}
    const activePack = packsData?.activePack || null

    const parsedMods: Mod[] = modLinks.map((modLink, index) => {
      const author = modLink.repository
        ? modLink.repository.split('/').slice(-2, -1)[0] || 'Unknown'
        : 'Unknown'

      // Use the first link for download (if available)
      const downloadLink = modLink.links && modLink.links.length > 0 ? modLink.links[0] : null

      // Check if mod is installed
      const isInstalled = modLink.name in installedMods
      const installedInfo = installedMods[modLink.name]

      // Check for version mismatch (update available) - only if both versions exist
      const hasUpdate = isInstalled &&
        modLink.version &&
        installedInfo.Version &&
        installedInfo.Version !== modLink.version

      return {
        id: `mod-${index}`,
        name: modLink.name,
        description: modLink.description || 'No description available',
        version: modLink.version,
        author: author,
        enabled: isInstalled ? installedInfo.Enabled : false,
        installed: isInstalled,
        type: 'mod' as const,
        githubUrl: modLink.repository || undefined,
        dependencies: modLink.dependencies || [],
        integrations: [],
        hasUpdate: hasUpdate,
        downloadUrl: downloadLink?.URL || undefined,
        sha256: downloadLink?.SHA256 || undefined,
      }
    })

    // Add packs
    const parsedPacks: Mod[] = Object.values(packs).map((pack: any, index) => {
      // Check if all mods in pack are installed
      const allModsInstalled = pack.mods.every((modName: string) => modName in installedMods)

      // Pack is enabled only if it's the active pack
      const isEnabled = activePack === pack.name

      return {
        id: `pack-${index}`,
        name: pack.name,
        description: pack.description,
        version: `${pack.mods.length} mods`,
        author: pack.author,
        enabled: isEnabled,
        installed: allModsInstalled,
        type: 'modpack' as const,
        dependencies: pack.mods,
        mods: pack.mods,
      }
    })

    setMods([...parsedMods, ...parsedPacks])
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toaster position="bottom-right" visibleToasts={1} />
      <TitleBar />

      {showCreatePackDialog && (
        <CreatePackDialog
          onClose={() => setShowCreatePackDialog(false)}
          onCreatePack={handleCreatePack}
          enabledModsCount={mods.filter(m => m.type === 'mod' && m.enabled).length}
        />
      )}

      {showImportPackDialog && (
        <ImportPackDialog
          onClose={() => setShowImportPackDialog(false)}
          onImportPack={handleImportPack}
        />
      )}

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
            <div className="relative">
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/80"
                disabled={!gameDirectory || isInstalling}
                onClick={handleLaunchGame}
              >
                <Play className="h-4 w-4 mr-2" />
                {vanillaMode ? 'Play Vanilla' : 'Play Modded'}
              </Button>
              <button
                onClick={() => handleVanillaModeChange(!vanillaMode)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted hover:bg-accent transition-colors flex items-center justify-center"
                title={`Switch to ${vanillaMode ? 'modded' : 'vanilla'} mode`}
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {activeTab !== 'settings' && (
            <header className="border-b border-border/40 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
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
                  <span className="text-xs text-muted-foreground">
                    {mods.filter(m => m.type === (activeTab === 'mods' ? 'mod' : 'modpack') && m.enabled).length} / {mods.filter(m => m.type === (activeTab === 'mods' ? 'mod' : 'modpack')).length}
                  </span>
                </div>
                <div className="flex gap-2">
                  {activeTab === 'packs' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!gameDirectory}
                        onClick={() => setShowImportPackDialog(true)}
                      >
                        Import Pack
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!gameDirectory}
                        onClick={() => setShowCreatePackDialog(true)}
                      >
                        Create Pack
                      </Button>
                    </>
                  )}
                  {activeTab === 'mods' && (
                    <>
                      {mods.some(m => m.type === 'mod' && m.hasUpdate && m.installed) && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!gameDirectory || isInstalling}
                          onClick={handleUpdateAll}
                        >
                          Update All
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!gameDirectory || isInstalling}
                        onClick={handleDisableAll}
                      >
                        Disable All
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  key="search-input"
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
                {hklError && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-sm text-destructive">{hklError}</span>
                  </div>
                )}
                <ModList
                  searchQuery={searchQuery}
                  type={activeTab}
                  filter={filter}
                  gameDirectory={gameDirectory}
                  mods={mods}
                  onInstallStart={() => setIsInstalling(true)}
                  onInstallComplete={() => {
                    setIsInstalling(false)
                    loadMods()
                  }}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
