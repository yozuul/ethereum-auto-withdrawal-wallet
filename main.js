const { v4: uuidv4 } = require('uuid');
const { writeFile } = require('fs/promises')
const { Buffer } = require('buffer')
const { app, BrowserWindow } = require('electron')

const { start } = require('./public/preload.js')

const PORT = 5000
const API_KEY = uuidv4();

(async () => {
	try {
		const data = new Uint8Array(Buffer.from(API_KEY))
		const promise = writeFile('API_KEY', data);
		await promise;
	} catch (err) {
		console.error(err);
	}
})();

const createWindow = () => {
	const win = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		}
	})
	win.hide()
	win.webContents.openDevTools()
	win.maximize();
	win.setMenuBarVisibility(false)
	win.loadFile('index.html')
}

app.whenReady().then(() => {
	createWindow()
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
	start(PORT)
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})