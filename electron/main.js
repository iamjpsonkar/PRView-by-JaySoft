const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');

const BACKEND_PORT = 8121;
const isDev = process.env.ELECTRON_DEV === '1';

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;

// ── Path helpers ──────────────────────────────────────────────────────────────

function getResourcesPath() {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  return process.resourcesPath;
}

function getBackendDir() {
  return path.join(getResourcesPath(), 'backend');
}

function getFrontendDist() {
  return path.join(getResourcesPath(), 'frontend', 'dist');
}

function getVenvPython() {
  const venvPath = path.join(getBackendDir(), '.venv', 'bin', 'python3');
  return fs.existsSync(venvPath) ? venvPath : null;
}

function getSystemPython() {
  const candidates = ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
      return cmd;
    } catch (_) {}
  }
  return null;
}

// ── Splash window ─────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 280,
    resizable: false,
    frame: false,
    center: true,
    show: false,
    transparent: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function setSplashStatus(msg) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `document.getElementById('status') && (document.getElementById('status').textContent = ${JSON.stringify(msg)})`
    );
  }
}

// ── Backend management ────────────────────────────────────────────────────────

function setupVenv(backendDir, systemPython) {
  return new Promise((resolve, reject) => {
    setSplashStatus('Creating Python environment (first launch)...');
    const venvDir = path.join(backendDir, '.venv');
    const create = spawn(systemPython, ['-m', 'venv', venvDir], { cwd: backendDir });
    create.on('close', (code) => {
      if (code !== 0) return reject(new Error('Failed to create venv'));
      setSplashStatus('Installing Python dependencies...');
      const venvPip = path.join(venvDir, 'bin', 'pip');
      const reqFile = path.join(backendDir, 'requirements.txt');
      const install = spawn(venvPip, ['install', '-q', '-r', reqFile], { cwd: backendDir });
      install.on('close', (code2) => {
        if (code2 !== 0) return reject(new Error('Failed to install dependencies'));
        resolve();
      });
      install.on('error', reject);
    });
    create.on('error', reject);
  });
}

function startBackend(backendDir, python) {
  backendProcess = spawn(
    python,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
    {
      cwd: backendDir,
      env: { ...process.env, PRVIEW_PORT: String(BACKEND_PORT) },
    }
  );
  backendProcess.stdout.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backendProcess.stderr.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  backendProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`Backend exited with code ${code}`);
    }
  });
}

function pollHealth(retries = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(500, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      attempts++;
      if (attempts >= retries) return reject(new Error('Backend did not start in time'));
      setTimeout(check, 500);
    };
    check();
  });
}

// ── Main window ───────────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'PRView',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexHtml = path.join(getFrontendDist(), 'index.html');
  mainWindow.loadFile(indexHtml);

  // Open external links in the default browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplash();

  const backendDir = getBackendDir();

  try {
    let python = getVenvPython();

    if (!python) {
      const systemPython = getSystemPython();
      if (!systemPython) {
        setSplashStatus('Error: Python 3 not found. Please install Python 3.');
        await new Promise((r) => setTimeout(r, 5000));
        app.quit();
        return;
      }
      await setupVenv(backendDir, systemPython);
      python = getVenvPython() || systemPython;
    }

    setSplashStatus('Starting backend...');
    startBackend(backendDir, python);

    setSplashStatus('Waiting for backend...');
    await pollHealth();

    createMainWindow();
  } catch (err) {
    console.error('Startup error:', err);
    setSplashStatus(`Error: ${err.message}`);
    await new Promise((r) => setTimeout(r, 5000));
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null && BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
