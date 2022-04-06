const { app, BrowserWindow } = require('electron')
const path = require('path')
// const { ipcMain } = require("electron");

const ENV = process.env.NODE_ENV

const appPath = {
	dev: './public/preload.js',
	prod: './resources/app/public/preload.js'
}

const createWindow = () => {
	const win = new BrowserWindow({
		width: 1440,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			preload: path.resolve(ENV === 'development' ? appPath.dev : appPath.prod),
		}
	})
	win.webContents.openDevTools()
	win.loadFile('index.html')
}

app.whenReady().then(() => {
	createWindow()
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

// ipcMain.on("newData", (event, data) => {
//    console.log(data.value); // Will output whatever was inside input element in HTML
// });