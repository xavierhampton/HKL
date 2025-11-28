import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import Store from 'electron-store'
import fs from 'fs'
import https from 'https'
import crypto from 'crypto'
import AdmZip from 'adm-zip'

const store = new Store({
  name: 'hkl-mod-manager'
})

const MODLINKS_URL = 'https://raw.githubusercontent.com/hk-modding/modlinks/main/ModLinks.xml'
const MODLINKS_TIMEOUT = 5000
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function getHKLModsPath(gameDirectory: string): string {
  return path.join(gameDirectory, 'hollow_knight_Data', 'Managed', 'HKL')
}

function getManagedPath(gameDirectory: string): string {
  return path.join(gameDirectory, 'hollow_knight_Data', 'Managed')
}

function getModsPath(gameDirectory: string): string {
  return path.join(gameDirectory, 'hollow_knight_Data', 'Managed', 'Mods')
}

function isModdingApiInstalled(gameDirectory: string): boolean {
  const managedPath = getManagedPath(gameDirectory)
  // Check if Assembly-CSharp.dll exists (the main modding API file)
  return fs.existsSync(path.join(managedPath, 'Assembly-CSharp.dll'))
}

function installModdingApi(gameDirectory: string): { success: boolean; error?: string } {
  try {
    const managedPath = getManagedPath(gameDirectory)
    const moddingApiPath = path.join(__dirname, '../public/resources/ModdingApiWin')

    // Check if modding API source exists
    if (!fs.existsSync(moddingApiPath)) {
      return { success: false, error: 'Modding API files not found in resources' }
    }

    // Copy all files from ModdingApiWin to Managed folder
    const files = fs.readdirSync(moddingApiPath)
    for (const file of files) {
      if (file === 'README.md') continue // Skip README

      const sourcePath = path.join(moddingApiPath, file)
      const destPath = path.join(managedPath, file)

      fs.copyFileSync(sourcePath, destPath)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Failed to install Modding API: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
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

interface Pack {
  name: string
  description: string
  author: string
  mods: string[]
}

interface PacksData {
  Packs: {
    [key: string]: Pack
  }
  activePack?: string | null
}

function getInstalledModsPath(gameDirectory: string): string {
  return path.join(getHKLModsPath(gameDirectory), 'installedMods.json')
}

function getPacksPath(gameDirectory: string): string {
  return path.join(getHKLModsPath(gameDirectory), 'packs.json')
}

function syncInstalledMods(gameDirectory: string): void {
  try {
    const hklPath = getHKLModsPath(gameDirectory)
    const installedModsData = readInstalledMods(gameDirectory)
    const trackedMods = installedModsData.InstalledMods.Mods

    // Get all directories in HKL folder
    if (!fs.existsSync(hklPath)) return

    const entries = fs.readdirSync(hklPath, { withFileTypes: true })
    const modFolders = entries.filter(e => e.isDirectory()).map(e => e.name)

    let hasChanges = false

    // Add any mods in HKL folder that aren't tracked
    for (const modName of modFolders) {
      if (!trackedMods[modName]) {
        // Add to tracking with version "Unknown" and enabled by default
        trackedMods[modName] = {
          Version: 'Unknown',
          Enabled: true
        }
        hasChanges = true
        console.log(`Detected untracked mod: ${modName}`)
      }
    }

    // Remove any tracked mods that don't have folders
    for (const modName of Object.keys(trackedMods)) {
      if (!modFolders.includes(modName)) {
        delete trackedMods[modName]
        hasChanges = true
        console.log(`Removed missing mod from tracking: ${modName}`)
      }
    }

    if (hasChanges) {
      writeInstalledMods(gameDirectory, installedModsData)
      console.log('Synced installedMods.json with HKL folder contents')
    }
  } catch (error) {
    console.error('Failed to sync installed mods:', error)
  }
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

    // Sync installed mods with actual folder contents
    syncInstalledMods(gameDirectory)

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

function readPacks(gameDirectory: string): PacksData {
  const packsPath = getPacksPath(gameDirectory)

  try {
    if (fs.existsSync(packsPath)) {
      const data = fs.readFileSync(packsPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to read packs.json:', error)
  }

  return {
    Packs: {}
  }
}

function writePacks(gameDirectory: string, data: PacksData): boolean {
  const packsPath = getPacksPath(gameDirectory)

  try {
    fs.writeFileSync(packsPath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Failed to write packs.json:', error)
    return false
  }
}

function addPack(gameDirectory: string, name: string, description: string, author: string, mods: string[]): boolean {
  const data = readPacks(gameDirectory)
  data.Packs[name] = {
    name,
    description,
    author,
    mods
  }
  return writePacks(gameDirectory, data)
}

function removePack(gameDirectory: string, packName: string): boolean {
  const data = readPacks(gameDirectory)
  delete data.Packs[packName]
  return writePacks(gameDirectory, data)
}

function loadEnabledMods(gameDirectory: string): { success: boolean; error?: string } {
  try {
    const modsPath = getModsPath(gameDirectory)
    const hklPath = getHKLModsPath(gameDirectory)

    // Create Mods directory if it doesn't exist
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true })
    }

    // Clear all existing mods in Mods folder
    const existingMods = fs.readdirSync(modsPath)
    for (const modFolder of existingMods) {
      const modFolderPath = path.join(modsPath, modFolder)
      if (fs.statSync(modFolderPath).isDirectory()) {
        fs.rmSync(modFolderPath, { recursive: true, force: true })
      }
    }

    // Get list of enabled mods
    const installedMods = readInstalledMods(gameDirectory)
    const enabledMods = Object.entries(installedMods.InstalledMods.Mods)
      .filter(([_, modInfo]) => modInfo.Enabled)
      .map(([modName, _]) => modName)

    // Copy enabled mods from HKL to Mods folder
    for (const modName of enabledMods) {
      const sourcePath = path.join(hklPath, modName)
      const destPath = path.join(modsPath, modName)

      if (fs.existsSync(sourcePath)) {
        // Copy directory recursively
        fs.cpSync(sourcePath, destPath, { recursive: true })
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Failed to load mods: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
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

function extractZipToHKL(zipBuffer: Buffer, gameDirectory: string, modName: string): { success: boolean; error?: string } {
  try {
    const hklPath = getHKLModsPath(gameDirectory)
    const modPath = path.join(hklPath, modName)

    // Validate buffer is not empty
    if (!zipBuffer || zipBuffer.length === 0) {
      return { success: false, error: 'Downloaded file is empty' }
    }

    // Check file type by magic bytes
    const header = zipBuffer.slice(0, 4).toString('hex')

    // Check if it's a DLL file (PE format: starts with MZ - 4D5A)
    if (header.startsWith('4d5a')) {
      console.log(`Detected DLL file for mod: ${modName}`)

      // Create mod directory if it doesn't exist
      if (!fs.existsSync(modPath)) {
        fs.mkdirSync(modPath, { recursive: true })
      }

      // Write DLL directly to the mod folder
      const dllPath = path.join(modPath, `${modName}.dll`)
      fs.writeFileSync(dllPath, zipBuffer)

      console.log(`Successfully saved DLL to: ${dllPath}`)
      return { success: true }
    }

    // Check if it's a ZIP file (should start with PK\x03\x04 or PK\x05\x06)
    if (!header.startsWith('504b0304') && !header.startsWith('504b0506')) {
      // Check if it's HTML (common for 404/error pages)
      const textStart = zipBuffer.slice(0, 100).toString('utf8').toLowerCase()
      if (textStart.includes('<!doctype') || textStart.includes('<html')) {
        return { success: false, error: 'Download URL returned a web page instead of a file (likely 404 or access denied)' }
      }
      return { success: false, error: 'Downloaded file is not a valid ZIP or DLL file' }
    }

    // Create mod directory if it doesn't exist
    if (!fs.existsSync(modPath)) {
      fs.mkdirSync(modPath, { recursive: true })
    }

    // Handle ZIP file
    const zip = new AdmZip(zipBuffer)
    const zipEntries = zip.getEntries()

    console.log(`Extracting ${zipEntries.length} files for mod: ${modName}`)

    // Check if zip contains files
    if (zipEntries.length === 0) {
      return { success: false, error: 'Zip file is empty' }
    }

    zip.extractAllTo(modPath, true)

    // Verify extraction succeeded
    if (!fs.existsSync(modPath) || fs.readdirSync(modPath).length === 0) {
      return { success: false, error: 'Extraction completed but no files found' }
    }

    console.log(`Successfully extracted ${zipEntries.length} files to: ${modPath}`)
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to extract zip:', errorMsg)

    // Provide more helpful error messages
    if (errorMsg.includes('Invalid or unsupported zip format')) {
      return { success: false, error: 'Invalid ZIP file - the download may be corrupted or the URL may be broken' }
    }

    return { success: false, error: errorMsg }
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

ipcMain.handle('get-packs', () => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return null
  return readPacks(gameDirectory)
})

ipcMain.handle('create-pack', (_event, packData: { name: string; description: string; author: string; mods: string[] }) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  const success = addPack(gameDirectory, packData.name, packData.description, packData.author, packData.mods)
  return { success, error: success ? undefined : 'Failed to create pack' }
})

ipcMain.handle('delete-pack', (_event, packName: string) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  const success = removePack(gameDirectory, packName)
  return { success, error: success ? undefined : 'Failed to delete pack' }
})

ipcMain.handle('export-pack', (_event, packName: string) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  try {
    const packsData = readPacks(gameDirectory)
    const pack = packsData.Packs[packName]

    if (!pack) {
      return { success: false, error: 'Pack not found' }
    }

    // Create export object
    const exportData = {
      name: pack.name,
      description: pack.description,
      author: pack.author,
      mods: pack.mods
    }

    // Convert to JSON and then base64
    const jsonString = JSON.stringify(exportData)
    const base64Code = Buffer.from(jsonString).toString('base64')

    return { success: true, code: base64Code }
  } catch (error) {
    return {
      success: false,
      error: `Failed to export pack: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

ipcMain.handle('import-pack', (_event, base64Code: string) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  try {
    // Decode base64 to JSON
    const jsonString = Buffer.from(base64Code, 'base64').toString('utf-8')
    const packData = JSON.parse(jsonString)

    // Validate pack data
    if (!packData.name || !packData.mods || !Array.isArray(packData.mods)) {
      return { success: false, error: 'Invalid pack code format' }
    }

    // Check if pack already exists
    const packsData = readPacks(gameDirectory)
    if (packsData.Packs[packData.name]) {
      return { success: false, error: `A pack named "${packData.name}" already exists` }
    }

    // Add the pack
    const success = addPack(
      gameDirectory,
      packData.name,
      packData.description || '',
      packData.author || 'Unknown',
      packData.mods
    )

    return {
      success,
      error: success ? undefined : 'Failed to import pack',
      packName: packData.name
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to import pack: ${error instanceof Error ? error.message : 'Invalid code'}`
    }
  }
})

ipcMain.handle('set-active-pack', (_event, packName: string | null) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  try {
    const packsData = readPacks(gameDirectory)
    packsData.activePack = packName
    const success = writePacks(gameDirectory, packsData)
    return { success, error: success ? undefined : 'Failed to set active pack' }
  } catch (error) {
    return {
      success: false,
      error: `Failed to set active pack: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

ipcMain.handle('toggle-mod-enabled', (_event, modName: string, enabled: boolean, dependencies?: string[]) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  // If enabling, also enable dependencies
  if (enabled && dependencies && dependencies.length > 0) {
    for (const dep of dependencies) {
      const depSuccess = updateModEnabled(gameDirectory, dep, true)
      if (!depSuccess) {
        console.log(`Warning: Failed to enable dependency: ${dep}`)
      }
    }
  }

  // Check if this change affects the active pack
  const packsData = readPacks(gameDirectory)
  if (packsData.activePack) {
    const activePack = packsData.Packs[packsData.activePack]
    if (activePack) {
      const modInPack = activePack.mods.includes(modName)

      // Clear pack if:
      // 1. Disabling a mod that's in the pack
      // 2. Enabling a mod that's NOT in the pack
      if ((!enabled && modInPack) || (enabled && !modInPack)) {
        packsData.activePack = null
        writePacks(gameDirectory, packsData)
      }
    }
  }

  const success = updateModEnabled(gameDirectory, modName, enabled)
  return { success, error: success ? undefined : 'Failed to update mod state' }
})

ipcMain.handle('batch-toggle-mods', (_event, changes: Array<{modName: string, enabled: boolean}>) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  try {
    const data = readInstalledMods(gameDirectory)
    const packsData = readPacks(gameDirectory)

    for (const change of changes) {
      if (data.InstalledMods.Mods[change.modName]) {
        data.InstalledMods.Mods[change.modName].Enabled = change.enabled
      }
    }

    // Check if any changes affect the active pack
    if (packsData.activePack) {
      const activePack = packsData.Packs[packsData.activePack]
      if (activePack) {
        // Clear pack if:
        // 1. Any mod in the pack is being disabled
        // 2. Any mod NOT in the pack is being enabled
        const packViolated = changes.some(c => {
          const modInPack = activePack.mods.includes(c.modName)
          return (!c.enabled && modInPack) || (c.enabled && !modInPack)
        })

        if (packViolated) {
          packsData.activePack = null
          writePacks(gameDirectory, packsData)
        }
      }
    }

    const success = writeInstalledMods(gameDirectory, data)
    return { success, error: success ? undefined : 'Failed to batch update mod states' }
  } catch (error) {
    return {
      success: false,
      error: `Failed to batch toggle mods: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

ipcMain.handle('uninstall-mod', (_event, modName: string) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  try {
    // Delete mod files from HKL directory
    const hklPath = getHKLModsPath(gameDirectory)
    const modPath = path.join(hklPath, modName)

    if (fs.existsSync(modPath)) {
      fs.rmSync(modPath, { recursive: true, force: true })
    }

    // Check if this mod is in the active pack
    const packsData = readPacks(gameDirectory)
    if (packsData.activePack) {
      const activePack = packsData.Packs[packsData.activePack]
      if (activePack && activePack.mods.includes(modName)) {
        // Clear the active pack since one of its mods is being uninstalled
        packsData.activePack = null
        writePacks(gameDirectory, packsData)
      }
    }

    // Remove from installed mods list
    const success = removeInstalledMod(gameDirectory, modName)
    return { success, error: success ? undefined : 'Failed to remove mod from installed list' }
  } catch (error) {
    return {
      success: false,
      error: `Failed to uninstall mod: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

ipcMain.handle('batch-uninstall-mods', (_event, modNames: string[]) => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  const hklPath = getHKLModsPath(gameDirectory)
  const data = readInstalledMods(gameDirectory)
  const results = { success: 0, failed: 0 }

  for (const modName of modNames) {
    try {
      // Delete mod files
      const modPath = path.join(hklPath, modName)
      if (fs.existsSync(modPath)) {
        fs.rmSync(modPath, { recursive: true, force: true })
      }
      // Update tracking
      delete data.InstalledMods.Mods[modName]
      results.success++
    } catch (error) {
      console.error(`Failed to uninstall ${modName}:`, error)
      results.failed++
    }
  }

  writeInstalledMods(gameDirectory, data)
  return { success: true, results }
})

ipcMain.handle('launch-game', () => {
  const gameDirectory = store.get('gameDirectory', '') as string
  if (!gameDirectory) return { success: false, error: 'No game directory set' }

  try {
    // Check if Modding API is installed, if not install it
    if (!isModdingApiInstalled(gameDirectory)) {
      const installResult = installModdingApi(gameDirectory)
      if (!installResult.success) {
        return { success: false, error: installResult.error }
      }
    }

    // Load enabled mods into Mods folder
    const loadModsResult = loadEnabledMods(gameDirectory)
    if (!loadModsResult.success) {
      return { success: false, error: loadModsResult.error }
    }

    // Launch the game
    const exePath = path.join(gameDirectory, 'hollow_knight.exe')
    if (!fs.existsSync(exePath)) {
      return { success: false, error: 'hollow_knight.exe not found' }
    }

    // Launch without waiting
    const { spawn } = require('child_process')
    spawn(exePath, [], { detached: true, stdio: 'ignore', cwd: gameDirectory }).unref()

    return { success: true, message: 'Game launched successfully' }
  } catch (error) {
    return {
      success: false,
      error: `Failed to launch game: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
})

ipcMain.handle('install-mod', async (_event, modData: {
  name: string;
  version: string;
  downloadUrl: string;
  sha256?: string;
  dependencies?: Array<{ name: string; version: string; downloadUrl: string; sha256?: string }>
}) => {
  const gameDirectory = store.get('gameDirectory', '') as string

  // Ensure HKL directory exists
  const dirResult = ensureHKLDirectory(gameDirectory)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    const installedMods = readInstalledMods(gameDirectory)
    const installedModsList: string[] = []

    // Install dependencies first
    if (modData.dependencies && modData.dependencies.length > 0) {
      for (const dep of modData.dependencies) {
        // Skip if already installed
        if (installedMods.InstalledMods.Mods[dep.name]) {
          console.log(`Dependency ${dep.name} already installed, skipping`)
          continue
        }

        console.log(`Installing dependency: ${dep.name}`)
        const zipBuffer = await downloadFile(dep.downloadUrl)

        if (dep.sha256) {
          const calculatedHash = calculateSHA256(zipBuffer)
          if (calculatedHash !== dep.sha256.toUpperCase()) {
            return {
              success: false,
              error: `Dependency ${dep.name}: Hash verification failed`
            }
          }
        }

        const extracted = extractZipToHKL(zipBuffer, gameDirectory, dep.name)
        if (!extracted.success) {
          return { success: false, error: `Failed to extract dependency ${dep.name}: ${extracted.error}` }
        }

        const success = addInstalledMod(gameDirectory, dep.name, dep.version, true)
        if (!success) {
          return { success: false, error: `Failed to add dependency to installed list: ${dep.name}` }
        }

        installedModsList.push(dep.name)
        console.log(`Successfully installed dependency: ${dep.name}`)
      }
    }

    // Download main mod from URL
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
    if (!extracted.success) {
      return { success: false, error: `Failed to extract mod files: ${extracted.error}` }
    }

    // Add to installed mods list
    const success = addInstalledMod(gameDirectory, modData.name, modData.version, true)
    if (!success) {
      return { success: false, error: 'Failed to update installed mods list' }
    }

    installedModsList.push(modData.name)
    console.log(`Successfully installed mod: ${modData.name}`)

    const message = installedModsList.length > 1
      ? `${modData.name} and ${installedModsList.length - 1} dependencies installed successfully`
      : `${modData.name} installed successfully`

    return { success: true, message, installedMods: installedModsList }
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

ipcMain.on('trigger-directory-update', (event, dir: string) => {
  // Broadcast the directory update to trigger mod list refresh
  event.sender.send('game-directory-updated', dir)
})

function createWindow() {
  // Try multiple icon paths - this is sketchy but works for packaged apps
  const possiblePaths = [
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../../public/icon.ico'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../../build/icon.ico'),
    path.join(process.resourcesPath || '', 'public/icon.ico'),
    path.join(process.resourcesPath || '', 'build/icon.ico'),
  ]

  let iconPath = possiblePaths[0]
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      iconPath = testPath
      break
    }
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // Nuclear option: Force set icon after creation (Windows taskbar fix)
  if (process.platform === 'win32') {
    try {
      win.setIcon(iconPath)
      // Also try with nativeImage for better compatibility
      const { nativeImage } = require('electron')
      const image = nativeImage.createFromPath(iconPath)
      if (!image.isEmpty()) {
        win.setIcon(image)
      }
    } catch (e) {
      console.error('Failed to set icon:', e)
    }
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
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
