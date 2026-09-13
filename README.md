# Pace

> A simple desktop utility for changing video playback speed and exporting videos.

Pace is a lightweight video speed editor built with **Electron, React, TypeScript, and FFmpeg**.

It was created as a small, focused desktop utility for quickly previewing a video, selecting a playback speed, and exporting the result without needing a full-featured video editor.

---

## ✨ Features

* 🎬 Select and preview local video files
* ⚡ Change video playback speed
* 🎚️ Multiple speed presets
* ⏱️ Display video duration
* 📊 Real-time export progress
* 🔊 Preserve audio when speeding up videos
* 🎨 Light and dark themes
* 📁 Open the exported file location directly
* 🖥️ Native desktop application
* 🧭 Application menu with video, theme, and help options
* 🚀 FFmpeg-powered video processing

### Supported Video Formats

Pace currently supports:

* `.mp4`
* `.mov`
* `.mkv`
* `.webm`
* `.avi`
* `.m4v`

---

## 🖥️ Preview

https://github.com/user-attachments/assets/64db6fb7-fc3a-47d9-b662-4a2ddbb6d5eb

---

## ⚙️ How It Works

Pace uses Electron's main process to handle filesystem access and video processing, while the React renderer process handles the user interface.

The basic flow is:

```text
┌─────────────────────┐
│      React UI       │
│                     │
│ Select Video        │
│ Preview Video       │
│ Select Speed        │
│ Export Video        │
└──────────┬──────────┘
           │
           │ IPC
           ▼
┌─────────────────────┐
│   Electron Main     │
│                     │
│ File Dialog         │
│ Read Video          │
│ Run FFmpeg          │
│ Track Progress      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│       FFmpeg        │
│                     │
│ Video Processing    │
│ Audio Processing    │
└──────────┬──────────┘
           │
           ▼
      Output Video
```

### IPC Communication

The renderer communicates with Electron's main process through IPC.

For example:

```text
React Renderer
      │
      │ ipcRenderer.invoke()
      ▼
Electron Main
      │
      │ spawn()
      ▼
    FFmpeg
```

This keeps filesystem and process-level operations outside the renderer.

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Desktop

* Electron
* Electron IPC

### Video Processing

* FFmpeg
* FFprobe

---

## 📋 Requirements

Before running Pace locally, make sure you have:

* Node.js
* npm
* FFmpeg
* FFprobe

You can verify FFmpeg is installed by running:

```bash
ffmpeg -version
```

And FFprobe:

```bash
ffprobe -version
```

Both commands should be available from your system `PATH`.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ajimustofa/pace.git
```

Then:

```bash
cd pace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Pace should open as an Electron desktop application.

---

## 📦 Build

To create a production build:

```bash
npm run build
```

Depending on the project configuration, the generated application/package will be placed in the configured build output directory.

---

## 🎯 Available Speed Options

Pace currently provides these speed presets:

|  Speed | Description    |
| -----: | -------------- |
| `0.5x` | Half speed     |
|   `1x` | Original speed |
| `1.5x` | 1.5× faster    |
|   `2x` | 2× faster      |
|   `4x` | 4× faster      |
|   `8x` | 8× faster      |

The exported file uses the selected speed in its filename.

For example:

```text
video.mp4
```

becomes:

```text
video-2x.mp4
```

---

## 🎞️ Video Processing

Pace uses FFmpeg filters to modify video and audio speed.

For video, Pace uses:

```text
setpts=PTS/<speed>
```

For audio, Pace uses FFmpeg's `atempo` filter.

For speeds above `2x`, multiple `atempo` filters can be chained because a single `atempo` filter has a limited supported range.

For example, a higher speed may be processed using:

```text
atempo=2,atempo=2
```

This allows Pace to support speeds such as `4x` and `8x`.

---

## 📊 Export Progress

During export, FFmpeg's output is monitored to estimate the current processing position.

Pace extracts the current timestamp from FFmpeg output:

```text
time=00:00:12.50
```

and converts it into a percentage based on the original video's duration.

The renderer then updates the progress indicator in real time.

When FFmpeg finishes successfully, Pace sends a completion event and sets the progress to `100%`.

---

## 🌗 Themes

Pace supports:

* Light theme
* Dark theme

The selected theme is stored locally so it can persist between application sessions.

The application menu also provides theme controls:

```text
Theme
├── Light
└── Dark
```

---

## 🗂️ Project Structure

A simplified project structure looks like this:

```text
pace/
├── electron/
│   ├── main.ts
│   └── preload.ts
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The exact structure may change as the project evolves.

---

## 🔐 Security

Pace uses Electron's IPC architecture to communicate between the renderer and main process.

The renderer does not directly execute FFmpeg or access Node.js filesystem APIs.

Instead, operations such as:

* selecting files
* reading local videos
* running FFmpeg
* opening output folders

are handled by the Electron main process.

---

## 🧩 Why Pace?

The goal of Pace is intentionally simple:

> **Change the pace of a video without opening a full video editor.**

There are many powerful video editors available, but sometimes you just want to make a video faster or slower and export it.

Pace focuses on that specific use case.

---

## 🤝 Contributing

Contributions, ideas, and suggestions are welcome.

If you find a bug or have an idea for a feature, feel free to open an issue.

For larger changes, opening an issue first to discuss the proposed change is recommended.

---

## 📄 License

This project is currently provided for personal and educational use.

*Add a license here if you decide to publish Pace under an open-source license.*

For example:

```text
MIT License
```

---

## 👤 Author

**Aji Mustofa**

GitHub: [@pepega90](https://github.com/pepega90)

---

## ❤️ Built With

Pace was built as a small personal project to explore desktop application development with:

```text
Electron
   +
React
   +
TypeScript
   +
Vite
   +
FFmpeg
```

Simple tools can be useful too.

**Pace — Control your video. Control your pace.**
