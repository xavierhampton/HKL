import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { FolderOpen, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer

export function Settings() {
  const [gameDirectory, setGameDirectory] = useState('')
  const [error, setError] = useState('')
  const [isUninstalling, setIsUninstalling] = useState(false)

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-game-directory').then((dir: string) => {
        setGameDirectory(dir)
      })
    }
  }, [])

  const handleBrowse = async () => {
    if (!ipcRenderer) return

    const result = await ipcRenderer.invoke('select-game-directory')

    if (result.success) {
      setGameDirectory(result.path)
      setError('')
    } else {
      setError(result.error)
    }
  }

  const handleUninstallAll = async () => {
    if (!ipcRenderer) return

    // Get installed mods
    const installedModsData = await ipcRenderer.invoke('get-installed-mods')
    const installedMods = installedModsData?.InstalledMods?.Mods || {}
    const modCount = Object.keys(installedMods).length

    if (modCount === 0) {
      toast.info('No installed mods to uninstall')
      return
    }

    // Show toast with action to confirm
    toast.warning(`This will uninstall all ${modCount} mods. Click Uninstall to proceed.`, {
      duration: 10000,
      action: {
        label: 'Uninstall',
        onClick: async () => {
          setIsUninstalling(true)
          let successCount = 0
          let failCount = 0

          for (const modName of Object.keys(installedMods)) {
            try {
              const result = await ipcRenderer.invoke('uninstall-mod', modName)
              if (result.success) {
                successCount++
              } else {
                failCount++
              }
            } catch (error) {
              failCount++
            }
          }

          setIsUninstalling(false)

          // Clear the active pack since all mods are being uninstalled
          await ipcRenderer.invoke('set-active-pack', null)

          // Trigger a directory update event to refresh the mod list
          if (ipcRenderer) {
            const currentDir = await ipcRenderer.invoke('get-game-directory')
            ipcRenderer.send('trigger-directory-update', currentDir)
          }

          if (failCount === 0) {
            toast.success(`Uninstalled ${successCount} mods`)
          } else {
            toast.warning(`Uninstalled ${successCount} mods, ${failCount} failed`)
          }
        }
      }
    })
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">HKL Settings</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Game Directory
            </label>
            <div className="flex gap-2">
              <Input
                value={gameDirectory || ''}
                placeholder="C:\\Program Files\\Hollow Knight"
                className="bg-background/50 border-border/40"
                readOnly
              />
              <Button variant="outline" size="sm" onClick={handleBrowse}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            {!gameDirectory && !error && (
              <p className="text-xs text-muted-foreground mt-2">
                Please select your Hollow Knight game directory to enable mod installation
              </p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Mod Management
            </label>
            <Button
              variant="destructive"
              size="sm"
              disabled={!gameDirectory || isUninstalling}
              onClick={handleUninstallAll}
            >
              {isUninstalling ? 'Uninstalling...' : 'Uninstall All Mods'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
