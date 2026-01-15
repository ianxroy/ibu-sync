import express from "express";
import { Builder, By, until, Select, Key } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import cors from "cors";

/**
 * DATA PRIVACY POLICY
 * 1. Student credentials (ID and Password) are used only for the active session.
 * 2. This server does not store, log, or share any personal information or grades.
 * 3. All data is processed in-memory and discarded immediately after the response is sent.
 * 4. Users are advised to use this service over secure networks only.
 */

const app = express();
app.use(cors());
app.use(express.json());

// 0. Health Check Endpoint (Required for Frontend Latency Check)
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", platform: "Railway", timestamp: Date.now() });
});

// Helper for random delays (Human-like behavior)
const randomDelay = (min, max) =>
  new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min))
  );

// Helper to determine grade equivalent
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

app.post("/api/scrape", async (req, res) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  console.log(`[Scraper] Starting sync for ${studentId}...`);

  const options = new chrome.Options();

  // --- STEALTH & EVASION CONFIGURATION ---

  // 1. Basic Headless Mode
  options.addArguments("--headless=new");

  // 2. Critical: Disable the "AutomationControlled" feature
  options.addArguments("--disable-blink-features=AutomationControlled");

  // 3. Spoof User Agent (Recent Chrome on Windows 10)
  options.addArguments(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  // 4. Set Language to English (helps with some firewalls)
  options.addArguments("--lang=en-US");

  // 5. Standard container/stability flags
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--disable-gpu");
  options.addArguments("--window-size=1920,1080");
  options.addArguments("--start-maximized");
  options.addArguments("--disable-infobars");

  // 6. Exclude automation switches
  options.excludeSwitches("enable-automation");

  // 7. Turn off automation extension
  options.setUserPreferences({
    credentials_enable_service: false,
    "profile.password_manager_enabled": false,
    useAutomationExtension: false,
    excludeSwitches: ["enable-automation"],
    "intl.accept_languages": "en-US,en",
  });

  if (process.env.CHROME_BIN) {
    options.setBinaryPath(process.env.CHROME_BIN);
  }

  let driver;

  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // 8. Extra Measure: Manually delete navigator.webdriver
    try {
      await driver.executeScript(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
      );
    } catch (e) {
      // Ignore
    }

    // --- PHASE 1: WARM UP ---
    // Visit the base domain first to establish a session without triggering login protection immediately
    const BASE_URL = "https://systems.bicol-u.edu.ph/";
    await driver.get(BASE_URL);
    console.log(`[Link Log] Warm-up access: ${await driver.getCurrentUrl()}`);

    // Human-like pause (1-2 seconds)
    await randomDelay(1000, 2000);

    // --- PHASE 2: LOGIN ACCESS ---
    const LOGIN_URL = "https://systems.bicol-u.edu.ph/ibu-beta/login";
    await driver.get(LOGIN_URL);

    let currentUrl = await driver.getCurrentUrl();
    console.log(`[Link Log] Accessed Login Page: ${currentUrl}`);

    // Check for CAPTCHA immediately upon loading login page
    if (currentUrl.includes("captcha") || currentUrl.includes(".well-known")) {
      throw new Error("CAPTCHA_DETECTED");
    }

    const idInput = await driver.wait(
      until.elementLocated(By.id("student-id-1")),
      10000
    );

    // Simulate human typing speed for ID
    await idInput.sendKeys(studentId);
    await randomDelay(300, 700);

    // Simulate human typing speed for Password
    const passInput = await driver.findElement(By.id("student-password-1"));
    await passInput.sendKeys(password);
    await randomDelay(500, 1000);

    const submitBtn = await driver.findElement(By.id("submit"));
    // Use JS click as it's more reliable, but after a small delay
    await driver.executeScript("arguments[0].click();", submitBtn);

    // --- PHASE 3: VERIFICATION ---
    // Wait for login success or failure or captcha redirect
    try {
      // We wait for either the dashboard URL OR the captcha URL
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return (
          url.includes("ibu-beta") ||
          url.includes("captcha") ||
          url.includes(".well-known")
        );
      }, 20000);
    } catch (e) {
      // Timeout waiting for redirect
    }

    currentUrl = await driver.getCurrentUrl();
    console.log(`[Link Log] Post-Login URL: ${currentUrl}`);

    if (currentUrl.includes("captcha") || currentUrl.includes(".well-known")) {
      throw new Error("CAPTCHA_DETECTED");
    }

    // --- PHASE 4: GRADES ACCESS ---
    // Direct navigation is safer than clicking UI buttons which might have analytics events
    const GRADES_URL = "https://systems.bicol-u.edu.ph/ibu-beta/grades";
    await driver.get(GRADES_URL);
    console.log(
      `[Link Log] Accessed Grades Page: ${await driver.getCurrentUrl()}`
    );
    await randomDelay(500, 1500);

    // --- PHASE 5: SCRAPING ---
    const dropdown = await driver.wait(
      until.elementLocated(By.id("semesters")),
      20000
    );
    const select = new Select(dropdown);
    const optionsList = await select.getOptions();

    const validOptions = [];
    for (let opt of optionsList) {
      const isDisabled = await opt.getAttribute("disabled");
      const val = await opt.getAttribute("value");
      if (!isDisabled && val) {
        validOptions.push({
          value: val,
          text: await opt.getText(),
        });
      }
    }

    // ARRANGE: Smallest to Largest (Oldest to Newest)
    const chronologicalOrder = validOptions.reverse();
    const finalResults = [];

    for (const opt of chronologicalOrder) {
      const currentSelectElement = await driver.findElement(By.id("semesters"));
      const currentSelect = new Select(currentSelectElement);
      await currentSelect.selectByValue(opt.value);

      // Wait for table to update
      try {
        await driver.wait(async () => {
          const rows = await driver.findElements(By.css("table tbody tr"));
          return rows.length > 0;
        }, 8000);
      } catch (e) {
        console.log(
          `[Scraper] Timeout waiting for semester ${opt.text}, skipping...`
        );
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
      // Small pause between semesters to be nice to the server
      await randomDelay(200, 500);
    }

    console.log(`[Scraper] Success! Found ${finalResults.length} grades.`);
    res.json(finalResults);
  } catch (error) {
    let currentUrl = "unknown";
    if (driver) {
      try {
        currentUrl = await driver.getCurrentUrl();
      } catch (e) {}
    }

    console.error(`[Scraper] Error: ${error.message} at ${currentUrl}`);

    if (
      error.message === "CAPTCHA_DETECTED" ||
      currentUrl.includes("captcha") ||
      currentUrl.includes(".well-known")
    ) {
      return res.status(403).json({
        error:
          "Security Check Triggered. The university portal has blocked this cloud server IP. Please try again later or access the portal directly.",
      });
    }

    res.status(500).json({
      error: error.message.includes("timeout")
        ? "The portal is taking too long to respond."
        : "Failed to scrape grades. Please check your credentials.",
    });
  } finally {
    if (driver) await driver.quit();
  }
});

// Default to 8080 as requested
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Scraper Server running on port ${PORT}`);
});
