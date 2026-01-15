import express from "express";
import { Builder, By, until, Select } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DATA PRIVACY POLICY
 * 1. Student credentials (ID and Password) are used only for the active session.
 * 2. This server does not store, log, or share any personal information or grades.
 * 3. All data is processed in-memory and discarded immediately after the response is sent.
 */

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the build directory
// Support both root access and sub-path access for consistency
app.use(express.static(path.join(__dirname, "dist")));
app.use("/ibu-sync", express.static(path.join(__dirname, "dist")));

app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", platform: "Railway", timestamp: Date.now() });
});

const randomDelay = (min, max) =>
  new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min))
  );

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

// --- ROBUST STEALTH INJECTION SCRIPT ---
// This runs before the page loads to scrub automation traces
const STEALTH_INJECTION = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
      Promise.resolve({ state: 'granted' }) :
      originalQuery(parameters)
  );
`;

app.post("/api/scrape", async (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  console.log(`[Scraper] Starting sync for ${studentId}...`);

  const options = new chrome.Options();

  // Minimal flags
  options.addArguments("--headless=new");
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--disable-gpu");
  options.addArguments("--window-size=1366,768");
  options.addArguments("--start-maximized");

  // Real User Agent
  options.addArguments(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  options.excludeSwitches("enable-automation");
  options.setUserPreferences({
    credentials_enable_service: false,
    "profile.password_manager_enabled": false,
    useAutomationExtension: false,
  });

  if (process.env.CHROME_BIN) options.setBinaryPath(process.env.CHROME_BIN);

  let driver;

  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // --- CRITICAL: CDP STEALTH INJECTION ---
    try {
      const cdp = await driver.createCDPConnection("page");
      await cdp.execute("Page.addScriptToEvaluateOnNewDocument", {
        source: STEALTH_INJECTION,
      });
      await cdp.execute("Network.setUserAgentOverride", {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        platform: "Windows",
        acceptLanguage: "en-US,en;q=0.9",
      });
    } catch (e) {
      console.warn("CDP Injection failed, falling back to standard...", e);
    }

    const TARGET_URL = "https://systems.bicol-u.edu.ph/ibu-beta/login";

    // Attempt navigation with Retry Logic
    let attempts = 0;
    let success = false;

    while (attempts < 2 && !success) {
      attempts++;
      try {
        console.log(`[Link Log] Navigation Attempt ${attempts}: ${TARGET_URL}`);
        await driver.get(TARGET_URL);
        await randomDelay(2000, 3000);

        const url = await driver.getCurrentUrl();
        if (url.includes("captcha") || url.includes(".well-known")) {
          console.log("[Scraper] CAPTCHA detected. Waiting for redirect...");
          await randomDelay(5000, 6000);
          const checkUrl = await driver.getCurrentUrl();
          if (
            checkUrl.includes("captcha") ||
            checkUrl.includes(".well-known")
          ) {
            await driver.navigate().refresh();
            await randomDelay(3000, 5000);
          }
        } else {
          success = true;
        }
      } catch (e) {
        console.log(`[Scraper] Nav error: ${e.message}`);
      }
    }

    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes("captcha") || currentUrl.includes(".well-known")) {
      throw new Error("CAPTCHA_DETECTED");
    }

    // --- LOGIN FORM ---
    const idInput = await driver.wait(
      until.elementLocated(By.id("student-id-1")),
      10000
    );

    await idInput.sendKeys(studentId);
    await randomDelay(300, 500);

    await driver.findElement(By.id("student-password-1")).sendKeys(password);
    await randomDelay(300, 500);

    const submitBtn = await driver.findElement(By.id("submit"));
    await driver.executeScript("arguments[0].click();", submitBtn);

    // --- POST LOGIN ---
    console.log(
      "[Link Log] Credentials submitted, waiting for Dashboard redirect..."
    );

    try {
      // FIX: Wait for exact Dashboard URL (or trailing slash variant)
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return (
          url === "https://systems.bicol-u.edu.ph/ibu-beta/" ||
          url === "https://systems.bicol-u.edu.ph/ibu-beta"
        );
      }, 20000);
    } catch (e) {
      const postLoginUrl = await driver.getCurrentUrl();
      console.log(
        `[Link Log] Post-login wait timeout. Current URL: ${postLoginUrl}`
      );
      if (postLoginUrl.includes("/login")) {
        throw new Error("LOGIN_FAILED");
      }
      throw e;
    }

    console.log(
      `[Link Log] Dashboard Reached: ${await driver.getCurrentUrl()}`
    );

    // --- GRADES ---
    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/grades");

    const dropdown = await driver.wait(
      until.elementLocated(By.id("semesters")),
      15000
    );
    const select = new Select(dropdown);
    const optionsList = await select.getOptions();

    const validOptions = [];
    for (let opt of optionsList) {
      const val = await opt.getAttribute("value");
      const disabled = await opt.getAttribute("disabled");
      if (val && !disabled) {
        validOptions.push({ value: val, text: await opt.getText() });
      }
    }

    const chronologicalOrder = validOptions.reverse();
    const finalResults = [];

    for (const opt of chronologicalOrder) {
      const currentSelect = new Select(
        await driver.findElement(By.id("semesters"))
      );
      await currentSelect.selectByValue(opt.value);

      try {
        await driver.wait(async () => {
          const rows = await driver.findElements(By.css("table tbody tr"));
          return rows.length > 0;
        }, 6000);
      } catch (e) {
        continue;
      }

      const rows = await driver.findElements(By.css("table tbody tr"));
      for (const row of rows) {
        const cells = await row.findElements(By.tagName("td"));
        if (cells.length >= 3) {
          const subject = await cells[1].getText();
          const grade = await cells[2].getText();
          if (
            subject.trim() &&
            grade.trim() &&
            !subject.toLowerCase().includes("no subject")
          ) {
            finalResults.push({
              semester: opt.text.trim(),
              subject: subject.trim(),
              grade: grade.trim(),
              equivalent: getEquivalent(grade.trim()),
            });
          }
        }
      }
      await randomDelay(100, 300);
    }

    console.log(`[Scraper] Done. Extracted ${finalResults.length} items.`);
    res.json(finalResults);
  } catch (error) {
    console.error(`[Scraper] Error: ${error.message}`);

    if (error.message === "LOGIN_FAILED") {
      return res.status(401).json({
        error:
          "Invalid Credentials. Please check your Student ID and Password.",
      });
    }

    if (error.message.includes("CAPTCHA_DETECTED")) {
      return res.status(403).json({
        error:
          "Security Check Triggered. The university firewall is blocking cloud access. Please try again in 30 minutes.",
      });
    }

    res.status(500).json({
      error: "Connection timed out or failed. Please check credentials.",
    });
  } finally {
    if (driver) await driver.quit();
  }
});

// All other GET requests not handled before will return our React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Scraper Server running on port ${PORT}`);
});
