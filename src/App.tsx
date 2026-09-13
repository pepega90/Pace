import { useEffect, useState } from "react";

const speedOptions = [0.5, 1, 1.5, 2, 4, 8];

function App() {
  const [speed, setSpeed] = useState(2);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [exporPath, setExportPath] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const handleSetTheme = (
      _event: unknown,
      theme: "light" | "dark"
    ) => {
      setIsDark(theme === "dark");
    };
    window.ipcRenderer.on("theme", handleSetTheme);
    return () => {
      window.ipcRenderer.off("theme", handleSetTheme);
    };
  }, []);

  useEffect(() => {
    const handleProgress = (
      _event: unknown,
      data: {
        currentSeconds: number;
        done?: boolean;
      }
    ) => {
      if (data.done) {
        setProgress(100);
        return;
      }

      if (duration <= 0) return;

      const percentage = (data.currentSeconds / duration) * 100;

      setProgress(Math.min(percentage, 100));
    };

    window.ipcRenderer.on("ffmpeg-progress", handleProgress);

    return () => {
      window.ipcRenderer.off("ffmpeg-progress", handleProgress);
    };
  }, [duration]);

  const exportVideo = async () => {
    if (!videoPath) return;

    setIsExporting(true);
    setProgress(0);
    setExportPath(null);

    try {
      const ext = videoPath.substring(videoPath.lastIndexOf("."));

      const baseName = videoPath.substring(
        0,
        videoPath.lastIndexOf(".")
      );

      const outputPath = `${baseName}-${speed}x${ext}`;

      const result = await window.ipcRenderer.invoke(
        "speedup_video",
        videoPath,
        outputPath,
        speed
      );

      if (result?.success) {
        setExportPath(result.outputPath);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const uploadVideo = async () => {
    const path = await window.ipcRenderer.invoke("select_video");

    if (!path) return;

    setVideoPath(path);

    const url = await window.ipcRenderer.invoke(
      "read_video",
      path
    );

    setVideoUrl(url);
  };

  const removeVideo = () => {
    setVideoPath(null);
    setVideoUrl(null);
    setDuration(0);
    setProgress(0);
    setExportPath(null);
  };

  const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00";
    }

    const totalSeconds = Math.round(seconds);

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  };

  return (
    <div className="min-h-screen w-full bg-white text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">

        {/* Header */}
        <header className="mb-6 flex shrink-0 items-center justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Pace
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Simple utility video speed editor
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-lg transition hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              title={
                isDark
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">

            {/* LEFT */}
            <section className="min-w-0 space-y-4">

              {/* Video Preview */}
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">

                {videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    onLoadedMetadata={(e) => {
                      setDuration(e.currentTarget.duration);
                    }}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-center">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-2xl dark:bg-zinc-800">
                      ▶
                    </div>

                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Video Preview
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Your video will appear here
                    </p>

                  </div>
                )}

              </div>

              {/* Select Video */}
              <button
                onClick={uploadVideo}
                type="button"
                className="flex w-full items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-7 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
              >

                <span className="text-2xl text-zinc-500 dark:text-zinc-300">
                  ＋
                </span>

                <div className="text-left">

                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Select a video
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    MP4, MOV, MKV, WebM and other formats
                  </p>

                </div>

              </button>

              {/* Selected File */}
              {videoPath && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800">
                      🎬
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {videoPath.split("\\").pop()}
                      </p>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {videoPath}
                      </p>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={removeVideo}
                    className="ml-4 shrink-0 rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                  >
                    Remove
                  </button>

                </div>
              )}

            </section>

            {/* RIGHT */}
            <aside className="h-fit rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">

              <div className="space-y-6">

                {/* Speed */}
                <div>

                  <h2 className="text-sm font-semibold">
                    Playback Speed
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Choose how fast the video should play.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">

                    {speedOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSpeed(option)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          speed === option
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                            : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                        }`}
                      >
                        {option}x
                      </button>
                    ))}

                  </div>

                </div>

                {/* Custom Speed */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Custom Speed
                  </label>

                  <div className="flex items-center gap-2">

                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={speed}
                      onChange={(e) =>
                        setSpeed(Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-zinc-400"
                    />

                    <span className="text-sm text-zinc-500">
                      x
                    </span>

                  </div>

                </div>

                {/* Divider */}
                <div className="border-t border-zinc-200 dark:border-zinc-800" />

                {/* Summary */}
                <div className="space-y-3 text-xs">

                  <div className="flex justify-between">

                    <span className="text-zinc-500">
                      Original duration
                    </span>

                    <span className="text-zinc-700 dark:text-zinc-300">
                      {formatDuration(duration)}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-zinc-500">
                      Speed
                    </span>

                    <span className="text-zinc-700 dark:text-zinc-300">
                      {speed}x
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-zinc-500">
                      Estimated duration
                    </span>

                    <span className="text-zinc-700 dark:text-zinc-300">
                      {formatDuration(duration / speed)}
                    </span>

                  </div>

                </div>

                {/* Export */}
                <button
                  onClick={exportVideo}
                  disabled={!videoPath || isExporting}
                  type="button"
                  className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {isExporting
                    ? "Speed up your video..."
                    : progress === 100
                      ? "Export completed successfully."
                      : "Ready to export your video."}
                </button>

                {/* Open Output Folder */}
                {exporPath && (
                  <button
                    onClick={() =>
                      window.ipcRenderer.invoke(
                        "show_output_folder",
                        exporPath
                      ) 
                    }
                    className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                  Open Output Folder
                  </button>
                )}

              </div>

            </aside>

          </div>

          {/* Progress */}
          <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">

            <div className="mb-3 flex items-center justify-between">

              <div>

                <p className="text-sm font-medium">
                  Processing
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Processing will appear here later
                </p>

              </div>

              <span className="text-sm font-medium text-zinc-500">
                {Math.round(progress)}%
              </span>

            </div>

            {/* Progress Bar */}
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">

              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-200 dark:bg-white"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>
          </section>

        </main>

      </div>
    </div>
  );
}

export default App
