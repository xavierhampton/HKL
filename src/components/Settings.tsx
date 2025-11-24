import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { FolderOpen, AlertCircle } from 'lucide-react'

const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer

export function Settings() {
  const [gameDirectory, setGameDirectory] = useState('')
  const [error, setError] = useState('')

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
            <Button variant="destructive" size="sm" disabled={!gameDirectory}>
              Uninstall All Mods
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
