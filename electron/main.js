const { app, BrowserWindow, dialog, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const net = require('net');
const http = require('http');

let mainWindow;
let djangoProcess;

// IPC Handlers
ipcMain.handle('backup-database', async (event) => {
    try {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Backup Database',
            defaultPath: 'db_backup.sqlite3',
            filters: [{ name: 'SQLite Database', extensions: ['sqlite3'] }]
        });
        if (canceled) return { success: false, reason: 'canceled' };
        
        const sourcePath = path.join(app.getPath('appData'), 'SchoolPaymentSystem', 'db.sqlite3');
        fs.copyFileSync(sourcePath, filePath);
        return { success: true, path: filePath };
    } catch (error) {
        console.error('Backup failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-and-open-pdf', async (event, { base64Data, fileName }) => {
    try {
        const buffer = Buffer.from(base64Data, 'base64');
        const tempPath = path.join(app.getPath('temp'), fileName);
        fs.writeFileSync(tempPath, buffer);
        await shell.openPath(tempPath);
        return { success: true, path: tempPath };
    } catch (error) {
        console.error('Failed to save or open PDF:', error);
        return { success: false, error: error.message };
    }
});

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { role: 'close' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    if (mainWindow) {
        mainWindow.focus();
        return;
    }

    createMenu();
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        autoHideMenuBar: true
    });

    if (app.isPackaged) {
        const frontendPath = path.join(process.resourcesPath, 'frontend', 'index.html');
        console.log(`Loading packaged frontend: ${frontendPath}`);
        mainWindow.loadFile(frontendPath).catch(err => {
            console.error('Failed to load production index.html:', err);
            dialog.showErrorBox("Startup Error", `Required frontend files not found at: ${frontendPath}`);
        });
    } else {
        // In development, try dev server first, fallback to built files
        const devServerUrl = 'http://127.0.0.1:5173';
        const buildPath = path.join(__dirname, '../frontend/dist/index.html');
        
        http.get(devServerUrl, (res) => {
            console.log('Dev server found, loading...');
            mainWindow.loadURL(devServerUrl);
        }).on('error', () => {
            console.log('Dev server not found, attempting to load built files...');
            if (fs.existsSync(buildPath)) {
                mainWindow.loadFile(buildPath);
            } else {
                mainWindow.loadURL(devServerUrl); // Fallback to show the connection error UI
            }
        });
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

const waitOn = require('wait-on');

function startBackendAndLaunch() {
    const isPackaged = app.isPackaged;
    const backendDir = isPackaged
        ? path.join(process.resourcesPath, 'backend')
        : path.join(__dirname, '../backend');

    const exeName = process.platform === 'win32' ? 'start_backend.exe' : 'start_backend';
    const backendExe = isPackaged 
        ? path.join(backendDir, exeName)
        : path.join(backendDir, 'dist', 'start_backend', exeName);

    console.log(`Launching backend: ${backendExe}`);
    
    if (isPackaged) {
        djangoProcess = spawn(backendExe, [], {
            cwd: backendDir,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1'
            }
        });
    } else {
        console.log('skipping backend launch since we are running it separately in dev mode');
        djangoProcess = null;
    }

    if (djangoProcess) {
        djangoProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
        djangoProcess.stderr.on('data', (data) => console.log(`Backend Error: ${data}`));

        djangoProcess.on('error', (err) => {
            console.error("Failed to spawn backend process", err);
            dialog.showErrorBox("Backend Error", `Failed to start the local backend: ${err.message}`);
            app.quit();
        });
    }

    // Health check logic using wait-on via TCP port
    const healthCheckUrl = 'tcp:127.0.0.1:8000';
    
    waitOn({
        resources: [healthCheckUrl],
        timeout: 60000, // 1 minute timeout
    }).then(() => {
        console.log("Backend ready. Opening window...");
        createWindow();
    }).catch((err) => {
        console.error("Failed to connect to backend:", err);
        dialog.showErrorBox("Backend Connection Failed", "The application was unable to connect to the backend server. Please try restarting the application.");
        app.quit();
    });
}
function checkLicense() {
    const userDataPath = app.getPath('userData');
    const licenseFilePath = path.join(userDataPath, '.license_info.json');
    const TRIAL_DAYS = 15;
    const TRIAL_MILLIS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
        if (!fs.existsSync(licenseFilePath)) {
            // First run: Create license file with current timestamp
            fs.writeFileSync(licenseFilePath, JSON.stringify({ installedAt: now }), 'utf8');
            console.log('Trial started.');
            startBackendAndLaunch();
        } else {
            // Subsequent runs: Check expiration
            const licenseData = JSON.parse(fs.readFileSync(licenseFilePath, 'utf8'));
            const installedAt = licenseData.installedAt;

            if (now - installedAt > TRIAL_MILLIS) {
                console.log('Trial expired.');
                dialog.showErrorBox(
                    "Trial Expired",
                    "Your 10-day trial period for the PaymentMag School Management System has ended. Please contact the administrator to activate your full license."
                );
                app.quit();
            } else {
                console.log('Trial valid. Days remaining:', Math.ceil((TRIAL_MILLIS - (now - installedAt)) / (1000 * 60 * 60 * 24)));
                startBackendAndLaunch();
            }
        }
    } catch (error) {
        console.error('Error checking license:', error);
        // Fallback or deny access on read/write error
        dialog.showErrorBox("License Error", "Unable to verify license information. Please check your permissions or contact support.");
        app.quit();
    }
}

app.on('ready', checkLicense);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (djangoProcess && djangoProcess.pid) {
        try {
            treeKill(djangoProcess.pid, 'SIGTERM');
        } catch (e) {
            console.error('Failed to kill backend process:', e);
        }
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        startBackendAndLaunch();
    }
});
