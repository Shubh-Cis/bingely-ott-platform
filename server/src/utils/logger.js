// Two loggers:
//   • logger      — a plain leveled logger (info/warn/error/debug)
//   • createFlow  — the original step-by-step flow tracer, ported from the
//                   pipeline so the upload/transcode flow still reads nicely in
//                   the terminal. Each flow gets a short trace id.

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

function ts() {
  return new Date().toISOString().split("T")[1].replace("Z", "");
}

const logger = {
  info: (msg, ...rest) => console.log(`${colors.dim}${ts()}${colors.reset} ${colors.blue}INFO${colors.reset}  ${msg}`, ...rest),
  warn: (msg, ...rest) => console.warn(`${colors.dim}${ts()}${colors.reset} ${colors.yellow}WARN${colors.reset}  ${msg}`, ...rest),
  error: (msg, ...rest) => console.error(`${colors.dim}${ts()}${colors.reset} ${colors.red}ERROR${colors.reset} ${msg}`, ...rest),
  debug: (msg, ...rest) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`${colors.dim}${ts()}${colors.reset} ${colors.dim}DEBUG ${msg}${colors.reset}`, ...rest);
    }
  },
};

// Create a logger bound to one request/flow.
// label = which flow ("UPLOAD-URL", "NOTIFY", "TRANSCODE", ...)
function createFlow(label) {
  const id = Math.random().toString(36).slice(2, 7); // short trace id
  const tag = `${colors.magenta}[${label}:${id}]${colors.reset}`;
  let step = 0;

  return {
    id,
    step(msg, data) {
      step += 1;
      const line = `${colors.dim}${ts()}${colors.reset} ${tag} ${colors.cyan}STEP ${step}${colors.reset} → ${msg}`;
      if (data !== undefined) console.log(line, colors.dim, data, colors.reset);
      else console.log(line);
    },
    ok(msg, data) {
      const line = `${colors.dim}${ts()}${colors.reset} ${tag} ${colors.green}✓ DONE${colors.reset} → ${msg}`;
      if (data !== undefined) console.log(line, colors.dim, data, colors.reset);
      else console.log(line);
    },
    warn(msg) {
      console.log(`${colors.dim}${ts()}${colors.reset} ${tag} ${colors.yellow}⚠ ${msg}${colors.reset}`);
    },
    fail(msg) {
      console.log(`${colors.dim}${ts()}${colors.reset} ${tag} ${colors.red}✗ ${msg}${colors.reset}`);
    },
  };
}

module.exports = { logger, createFlow };
