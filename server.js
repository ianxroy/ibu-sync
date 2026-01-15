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

app.use(express.static(path.join(__dirname, "dist")));
app.use("/ibu-sync", express.static(path.join(__dirname, "dist")));

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

// Optimized Stealth: Removes automation traces faster
const STEALTH_INJECTION = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {} };
`;

app.post("/api/scrape", async (req, res) => {
  const { studentId, password } = req.body;
  if (!studentId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const options = new chrome.Options();
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage", // Crucial for Railway memory limits
    "--disable-gpu",
    "--blink-settings=imagesEnabled=false" // Optimization: Don't load images
  );

  let driver;
  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // Fast Stealth Injection via CDP
    const cdp = await driver.createCDPConnection("page");
    await cdp.execute("Page.addScriptToEvaluateOnNewDocument", {
      source: STEALTH_INJECTION,
    });

    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/login");

    // Optimized Login
    const idInput = await driver.wait(
      until.elementLocated(By.id("student-id-1")),
      10000
    );
    await idInput.sendKeys(studentId);
    await driver.findElement(By.id("student-password-1")).sendKeys(password);

    const submitBtn = await driver.findElement(By.id("submit"));
    await driver.executeScript("arguments[0].click();", submitBtn);

    // Faster URL Wait
    await driver.wait(until.urlContains("ibu-beta"), 15000);

    // Jump directly to grades
    await driver.get("https://systems.bicol-u.edu.ph/ibu-beta/grades");

    const dropdown = await driver.wait(
      until.elementLocated(By.id("semesters")),
      10000
    );
    const select = new Select(dropdown);
    const optionsList = await select.getOptions();

    const validOptions = [];
    for (let opt of optionsList) {
      const val = await opt.getAttribute("value");
      if (val && !(await opt.getAttribute("disabled"))) {
        validOptions.push({ value: val, text: await opt.getText() });
      }
    }

    // Sort from smallest to largest amount
    const chronologicalOrder = validOptions.reverse();
    const finalResults = [];

    for (const opt of chronologicalOrder) {
      const currentSelect = new Select(
        await driver.findElement(By.id("semesters"))
      );
      await currentSelect.selectByValue(opt.value);

      // Short delay for table render
      await new Promise((r) => setTimeout(r, 800));

      // BULK EXTRACTION: Instead of 30+ driver calls, we do 1.
      const tableData = await driver.executeScript(() => {
        return Array.from(document.querySelectorAll("table tbody tr"))
          .map((row) => {
            const tds = row.querySelectorAll("td");
            return tds.length >= 3
              ? {
                  subject: tds[1].innerText.trim(),
                  grade: tds[2].innerText.trim(),
                }
              : null;
          })
          .filter(
            (x) =>
              x && x.subject && !x.subject.toLowerCase().includes("no subject")
          );
      });

      tableData.forEach((item) => {
        finalResults.push({
          semester: opt.text.trim(),
          subject: item.subject,
          grade: item.grade,
          equivalent: getEquivalent(item.grade),
        });
      });
    }

    res.json(finalResults);
  } catch (error) {
    console.error(`[Scraper] Error: ${error.message}`);
    res.status(500).json({
      error:
        error.message === "LOGIN_FAILED"
          ? "Invalid Credentials"
          : "Connection timed out.",
    });
  } finally {
    if (driver) await driver.quit();
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`🚀 Scraper Server running on port ${PORT}`)
);
