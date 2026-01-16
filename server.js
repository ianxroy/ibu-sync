import express from "express";
import puppeteer from "puppeteer-core";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ================= CONFIGURATION =================
const PORT = process.env.PORT || 8080;
const MAX_CONCURRENT_JOBS = 5; // Max tabs open at once
const MAX_QUEUE_SIZE = 15; // Max users waiting
const JOB_TIMEOUT_MS = 60000; // 60s hard timeout per scrape
const BROWSER_RESTART_LIMIT = 100; // Restart browser after this many jobs to prevent leaks

// ================= MIDDLEWARE =================
app.use(cors());
// 1. Body Size Limit (Security)
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "dist")));
app.use("/ibu-sync", express.static(path.join(__dirname, "dist")));

// 2. Rate Limiting (Security)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/scrape", limiter);

// ================= STATE MANAGEMENT =================
let browser = null;
let jobsCompleted = 0;

// Queue System
const queue = [];
let activeJobs = 0;

// ================= BROWSER MANAGEMENT =================
const initBrowser = async () => {
  if (browser && browser.isConnected()) return browser;

  console.log("[System] Launching Chrome Instance...");
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Critical for Docker/Render
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--hide-scrollbars",
      "--disable-notifications",
      "--disable-extensions",
    ],
    headless: "new",
    defaultViewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  return browser;
};

const restartBrowser = async () => {
  if (browser) {
    try {
      await browser.close();
    } catch (e) {
      console.error("[System] Error closing browser:", e);
    }
  }
  browser = null;
  jobsCompleted = 0;
  return initBrowser();
};

// ================= UTILS =================
const getEquivalent = (grade) => {
  const map = {
    "1.0": "99-100",
    1.1: "98",
    1.2: "97",
    1.3: "96",
    1.4: "95",
    1.5: "94",
    1.6: "93",
    1.7: "92",
    1.8: "91",
    1.9: "90",
    "2.0": "89",
    2.1: "88",
    2.2: "87",
    2.3: "86",
    2.4: "85",
    2.5: "84",
    2.6: "82-83",
    2.7: "80-81",
    2.8: "78-79",
    2.9: "76-77",
    "3.0": "75",
    "5.0": "Failure",
  };
  return map[grade] || "N/A";
};

// Stealth scripts to bypass basic detection
const applyStealth = async (page) => {
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });
};

// ================= JOB PROCESSING =================
const processQueue = async () => {
  if (activeJobs >= MAX_CONCURRENT_JOBS || queue.length === 0) return;

  const job = queue.shift();
  activeJobs++;

  // Notify others in queue of their new position
  queue.forEach((qJob, index) => {
    qJob.res.write(
      JSON.stringify({
        type: "queue",
        position: index + 1,
        message: `Waiting in queue (Pos: ${index + 1})...`,
      }) + "\n"
    );
  });

  try {
    await runScrapeJob(job.req, job.res);
  } catch (error) {
    console.error(`[Job] Error: ${error.message}`);
    if (!job.res.writableEnded) {
      job.res.write(
        JSON.stringify({
          type: "error",
          error: error.message || "Server Error",
        }) + "\n"
      );
      job.res.end();
    }
  } finally {
    activeJobs--;
    jobsCompleted++;
    if (jobsCompleted > BROWSER_RESTART_LIMIT) {
      console.log("[System] Periodic browser restart...");
      await restartBrowser();
    }
    processQueue();
  }
};

const runScrapeJob = async (req, res) => {
  const { studentId, password } = req.body;
  let page = null;

  // 3. Client Disconnect Handling
  req.on("close", async () => {
    if (page && !page.isClosed()) {
      console.log(`[Job] Client disconnected: ${studentId}`);
      try {
        await page.close();
      } catch (e) {}
    }
  });

  try {
    const browserInstance = await initBrowser();
    page = await browserInstance.newPage();

    // 4. Input Validation (Already done via body parser limits, but strict type check)
    if (typeof studentId !== "string" || typeof password !== "string") {
      throw new Error("Invalid input format");
    }

    // Safety Timeout
    const timeoutId = setTimeout(async () => {
      if (page && !page.isClosed()) {
        console.log(`[Job] Timeout killing: ${studentId}`);
        await page.close();
        if (!res.writableEnded) {
          res.write(
            JSON.stringify({ type: "error", error: "Operation Timed Out" }) +
              "\n"
          );
          res.end();
        }
      }
    }, JOB_TIMEOUT_MS);

    await applyStealth(page);

    // Optimize resource loading
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (
        ["image", "media", "font", "stylesheet"].includes(
          request.resourceType()
        )
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    res.write(
      JSON.stringify({
        type: "status",
        message: "Connecting to University Portal...",
      }) + "\n"
    );

    // --- LOGIN ---
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const captchaDetected = await page.evaluate(
      () =>
        document.body.innerText.includes("captcha") ||
        window.location.href.includes(".well-known")
    );
    if (captchaDetected)
      throw new Error(
        "University Firewall Blocked Request. Try again in 5 mins."
      );

    // WAIT FOR SELECTOR - FIXES "No element found" error on slow loads
    await page.waitForSelector("#student-id-1", { timeout: 15000 });

    await page.type("#student-id-1", studentId);
    await page.type("#student-password-1", password);

    res.write(
      JSON.stringify({ type: "status", message: "Authenticating..." }) + "\n"
    );

    await Promise.all([
      page.click("#submit"),
      page
        .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 })
        .catch(() => null),
    ]);

    // Check login success
    const url = page.url();
    if (url.includes("/login")) {
      const errorMsg = await page
        .$eval(".alert", (el) => el.textContent)
        .catch(() => "Invalid Credentials");
      throw new Error(
        errorMsg.includes("Invalid")
          ? "Invalid Student ID or Password"
          : errorMsg
      );
    }

    res.write(
      JSON.stringify({
        type: "status",
        message: "Fetching Academic Records...",
      }) + "\n"
    );

    // --- GRADES ---
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/grades", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const semesters = await page.evaluate(() => {
      const select = document.querySelector("#semesters");
      if (!select) return [];
      return Array.from(select.options)
        .filter((opt) => opt.value && !opt.disabled)
        .map((opt) => ({ value: opt.value, text: opt.textContent.trim() }))
        .reverse();
    });

    const finalResults = [];

    for (const sem of semesters) {
      // Send heartbeat to keep connection alive
      res.write(
        JSON.stringify({ type: "status", message: `Reading ${sem.text}...` }) +
          "\n"
      );

      await page.select("#semesters", sem.value);

      // Wait for table update (naive check: wait for at least one row or timeout small)
      try {
        await page.waitForFunction(
          () => document.querySelectorAll("table tbody tr").length > 0,
          { timeout: 4000 }
        );
      } catch (e) {
        /* Ignore empty sems */
      }

      const grades = await page.evaluate((semName) => {
        const rows = Array.from(document.querySelectorAll("table tbody tr"));
        return rows
          .map((row) => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 3) return null;
            const subject = cells[1].textContent.trim();
            const grade = cells[2].textContent.trim();
            if (
              !subject ||
              !grade ||
              subject.toLowerCase().includes("no subject")
            )
              return null;
            return { semester: semName, subject, grade };
          })
          .filter(Boolean);
      }, sem.text);

      finalResults.push(...grades);
    }

    // Process Equivalents
    const processed = finalResults.map((g) => ({
      ...g,
      equivalent: getEquivalent(g.grade),
    }));

    clearTimeout(timeoutId);

    // Final Success Response
    res.write(JSON.stringify({ type: "success", data: processed }) + "\n");
    res.end();

    await page.close();
  } catch (error) {
    if (page && !page.isClosed()) await page.close();
    throw error; // Handled by processQueue wrapper
  }
};

// ================= ROUTES =================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    activeJobs,
    queueLength: queue.length,
    freeSlots: MAX_CONCURRENT_JOBS - activeJobs,
  });
});

app.post("/api/scrape", (req, res) => {
  const { studentId, password } = req.body;

  // 4. Input Validation
  if (
    !studentId ||
    !password ||
    studentId.length > 20 ||
    password.length > 100
  ) {
    return res.status(400).json({ error: "Invalid credentials format" });
  }

  // 5. Queue Limit Check
  if (queue.length >= MAX_QUEUE_SIZE) {
    return res.status(503).json({
      error:
        "Server is busy (High Traffic). Please try again in a few minutes.",
    });
  }

  // Set Headers for Streaming
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Add to Queue
  const queuePosition = queue.length + 1;
  res.write(
    JSON.stringify({
      type: "queue",
      position: queuePosition,
      message: `Queued (Position: ${queuePosition})...`,
    }) + "\n"
  );

  queue.push({ req, res });
  processQueue();
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ================= STARTUP =================
app.listen(PORT, () => {
  console.log(`🚀 iBU Sync Server running on port ${PORT}`);
  console.log(
    `System: ${MAX_CONCURRENT_JOBS} Workers, ${MAX_QUEUE_SIZE} Queue Limit`
  );
});
