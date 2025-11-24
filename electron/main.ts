import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import Store from 'electron-store'
import fs from 'fs'

const store = new Store()

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

  ipcMain.on('window-minimize', () => {
    win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    win.close()
  })

  ipcMain.handle('get-game-directory', () => {
    return store.get('gameDirectory', '')
  })

  ipcMain.handle('select-game-directory', async () => {
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

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

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
