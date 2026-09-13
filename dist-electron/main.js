import { app, BrowserWindow, Menu, ipcMain, shell, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let menuContextTemplate = [
  {
    label: "Pace",
    submenu: [
      {
        label: "Quit",
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: "Theme",
    submenu: [
      {
        label: "Light",
        click: () => {
          win == null ? void 0 : win.webContents.send("theme", "light");
        }
      },
      {
        label: "Dark",
        click: () => {
          win == null ? void 0 : win.webContents.send("theme", "dark");
        }
      }
    ]
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
            detail: "A simple utility for changing video speed. made by Aji Mustofa (@pepega90)",
            buttons: ["Close"]
          });
        }
      },
      {
        label: "Github",
        click: () => {
          shell.openExternal("https://github.com/pepega90");
        }
      }
    ]
  }
];
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    },
    resizable: true,
    width: 1280,
    height: 720
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  const menu = Menu.buildFromTemplate(menuContextTemplate);
  Menu.setApplicationMenu(menu);
});
ipcMain.handle("show_output_folder", async (_, filepath) => {
  await shell.showItemInFolder(filepath);
});
ipcMain.handle("select_video", async (event) => {
  const res = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Video",
        extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"]
      }
    ]
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});
ipcMain.handle("read_video", async (_, videoPath) => {
  const buffer = await fs.readFile(videoPath);
  const extension = path.extname(videoPath).toLowerCase();
  const mimeTypes = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska"
  };
  const mimeType = mimeTypes[extension] ?? "application/octet-stream";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
});
ipcMain.handle(
  "speedup_video",
  async (_, inputPath, outputPath, speed) => {
    return new Promise((resolve, reject) => {
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
          inputPath
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
              const filters = [];
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
            hasAudio ? `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]` : `[0:v]${videoFilter}[v]`,
            "-map",
            "[v]"
          ];
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
              win == null ? void 0 : win.webContents.send("ffmpeg-progress", {
                currentSeconds
              });
            }
          });
          ffmpeg.on("error", (error) => {
            reject(error);
          });
          ffmpeg.on("close", (code) => {
            if (code === 0) {
              win == null ? void 0 : win.webContents.send("ffmpeg-progress", {
                currentSeconds: 0,
                done: true
              });
              resolve({
                success: true,
                outputPath
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
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
