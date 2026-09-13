import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn, execFile } from "node:child_process";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

let menuContextTemplate = [
  {
    label: "Pace",
    submenu: [
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: "Theme",
    submenu: [
      {
        label: "Light",
        click: () => {
          win?.webContents.send("theme", "light");
        },
      },
      {
        label: "Dark",
        click: () => {
          win?.webContents.send("theme", "dark");
        },
      },
    ],
  },
  {
    label: "Help",
    submenu: [
      {
        label: "About",
        click: () => {
          dialog.showMessageBox({
            type: "info",
            title: "About",
            message: "Pace",
            detail:
              "A simple utility for changing video speed. made by Aji Mustofa (@pepega90)",
            buttons: ["Close"],
          });
        },
      },
      {
        label: "Github",
        click: () => {
          shell.openExternal("https://github.com/pepega90");
        },
      },
    ],
  },
];

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
    resizable: true,
    width: 1280,
    height: 720,
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();

  const menu = Menu.buildFromTemplate(menuContextTemplate);
  Menu.setApplicationMenu(menu);
});

// event
ipcMain.handle("show_output_folder", async (_, filepath: string) => {
  await shell.showItemInFolder(filepath);
});

ipcMain.handle("select_video", async (event) => {
  const res = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Video",
        extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"],
      },
    ],
  });

  if (res.canceled || res.filePaths.length === 0) return null;

  return res.filePaths[0];
});

ipcMain.handle("read_video", async (_, videoPath: string) => {
  const buffer = await fs.readFile(videoPath);

  const extension = path.extname(videoPath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
  };

  const mimeType = mimeTypes[extension] ?? "application/octet-stream";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
});

ipcMain.handle(
  "speedup_video",
  async (_, inputPath: string, outputPath: string, speed: number) => {
    return new Promise((resolve, reject) => {
      // check apakah input video ada audionya
      execFile(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "a",
          "-show_entries",
          "stream=index",
          "-of",
          "csv=p=0",
          inputPath,
        ],
        (probeError, stdout) => {
          if (probeError) {
            reject(probeError);
            return;
          }

          const hasAudio = stdout.trim().length > 0;

          const videoFilter = `setpts=PTS/${speed}`;

          let audioFilter = "";

          if (hasAudio) {
            if (speed <= 2) {
              audioFilter = `atempo=${speed}`;
            } else {
              const filters: string[] = [];
              let remainingSpeed = speed;

              while (remainingSpeed > 2) {
                filters.push("atempo=2");
                remainingSpeed /= 2;
              }

              filters.push(`atempo=${remainingSpeed}`);

              audioFilter = filters.join(",");
            }
          }

          const ffmpegArgs = [
            "-i",
            inputPath,

            "-filter_complex",
            hasAudio
              ? `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`
              : `[0:v]${videoFilter}[v]`,

            "-map",
            "[v]",
          ];

          // map audio kalau ada
          if (hasAudio) {
            ffmpegArgs.push("-map", "[a]");
          }

          ffmpegArgs.push("-y", outputPath);

          const ffmpeg = spawn("ffmpeg", ffmpegArgs);

          let stderr = "";

          ffmpeg.stderr.on("data", (data) => {
            const output = data.toString();

            stderr += output;

            const match = output.match(/time=(\d+):(\d+):(\d+\.\d+)/);

            if (match) {
              const hours = Number(match[1]);
              const minutes = Number(match[2]);
              const seconds = Number(match[3]);

              const currentSeconds = hours * 3600 + minutes * 60 + seconds;

              win?.webContents.send("ffmpeg-progress", {
                currentSeconds,
              });
            }
          });

          ffmpeg.on("error", (error) => {
            reject(error);
          });

          ffmpeg.on("close", (code) => {
            if (code === 0) {
              win?.webContents.send("ffmpeg-progress", {
                currentSeconds: 0,
                done: true,
              });

              resolve({
                success: true,
                outputPath,
              });
            } else {
              reject(new Error(stderr));
            }
          });
        }
      );
    });
  }
);
