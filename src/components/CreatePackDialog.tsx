import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X } from 'lucide-react'

interface CreatePackDialogProps {
  onClose: () => void
  onCreatePack: (name: string, description: string, author: string) => void
  enabledModsCount: number
}

export function CreatePackDialog({ onClose, onCreatePack, enabledModsCount }: CreatePackDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreatePack(name.trim(), description.trim(), author.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Pack</h2>
          <button
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Create a pack from {enabledModsCount} currently enabled mods
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Pack Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Pack"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A collection of great mods"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Author
            </label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Pack
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
