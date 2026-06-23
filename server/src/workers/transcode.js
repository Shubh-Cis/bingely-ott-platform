const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ----------------------------------------------------------------------------
// Adaptive-bitrate (ABR) HLS transcode.
//
// One ffmpeg pass produces a 4-rung ladder (360/480/720/1080p) plus a master
// playlist. The player downloads master.m3u8, sees the variants, and switches
// rungs based on bandwidth. Output layout (all under `outDir`):
//
//   master.m3u8                ← the file the player opens (lists the variants)
//   stream_0/playlist.m3u8     ← 360p playlist + its segments (segment_000.ts …)
//   stream_1/playlist.m3u8     ← 480p
//   stream_2/playlist.m3u8     ← 720p
//   stream_3/playlist.m3u8     ← 1080p
//
// The worker uploads this whole tree (preserving subfolders) to
// "<videoId>/…", so the master ends up at "<videoId>/master.m3u8".
// ----------------------------------------------------------------------------

// rung = [label, width, height, video kbps, audio kbps]
const LADDER = [
  ["360p", 640, 360, 800, 96],
  ["480p", 842, 480, 1400, 128],
  ["720p", 1280, 720, 2800, 128],
  ["1080p", 1920, 1080, 5000, 192],
];

function buildArgs(inputPath, outDir) {
  const n = LADDER.length;

  // Pre-create the per-variant output folders (ffmpeg won't always mkdir them).
  for (let i = 0; i < n; i++) fs.mkdirSync(path.join(outDir, `stream_${i}`), { recursive: true });

  // Split the decoded video into N branches and scale each one.
  const splitLabels = LADDER.map((_, i) => `[v${i}]`).join("");
  const scales = LADDER.map(
    ([, w, h], i) => `[v${i}]scale=w=${w}:h=${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2[v${i}out]`
  ).join(";");
  const filter = `[0:v]split=${n}${splitLabels};${scales}`;

  const args = ["-y", "-i", inputPath, "-filter_complex", filter];

  // Map + encode each video rung.
  LADDER.forEach(([, , , vkbps], i) => {
    args.push(
      "-map", `[v${i}out]`,
      `-c:v:${i}`, "libx264",
      `-b:v:${i}`, `${vkbps}k`,
      `-maxrate:v:${i}`, `${Math.round(vkbps * 1.07)}k`,
      `-bufsize:v:${i}`, `${Math.round(vkbps * 1.5)}k`,
      "-preset", "veryfast",
      "-g", "48", "-keyint_min", "48", "-sc_threshold", "0"
    );
  });

  // One audio rendition per rung (reuse the source audio if present).
  LADDER.forEach((_, i) => args.push("-map", "a:0?"));
  LADDER.forEach(([, , , , akbps], i) => args.push(`-c:a:${i}`, "aac", `-b:a:${i}`, `${akbps}k`, "-ac", "2"));

  const varMap = LADDER.map((_, i) => `v:${i},a:${i}`).join(" ");

  args.push(
    "-f", "hls",
    "-hls_time", "6",
    "-hls_playlist_type", "vod",
    "-hls_flags", "independent_segments",
    "-hls_segment_filename", path.join(outDir, "stream_%v", "segment_%03d.ts"),
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", varMap,
    path.join(outDir, "stream_%v", "playlist.m3u8")
  );

  return args;
}

// Run ffmpeg → writes the ABR ladder into outDir. Resolves on success.
function transcodeToHls(inputPath, outDir, onLog) {
  return new Promise((resolve, reject) => {
    const args = buildArgs(inputPath, outDir);
    const ff = spawn("ffmpeg", args);
    ff.stderr.on("data", (d) => onLog && onLog(d.toString().trim()));
    ff.on("error", (err) => reject(new Error(`ffmpeg failed to start: ${err.message}`)));
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))
    );
  });
}

// Recursively list files under dir, returning paths relative to dir (POSIX-style
// keys for S3). Used by the worker to upload the whole HLS tree.
function listFilesRecursive(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

module.exports = { transcodeToHls, listFilesRecursive, LADDER };
