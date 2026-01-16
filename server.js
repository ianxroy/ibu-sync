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
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "5");
const MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE || "15");
const JOB_TIMEOUT_MS = parseInt(process.env.JOB_TIMEOUT_MS || "60000");
const BROWSER_RESTART_LIMIT = parseInt(
  process.env.BROWSER_RESTART_LIMIT || "100"
);

// Scraper specific timeouts
const PAGE_LOAD_TIMEOUT = parseInt(process.env.PAGE_LOAD_TIMEOUT || "45000");
const SELECTOR_TIMEOUT = parseInt(process.env.SELECTOR_TIMEOUT || "30000");
const TARGET_URL =
  process.env.TARGET_URL || "https://systems.bicol-u.edu.ph/ibu-beta";
const RECAPTCHA_SECRET_KEY =
  process.env.RECAPTCHA_SECRET_KEY ||
  "6LfU0EwsAAAAACkiGQvoVU2yvjpedXcTyNWFOjsJ";

// ================= MIDDLEWARE =================
// TRUST PROXY IS REQUIRED FOR RATE LIMITER BEHIND PROXIES (RAILWAY/DOCKER)
app.set("trust proxy", 1);

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
  validate: { xForwardedForHeader: false },
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

const verifyCaptcha = async (token) => {
  if (!token) return false;
  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
      {
        method: "POST",
      }
    );
    const data = await response.json();
    return data.success;
  } catch (e) {
    console.error("Captcha verification error:", e);
    return false;
  }
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
    await page.goto(`${TARGET_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
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

    // Check if we were redirected away from login (e.g. session active)
    const currentUrl = page.url();
    console.log(`[Job] Current URL after initial navigation: ${currentUrl}`);

    if (currentUrl.includes("/login")) {
      // Only perform authentication if we are on a login page
      await page.waitForSelector("#student-id-1", {
        timeout: SELECTOR_TIMEOUT,
      });

      await page.type("#student-id-1", studentId);
      await page.type("#student-password-1", password);

      res.write(
        JSON.stringify({ type: "status", message: "Authenticating..." }) + "\n"
      );

      await Promise.all([
        page.click("#submit"),
        page
          .waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: PAGE_LOAD_TIMEOUT,
          })
          .catch(() => null),
      ]);

      // Check login success
      const url = page.url();
      console.log(`[Job] Current URL after login attempt: ${url}`);

      if (url.includes("/login")) {
        // Fix: Trim whitespace from error message to prevent JSON issues and massive logs
        const errorMsg = await page
          .$eval(".alert", (el) => el.textContent)
          .then((t) => t.trim())
          .catch(() => "Invalid Credentials");
        throw new Error(
          errorMsg.includes("Invalid")
            ? "Invalid Student ID or Password"
            : errorMsg
        );
      }
    } else {
      console.log(
        `[Job] Redirected to ${currentUrl} (session active?), skipping login form.`
      );
      res.write(
        JSON.stringify({
          type: "status",
          message: "Session restored, skipping login...",
        }) + "\n"
      );
    }

    res.write(
      JSON.stringify({
        type: "status",
        message: "Fetching Academic Records...",
      }) + "\n"
    );

    // --- GRADES ---
    await page.goto(`${TARGET_URL}/grades`, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT,
    });
    console.log(`[Job] Current URL after navigating to grades: ${page.url()}`);

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

      // 1. Select the Option
      await page.select("#semesters", sem.value);

      // 2. Force Dispatch Change Event (Critical Fix)
      await page.evaluate((val) => {
        const el = document.querySelector("#semesters");
        el.value = val;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, sem.value);

      // 3. Wait for Network Idle (Wait for AJAX table update)
      try {
        // Wait for 500ms of no network activity, up to 5s.
        // This ensures the grade data fetch is complete.
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
      } catch (e) {
        // Fallback if network idle times out (slow server or constant polling)
        await new Promise((r) => setTimeout(r, 2000));
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

app.post("/api/scrape", async (req, res) => {
  const { studentId, password, captchaToken } = req.body;

  // 4. Input Validation
  if (
    !studentId ||
    !password ||
    studentId.length > 20 ||
    password.length > 100
  ) {
    return res.status(400).json({ error: "Invalid credentials format" });
  }

  // 5. Captcha Verification
  const isHuman = await verifyCaptcha(captchaToken);
  if (!isHuman) {
    return res
      .status(403)
      .json({ error: "CAPTCHA verification failed. Please try again." });
  }

  // 6. Queue Limit Check
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
