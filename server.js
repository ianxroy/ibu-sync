import express from "express";
import { Builder, By, until, Select } from "selenium-webdriver";
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
  options.addArguments("--headless=new");
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--disable-gpu");
  options.addArguments("--window-size=1280,800");

  // In some environments, you must explicitly point to the Chrome binary
  if (process.env.CHROME_BIN) {
    options.setBinaryPath(process.env.CHROME_BIN);
  }

  let driver;

  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // 1. Authentication
    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/login");

    const idInput = await driver.wait(
      until.elementLocated(By.id("student-id-1")),
      20000
    );
    await idInput.sendKeys(studentId);
    await driver.findElement(By.id("student-password-1")).sendKeys(password);

    const submitBtn = await driver.findElement(By.id("submit"));
    await driver.executeScript("arguments[0].click();", submitBtn);

    // Wait for login success
    await driver.wait(until.urlContains("ibu-beta"), 20000);

    // 2. Navigation
    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/grades");

    // 3. Scrape Grades
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
    // Drodown is typically Newest-to-Oldest, so we reverse it
    const chronologicalOrder = validOptions.reverse();
    const finalResults = [];

    for (const opt of chronologicalOrder) {
      const currentSelectElement = await driver.findElement(By.id("semesters"));
      const currentSelect = new Select(currentSelectElement);
      await currentSelect.selectByValue(opt.value);

      // Wait for table to update (Check that at least one row exists)
      await driver.wait(async () => {
        const rows = await driver.findElements(By.css("table tbody tr"));
        return rows.length > 0;
      }, 10000);

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
    }

    console.log(`[Scraper] Success! Found ${finalResults.length} grades.`);
    res.json(finalResults);
  } catch (error) {
    console.error("[Scraper] Error:", error.message);
    res.status(500).json({
      error: error.message.includes("timeout")
        ? "The portal is taking too long to respond."
        : "Failed to scrape grades. Please check your credentials.",
    });
  } finally {
    if (driver) await driver.quit();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Scraper Server running on port ${PORT}`);
});
