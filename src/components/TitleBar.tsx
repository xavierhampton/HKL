import { Minus, Square, X } from 'lucide-react'

const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer

export function TitleBar() {
  const handleMinimize = () => {
    ipcRenderer?.send('window-minimize')
  }

  const handleMaximize = () => {
    ipcRenderer?.send('window-maximize')
  }

  const handleClose = () => {
    ipcRenderer?.send('window-close')
  }

  return (
    <div className="h-8 bg-background border-b border-border/40 flex items-center justify-between px-3 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="text-xs font-medium text-muted-foreground">HKL</div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded transition-colors"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={handleClose}
          className="h-6 w-6 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
