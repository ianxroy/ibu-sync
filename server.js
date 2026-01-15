import express from "express";
import { Builder, By, until, Select } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Helper to determine grade equivalent locally if needed, though Selenium scrapes raw text
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
  console.log(`[Local Scraper] Starting sync for ${studentId}...`);

  const options = new chrome.Options();
  options.addArguments("--headless=new"); // Use new headless mode
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--window-size=1920,1080");

  let driver;

  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // 1. Authentication
    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/login");

    await driver.wait(until.elementLocated(By.id("student-id-1")), 15000);
    await driver.findElement(By.id("student-id-1")).sendKeys(studentId);
    await driver.findElement(By.id("student-password-1")).sendKeys(password);

    const submitBtn = await driver.findElement(By.id("submit"));
    await driver.executeScript("arguments[0].click();", submitBtn);

    // Wait for URL to change to dashboard or grades, implies login success
    await driver.wait(until.urlContains("ibu-beta"), 20000);

    // 2. Navigation
    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/grades");

    // 3. Scrape Grades
    const dropdownElement = await driver.wait(
      until.elementLocated(By.id("semesters")),
      20000
    );
    const select = new Select(dropdownElement);
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

    // Smallest to Largest (Oldest to Newest)
    // The dropdown is usually Newest to Oldest, so we reverse it.
    const chronologicalOrder = validOptions.reverse();
    const finalResults = [];

    for (const opt of chronologicalOrder) {
      // Re-find select to avoid stale element
      const currentSelect = new Select(
        await driver.findElement(By.id("semesters"))
      );
      await currentSelect.selectByValue(opt.value);

      // Wait for table update (simple sleep is reliable here locally, but wait is better)
      await driver.sleep(2000);

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

    console.log(
      `[Local Scraper] Success! Found ${finalResults.length} grades.`
    );
    res.json(finalResults);
  } catch (error) {
    console.error("[Local Scraper] Error:", error);
    res.status(500).json({
      error: "Failed to scrape grades. Please check credentials or try again.",
    });
  } finally {
    if (driver) await driver.quit();
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(
    `\n🚀 Local Selenium Scraper running on http://localhost:${PORT}`
  );
  console.log(`   Use 'npm run dev' to launch the frontend.\n`);
});
