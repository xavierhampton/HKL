import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import Store from 'electron-store'
import fs from 'fs'
import https from 'https'
import crypto from 'crypto'
import AdmZip from 'adm-zip'

const store = new Store()

const MODLINKS_URL = 'https://raw.githubusercontent.com/hk-modding/modlinks/main/ModLinks.xml'
const MODLINKS_TIMEOUT = 5000
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function getHKLModsPath(gameDirectory: string): string {
  return path.join(gameDirectory, 'hollow_knight_Data', 'Managed', 'HKL')
}

interface InstalledMod {
  Version: string
  Enabled: boolean
}

interface InstalledModsData {
  InstalledMods: {
    Mods: {
      [key: string]: InstalledMod
    }
  }
}

function getInstalledModsPath(gameDirectory: string): string {
  return path.join(getHKLModsPath(gameDirectory), 'installedMods.json')
}

function ensureHKLDirectory(gameDirectory: string): { success: boolean; path?: string; error?: string } {
  if (!gameDirectory) {
    return { success: false, error: 'No game directory set' }
  }

  const hklPath = getHKLModsPath(gameDirectory)

  try {
    if (!fs.existsSync(hklPath)) {
      fs.mkdirSync(hklPath, { recursive: true })
    }

    // Create installedMods.json if it doesn't exist
    const installedModsPath = getInstalledModsPath(gameDirectory)
    if (!fs.existsSync(installedModsPath)) {
      const initialData: InstalledModsData = {
        InstalledMods: {
          Mods: {}
        }
      }
      fs.writeFileSync(installedModsPath, JSON.stringify(initialData, null, 2))
    }

    return { success: true, path: hklPath }
  } catch (error) {
    return {
      success: false,
      error: `Failed to create HKL directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

function readInstalledMods(gameDirectory: string): InstalledModsData {
  const installedModsPath = getInstalledModsPath(gameDirectory)

  try {
    if (fs.existsSync(installedModsPath)) {
      const data = fs.readFileSync(installedModsPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to read installedMods.json:', error)
  }

  return {
    InstalledMods: {
      Mods: {}
    }
  }
}

function writeInstalledMods(gameDirectory: string, data: InstalledModsData): boolean {
  const installedModsPath = getInstalledModsPath(gameDirectory)

  try {
    fs.writeFileSync(installedModsPath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Failed to write installedMods.json:', error)
    return false
  }
}

function addInstalledMod(gameDirectory: string, modName: string, version: string, enabled: boolean = true): boolean {
  const data = readInstalledMods(gameDirectory)
  data.InstalledMods.Mods[modName] = {
    Version: version,
    Enabled: enabled
  }
  return writeInstalledMods(gameDirectory, data)
}

function removeInstalledMod(gameDirectory: string, modName: string): boolean {
  const data = readInstalledMods(gameDirectory)
  delete data.InstalledMods.Mods[modName]
  return writeInstalledMods(gameDirectory, data)
}

function updateModEnabled(gameDirectory: string, modName: string, enabled: boolean): boolean {
  const data = readInstalledMods(gameDirectory)
  if (data.InstalledMods.Mods[modName]) {
    data.InstalledMods.Mods[modName].Enabled = enabled
    return writeInstalledMods(gameDirectory, data)
  }
  return false
}

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

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          return downloadFile(response.headers.location).then(resolve).catch(reject)
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      const chunks: Buffer[] = []
      response.on('data', (chunk) => {
        chunks.push(chunk)
      })

      response.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

      response.on('error', (error) => {
        reject(error)
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase()
}

function extractZipToHKL(zipBuffer: Buffer, gameDirectory: string, modName: string): boolean {
  try {
    const hklPath = getHKLModsPath(gameDirectory)
    const modPath = path.join(hklPath, modName)

    // Create mod directory if it doesn't exist
    if (!fs.existsSync(modPath)) {
      fs.mkdirSync(modPath, { recursive: true })
    }

    const zip = new AdmZip(zipBuffer)
    zip.extractAllTo(modPath, true)

    return true
  } catch (error) {
    console.error('Failed to extract zip:', error)
    return false
  }
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
  return store.get('modLinksCache', '')
})

ipcMain.handle('get-hkl-mods-path', () => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return null
  return getHKLModsPath(gameDirectory)
})

ipcMain.handle('ensure-hkl-directory', () => {
  const gameDirectory = store.get('gameDirectory', '') as string
  return ensureHKLDirectory(gameDirectory)
})

ipcMain.handle('get-installed-mods', () => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return null
  return readInstalledMods(gameDirectory)
})

ipcMain.handle('toggle-mod-enabled', (_event, modName: string, enabled: boolean) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  const success = updateModEnabled(gameDirectory, modName, enabled)
  return { success, error: success ? undefined : 'Failed to update mod state' }
})

ipcMain.handle('uninstall-mod', (_event, modName: string) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  // TODO: Delete mod files from HKL directory

  const success = removeInstalledMod(gameDirectory, modName)
  return { success, error: success ? undefined : 'Failed to remove mod from installed list' }
})

ipcMain.handle('install-mod', async (_event, modData: { name: string; version: string; downloadUrl: string; sha256?: string }) => {
  const gameDirectory = store.get('gameDirectory', '') as string

  // Ensure HKL directory exists
  const dirResult = ensureHKLDirectory(gameDirectory)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    // Download mod from URL
    console.log(`Downloading mod: ${modData.name} from ${modData.downloadUrl}`)
    const zipBuffer = await downloadFile(modData.downloadUrl)

    // Verify hash if provided
    if (modData.sha256) {
      const calculatedHash = calculateSHA256(zipBuffer)
      if (calculatedHash !== modData.sha256.toUpperCase()) {
        return {
          success: false,
          error: `Hash verification failed. Expected: ${modData.sha256}, Got: ${calculatedHash}`
        }
      }
      console.log(`Hash verified: ${calculatedHash}`)
    }

    // Extract to HKL directory
    const extracted = extractZipToHKL(zipBuffer, gameDirectory, modData.name)
    if (!extracted) {
      return { success: false, error: 'Failed to extract mod files' }
    }

    // Add to installed mods list
    const success = addInstalledMod(gameDirectory, modData.name, modData.version, true)
    if (!success) {
      return { success: false, error: 'Failed to update installed mods list' }
    }

    console.log(`Successfully installed mod: ${modData.name}`)
    return { success: true, message: `${modData.name} installed successfully` }
  } catch (error) {
    return {
      success: false,
      error: `Failed to install mod: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
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
