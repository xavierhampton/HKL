import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import Store from 'electron-store'
import fs from 'fs'
import https from 'https'
import { DOMParser } from 'xmldom'

const store = new Store()

const MODLINKS_URL = 'https://raw.githubusercontent.com/hk-modding/modlinks/main/ModLinks.xml'
const MODLINKS_TIMEOUT = 5000
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface ParsedMod {
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
}

let cachedParsedMods: ParsedMod[] | null = null

async function fetchModLinks(): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(MODLINKS_URL, { timeout: MODLINKS_TIMEOUT }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })

      response.on('end', () => {
        resolve(data)
      })
    })

    request.on('timeout', () => {
      request.destroy()
      reject(new Error('Request timeout'))
    })

    request.on('error', (error) => {
      reject(error)
    })
  })
}

function parseModLinks(xmlContent: string): ParsedMod[] {
  if (!xmlContent) return []

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

  const manifestElements = xmlDoc.getElementsByTagName('Manifest')
  const mods: ParsedMod[] = []

  for (let i = 0; i < manifestElements.length; i++) {
    const manifest = manifestElements[i]

    const nameElement = manifest.getElementsByTagName('Name')[0]
    const descriptionElement = manifest.getElementsByTagName('Description')[0]
    const versionElement = manifest.getElementsByTagName('Version')[0]
    const repositoryElement = manifest.getElementsByTagName('Repository')[0]

    const name = nameElement?.textContent || ''
    const description = descriptionElement?.textContent || ''
    const version = versionElement?.textContent || '1.0.0.0'
    const repository = repositoryElement?.textContent || ''

    const dependencies: string[] = []
    const depsElement = manifest.getElementsByTagName('Dependencies')[0]
    if (depsElement) {
      const stringElements = depsElement.getElementsByTagName('string')
      for (let j = 0; j < stringElements.length; j++) {
        const depName = stringElements[j].textContent?.trim()
        if (depName) dependencies.push(depName)
      }
    }

    if (name) {
      const author = repository
        ? repository.split('/').slice(-2, -1)[0] || 'Unknown'
        : 'Unknown'

      mods.push({
        id: `${i}`,
        name,
        description: description || 'No description available',
        version,
        author,
        enabled: false,
        installed: false,
        type: 'mod' as const,
        githubUrl: repository || undefined,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        integrations: [],
        hasUpdate: false,
      })
    }
  }

  return mods.sort((a, b) => a.name.localeCompare(b.name))
}

async function updateModLinksCache(): Promise<{ success: boolean; updated: boolean; error?: string }> {
  const lastUpdate = store.get('modLinksLastUpdate', 0) as number
  const now = Date.now()

  // Only fetch if cache is older than CACHE_DURATION or doesn't exist
  if (now - lastUpdate < CACHE_DURATION && store.has('modLinksCache')) {
    return { success: true, updated: false }
  }

  try {
    const newContent = await fetchModLinks()
    const cachedContent = store.get('modLinksCache', '') as string

    if (newContent !== cachedContent) {
      store.set('modLinksCache', newContent)
      store.set('modLinksLastUpdate', now)
      // Clear cached parsed mods when XML changes
      cachedParsedMods = null
      return { success: true, updated: true }
    }

    // Update timestamp even if content is the same
    store.set('modLinksLastUpdate', now)
    return { success: true, updated: false }
  } catch (error) {
    const cachedContent = store.get('modLinksCache', '') as string

    if (cachedContent) {
      return { success: true, updated: false, error: `Using cached version: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }

    return { success: false, updated: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Register IPC handlers once, outside of createWindow
ipcMain.handle('get-game-directory', () => {
  return store.get('gameDirectory', '')
})

ipcMain.handle('select-game-directory', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { success: false, error: 'Window not found' }

  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Hollow Knight Directory',
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0]
    const dirName = path.basename(selectedPath)

    if (dirName === 'Hollow Knight' || fs.existsSync(path.join(selectedPath, 'hollow_knight.exe')) || fs.existsSync(path.join(selectedPath, 'hollow_knight_Data'))) {
      store.set('gameDirectory', selectedPath)
      win.webContents.send('game-directory-updated', selectedPath)
      return { success: true, path: selectedPath }
    } else {
      return { success: false, error: 'Selected directory must be named "Hollow Knight" or contain Hollow Knight game files' }
    }
  }

  return { success: false, error: 'No directory selected' }
})

ipcMain.handle('update-modlinks', async () => {
  return await updateModLinksCache()
})

ipcMain.handle('get-modlinks', () => {
  // Return cached parsed mods if available
  if (cachedParsedMods) {
    return cachedParsedMods
  }

  // Parse XML and cache the result
  const xmlContent = store.get('modLinksCache', '') as string
  cachedParsedMods = parseModLinks(xmlContent)
  return cachedParsedMods
})

// Window control handlers
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  updateModLinksCache().catch(console.error)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
