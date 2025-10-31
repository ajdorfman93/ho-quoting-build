#!/usr/bin/env node

import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import lighthouse from "lighthouse";
import { launch as launchChrome } from "chrome-launcher";
import puppeteer from "puppeteer";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const outputDir = join(repoRoot, "perf", "baseline");

const PORT = Number(process.env.PERF_BASELINE_PORT ?? 4010);
const ROUTES = (process.env.PERF_BASELINE_ROUTES ?? "/,/airtable")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const NPX_COMMAND = process.platform === "win32" ? "npx.cmd" : "npx";

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status === 404) return;
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function getGitInfo() {
  try {
    const [{ stdout: commit }, { stdout: branch }] = await Promise.all([
      execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoRoot }),
      execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: repoRoot,
      }),
    ]);
    return {
      commit: commit.trim(),
      branch: branch.trim(),
    };
  } catch {
    return { commit: null, branch: null };
  }
}

function mapMetrics(metrics) {
  return metrics.reduce((acc, metric) => {
    acc[metric.name] = metric.value;
    return acc;
  }, {});
}

function computeAverageFps(metricMap) {
  const frames = metricMap.Frames;
  const timestamp = metricMap.Timestamp;
  const navigationStart =
    metricMap.NavigationStart ?? metricMap.TimeOrigin ?? 0;
  if (!frames || !timestamp || timestamp <= navigationStart) return null;
  const durationSeconds = timestamp - navigationStart;
  if (durationSeconds <= 0) return null;
  return frames / durationSeconds;
}

async function measureFps(page, durationMs = 1500) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        let frames = 0;
        let start;

        function step(timestamp) {
          if (!start) start = timestamp;
          frames += 1;
          if (timestamp - start >= duration) {
            resolve((frames * 1000) / (timestamp - start));
          } else {
            requestAnimationFrame(step);
          }
        }

        requestAnimationFrame(step);
      }),
    durationMs,
  );
}

async function measureFpsUnderSyntheticLoad(page, durationMs = 1500) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const loadStart = performance.now();
        const loadDuration = duration;
        let frames = 0;
        let start;

        function cpuSpike() {
          const end = performance.now() + 10;
          while (performance.now() < end) {
            // busy loop to simulate heavy compute
          }
          if (performance.now() - loadStart < loadDuration) {
            requestAnimationFrame(cpuSpike);
          }
        }

        requestAnimationFrame(cpuSpike);

        function step(timestamp) {
          if (!start) start = timestamp;
          frames += 1;
          if (timestamp - start >= duration) {
            resolve((frames * 1000) / (timestamp - start));
          } else {
            requestAnimationFrame(step);
          }
        }

        requestAnimationFrame(step);
      }),
    durationMs,
  );
}

async function runLighthouseAudit(url) {
  const chrome = await launchChrome({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        logLevel: "error",
        output: "json",
      },
      {
        extends: "lighthouse:default",
        formFactor: "desktop",
        screenEmulation: {
          disabled: true,
        },
      },
    );

    const lhr = result.lhr;
    const breakdown =
      lhr.audits["mainthread-work-breakdown"]?.details?.items ?? [];
    const cpuByCategory = breakdown.reduce((acc, item) => {
      const key = item.group ?? item.category ?? "other";
      const previous = acc[key] ?? 0;
      return {
        ...acc,
        [key]: previous + item.duration,
      };
    }, {});

    return {
      lighthouseVersion: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime,
      performanceScore: lhr.categories.performance?.score ?? null,
      ttiMs: lhr.audits.interactive?.numericValue ?? null,
      tbtMs: lhr.audits["total-blocking-time"]?.numericValue ?? null,
      lcpMs:
        lhr.audits["largest-contentful-paint"]?.numericValue ?? null,
      cls: lhr.audits["cumulative-layout-shift"]?.numericValue ?? null,
      serverResponseTimeMs:
        lhr.audits["server-response-time"]?.numericValue ?? null,
      mainThreadBreakdownMs: cpuByCategory,
    };
  } finally {
    await chrome.kill();
  }
}

async function captureRuntimeMetrics(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    const client = await page.target().createCDPSession();
    await client.send("Performance.enable");

    const initialMetrics = mapMetrics(
      (await client.send("Performance.getMetrics")).metrics,
    );

    await page.waitForTimeout(2000);

    const postIdleMetrics = mapMetrics(
      (await client.send("Performance.getMetrics")).metrics,
    );

    const heapBaselineBytes = initialMetrics.JSHeapUsedSize ?? null;
    const heapAfterIdleBytes = postIdleMetrics.JSHeapUsedSize ?? null;
    const heapGrowthBytes =
      heapBaselineBytes !== null && heapAfterIdleBytes !== null
        ? heapAfterIdleBytes - heapBaselineBytes
        : null;

    const fpsIdle = await measureFps(page);
    const fpsSyntheticLoad = await measureFpsUnderSyntheticLoad(page);

    return {
      sampleWindowSeconds:
        (postIdleMetrics.Timestamp ?? 0) -
        (postIdleMetrics.NavigationStart ??
          postIdleMetrics.TimeOrigin ??
          0),
      frames: postIdleMetrics.Frames ?? null,
      droppedFrames: postIdleMetrics.DroppedFrameCount ?? null,
      avgFpsSinceNavigation: computeAverageFps(postIdleMetrics),
      heapBaselineBytes,
      heapAfterIdleBytes,
      heapGrowthBytes,
      heapTotalBytes: postIdleMetrics.JSHeapTotalSize ?? null,
      fpsIdle,
      fpsSyntheticLoad,
    };
  } finally {
    await browser.close();
  }
}

async function ensureReadmeSkeleton() {
  const readmePath = join(outputDir, "README.md");
  try {
    await readFile(readmePath, "utf8");
  } catch {
    const content = `# Performance Baselines

This directory stores automated performance captures produced by \`npm run perf:baseline\`.

* \`latest.json\` mirrors the most recent capture.
* Historical captures are stored as \`baseline-YYYYMMDD-HHMMSS.json\`.
`;
    await writeFile(readmePath, content, "utf8");
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await ensureReadmeSkeleton();

  console.log("⏱️  Building production bundle…");
  await runCommand(NPX_COMMAND, ["next", "build"], { cwd: repoRoot });

  console.log("🚀 Starting Next.js server…");
  const serverProcess = spawn(
    NPX_COMMAND,
    ["next", "start", "-p", String(PORT)],
    {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ["inherit", "pipe", "pipe"],
    },
  );

  serverProcess.stdout.on("data", (chunk) => {
    process.stdout.write(`[next] ${chunk}`);
  });
  serverProcess.stderr.on("data", (chunk) => {
    process.stderr.write(`[next] ${chunk}`);
  });

  const shutdown = () => {
    if (!serverProcess.killed) {
      serverProcess.kill("SIGINT");
    }
  };

  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(1);
  });

  try {
    await waitForServer(`http://localhost:${PORT}/`);
    const gitInfo = await getGitInfo();
    const timestamp = new Date().toISOString();

    const metricsByRoute = {};

    for (const route of ROUTES) {
      const url = new URL(route, `http://localhost:${PORT}`).toString();
      console.log(`📊 Collecting metrics for ${url}`);
      const [lighthouseMetrics, runtimeMetrics] = await Promise.all([
        runLighthouseAudit(url),
        captureRuntimeMetrics(url),
      ]);
      metricsByRoute[route] = {
        url,
        lighthouse: lighthouseMetrics,
        runtime: runtimeMetrics,
      };
    }

    const record = {
      capturedAt: timestamp,
      port: PORT,
      git: gitInfo,
      routes: metricsByRoute,
      notes:
        "FPS synthetic load uses a CPU-bound loop to emulate heavy client updates.",
    };

    const fileSuffix = timestamp.replace(/[:.]/g, "-");
    const historicalPath = join(
      outputDir,
      `baseline-${fileSuffix}.json`,
    );
    const latestPath = join(outputDir, "latest.json");

    await writeFile(historicalPath, JSON.stringify(record, null, 2));
    await writeFile(latestPath, JSON.stringify(record, null, 2));

    console.log(`✅ Baseline written to ${historicalPath}`);
  } finally {
    shutdown();
  }
}

main().catch((error) => {
  console.error("Baseline capture failed:", error);
  process.exitCode = 1;
});

