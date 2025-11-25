import { useState } from 'react'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Trash2, ExternalLink, Share2 } from 'lucide-react'
import { Mod } from '../App'
import { toast } from 'sonner'

const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer

type TabType = 'mods' | 'packs'
type FilterType = 'all' | 'enabled' | 'installed'

export function ModList({
  searchQuery,
  type,
  filter,
  gameDirectory,
  mods,
  onInstallStart,
  onInstallComplete,
}: {
  searchQuery: string
  type: TabType
  filter: FilterType
  gameDirectory: string
  mods: Mod[]
  onInstallStart: () => void
  onInstallComplete: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const hasValidDirectory = !!gameDirectory

  const handleToggleEnabled = async (mod: Mod, enabled: boolean) => {
    // Handle modpack enabling
    if (mod.type === 'modpack') {
      if (enabled) {
        await handleInstallPack(mod)
      } else {
        await handleDisablePack(mod)
      }
      return
    }

    // Handle regular mod enabling
    try {
      const result = await ipcRenderer.invoke('toggle-mod-enabled', mod.name, enabled, mod.dependencies)
      if (result.success) {
        // Small delay to ensure file system writes complete
        await new Promise(resolve => setTimeout(resolve, 100))
        onInstallComplete() // Refresh mod list
      } else {
        toast.error(`Failed to ${enabled ? 'enable' : 'disable'} mod: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} mod: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleInstallPack = async (pack: Mod) => {
    if (!pack.mods || pack.mods.length === 0) return

    setInstalling(pack.id)
    onInstallStart()

    try {
      // Find mods that need to be installed
      const modsToInstall = pack.mods.filter(modName => {
        const modData = mods.find(m => m.name === modName && m.type === 'mod')
        return modData && !modData.installed
      })

      // Show loading toast
      if (modsToInstall.length > 0) {
        toast.loading(`Installing ${modsToInstall.length} mods for pack "${pack.name}"...`, { id: pack.id })
      }

      // Install missing mods
      for (const modName of modsToInstall) {
        const modData = mods.find(m => m.name === modName && m.type === 'mod')
        if (modData && modData.downloadUrl) {
          const dependencies = modData.dependencies && modData.dependencies.length > 0
            ? modData.dependencies.map(depName => {
                const depMod = mods.find(m => m.name === depName)
                if (!depMod || !depMod.downloadUrl) return null
                return {
                  name: depMod.name,
                  version: depMod.version,
                  downloadUrl: depMod.downloadUrl,
                  sha256: depMod.sha256
                }
              }).filter(d => d !== null) as Array<{ name: string; version: string; downloadUrl: string; sha256?: string }>
            : []

          const result = await ipcRenderer.invoke('install-mod', {
            name: modData.name,
            version: modData.version,
            downloadUrl: modData.downloadUrl,
            sha256: modData.sha256,
            dependencies: dependencies
          })

          if (!result.success) {
            toast.error(`Failed to install ${modData.name}: ${result.error}`)
            setInstalling(null)
            onInstallComplete()
            return
          }
        }
      }

      // Collect all changes for batch operation
      const changes: Array<{modName: string, enabled: boolean}> = []

      // Disable ALL other mods (both regular mods and other packs)
      const allEnabledMods = mods.filter(m => m.enabled && m.name !== pack.name)
      for (const mod of allEnabledMods) {
        if (mod.type === 'modpack' && mod.mods) {
          // Disable all mods in the pack
          for (const modName of mod.mods) {
            changes.push({ modName, enabled: false })
          }
        } else if (mod.type === 'mod') {
          // Disable regular mod
          changes.push({ modName: mod.name, enabled: false })
        }
      }

      // Enable all mods in the pack
      for (const modName of pack.mods) {
        changes.push({ modName, enabled: true })
      }

      // Single batch operation instead of multiple disk writes
      await ipcRenderer.invoke('batch-toggle-mods', changes)

      // Set this pack as the active pack
      await ipcRenderer.invoke('set-active-pack', pack.name)

      // Dismiss loading toast and show success
      toast.dismiss(pack.id)
      toast.success(`Pack "${pack.name}" enabled with ${pack.mods.length} mods`)
      onInstallComplete()
    } catch (error) {
      // Dismiss loading toast and show error
      toast.dismiss(pack.id)
      toast.error(`Failed to enable pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
      onInstallComplete()
    } finally {
      setInstalling(null)
    }
  }

  const handleDisablePack = async (pack: Mod) => {
    if (!pack.mods || pack.mods.length === 0) return

    try {
      // Disable all mods in the pack
      for (const modName of pack.mods) {
        await ipcRenderer.invoke('toggle-mod-enabled', modName, false, [])
      }

      // Clear the active pack
      await ipcRenderer.invoke('set-active-pack', null)

      await new Promise(resolve => setTimeout(resolve, 100))
      toast.success(`Pack "${pack.name}" disabled`)
      onInstallComplete()
    } catch (error) {
      toast.error(`Failed to disable pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
      onInstallComplete()
    }
  }

  const handleDeletePack = async (pack: Mod) => {
    toast.warning(`Delete pack "${pack.name}"?`, {
      duration: 10000,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const result = await ipcRenderer.invoke('delete-pack', pack.name)
            if (result.success) {
              toast.success(`Pack "${pack.name}" deleted`)
              onInstallComplete()
            } else {
              toast.error(`Failed to delete pack: ${result.error}`)
            }
          } catch (error) {
            toast.error(`Failed to delete pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
    })
  }

  const handleExportPack = async (pack: Mod) => {
    try {
      const result = await ipcRenderer.invoke('export-pack', pack.name)
      if (result.success) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.code)
        toast.success(`Pack code copied to clipboard!`)
      } else {
        toast.error(`Failed to export pack: ${result.error}`)
      }
    } catch (error) {
      toast.error(`Failed to export pack: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleInstall = async (mod: Mod) => {
    if (!mod.downloadUrl) {
      toast.error('No download URL available for this mod')
      return
    }

    setInstalling(mod.id)
    onInstallStart()

    try {
      // Resolve dependencies - find their download URLs from the mods list
      const dependencies = mod.dependencies && mod.dependencies.length > 0
        ? mod.dependencies.map(depName => {
            const depMod = mods.find(m => m.name === depName)
            if (!depMod || !depMod.downloadUrl) {
              return null
            }
            return {
              name: depMod.name,
              version: depMod.version,
              downloadUrl: depMod.downloadUrl,
              sha256: depMod.sha256
            }
          }).filter(d => d !== null) as Array<{ name: string; version: string; downloadUrl: string; sha256?: string }>
        : []

      const result = await ipcRenderer.invoke('install-mod', {
        name: mod.name,
        version: mod.version,
        downloadUrl: mod.downloadUrl,
        sha256: mod.sha256,
        dependencies: dependencies
      })

      if (result.success) {
        toast.success(result.message || 'Mod installed successfully!')
        onInstallComplete()
      } else {
        toast.error(`Installation failed: ${result.error}`)
        onInstallComplete()
      }
    } catch (error) {
      toast.error(`Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      onInstallComplete()
    } finally {
      setInstalling(null)
    }
  }

  const handleUpdate = async (mod: Mod) => {
    if (!mod.downloadUrl) {
      toast.error('No download URL available for this mod')
      return
    }

    // Show toast confirmation
    toast.warning(`Update ${mod.name}? This will uninstall the current version and install the new one.`, {
      duration: 10000,
      action: {
        label: 'Update',
        onClick: async () => {
          await performUpdate(mod)
        }
      }
    })
  }

  const performUpdate = async (mod: Mod) => {
    setInstalling(mod.id)
    onInstallStart()

    try {
      // Uninstall current version
      const uninstallResult = await ipcRenderer.invoke('uninstall-mod', mod.name)
      if (!uninstallResult.success) {
        toast.error(`Failed to uninstall old version: ${uninstallResult.error}`)
        onInstallComplete()
        setInstalling(null)
        return
      }

      // Resolve dependencies
      const dependencies = mod.dependencies && mod.dependencies.length > 0
        ? mod.dependencies.map(depName => {
            const depMod = mods.find(m => m.name === depName)
            if (!depMod || !depMod.downloadUrl) {
              return null
            }
            return {
              name: depMod.name,
              version: depMod.version,
              downloadUrl: depMod.downloadUrl,
              sha256: depMod.sha256
            }
          }).filter(d => d !== null) as Array<{ name: string; version: string; downloadUrl: string; sha256?: string }>
        : []

      // Install new version
      const installResult = await ipcRenderer.invoke('install-mod', {
        name: mod.name,
        version: mod.version,
        downloadUrl: mod.downloadUrl,
        sha256: mod.sha256,
        dependencies: dependencies
      })

      if (installResult.success) {
        toast.success(`${mod.name} updated successfully!`)
        onInstallComplete()
      } else {
        toast.error(`Update failed: ${installResult.error}`)
        onInstallComplete()
      }
    } catch (error) {
      toast.error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      onInstallComplete()
    } finally {
      setInstalling(null)
    }
  }

  const handleUninstall = async (mod: Mod) => {
    // Show toast confirmation
    toast.warning(`Uninstall ${mod.name}?`, {
      duration: 10000,
      action: {
        label: 'Uninstall',
        onClick: async () => {
          await performUninstall(mod)
        }
      }
    })
  }

  const performUninstall = async (mod: Mod) => {
    setInstalling(mod.id)
    onInstallStart()

    try {
      const result = await ipcRenderer.invoke('uninstall-mod', mod.name)
      if (result.success) {
        toast.success(`${mod.name} uninstalled successfully!`)
        onInstallComplete()
      } else {
        toast.error(`Uninstall failed: ${result.error}`)
        onInstallComplete()
      }
    } catch (error) {
      toast.error(`Uninstall failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      onInstallComplete()
    } finally {
      setInstalling(null)
    }
  }

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
                onClick={(e) => {
                  e.stopPropagation()
                  // Allow enabling packs even if not all mods are installed (will auto-install)
                  if (mod.type === 'modpack' || mod.installed) {
                    handleToggleEnabled(mod, !mod.enabled)
                  }
                }}
                disabled={!hasValidDirectory || (mod.type === 'mod' && !mod.installed) || installing === mod.id}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-medium truncate">{mod.name}</h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{mod.version}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {installing === mod.id && mod.type === 'modpack'
                    ? 'Installing mods...'
                    : mod.description.length > 60 ? `${mod.description.substring(0, 60)}...` : mod.description}
                </p>
              </div>

              {mod.type === 'modpack' && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportPack(mod)
                    }}
                    disabled={!hasValidDirectory}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePack(mod)
                    }}
                    disabled={!hasValidDirectory}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {mod.type === 'mod' && !mod.installed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleInstall(mod)
                  }}
                  disabled={!hasValidDirectory || installing === mod.id}
                >
                  {installing === mod.id ? 'Installing...' : 'Install'}
                </Button>
              )}

              {mod.type === 'mod' && mod.installed && mod.hasUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdate(mod)
                  }}
                  disabled={!hasValidDirectory || installing === mod.id}
                >
                  {installing === mod.id ? 'Updating...' : 'Update'}
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
                          handleUninstall(mod)
                        }}
                        disabled={!hasValidDirectory || installing === mod.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {installing === mod.id ? 'Uninstalling...' : 'Uninstall Mod'}
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
