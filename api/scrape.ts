import type { VercelRequest, VercelResponse } from "@vercel/node";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

/**
 * DATA PRIVACY POLICY:
 * This application processes student credentials (Student ID and Password)
 * solely for the purpose of retrieving academic records in real-time.
 * 1. Credentials are never stored, logged, or cached on our servers.
 * 2. All data fetched is returned directly to the user and is not shared with third parties.
 * 3. Users are responsible for ensuring they have the right to access the data requested.
 */

// Use Google Test Secret Key by default if env var is missing
const RECAPTCHA_SECRET_KEY =
  process.env.RECAPTCHA_SECRET_KEY ||
  "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

const getEquivalent = (grade: string): string => {
  const map: Record<string, string> = {
    "1.0": "99-100",
    "1.1": "98",
    "1.2": "97",
    "1.3": "96",
    "1.4": "95",
    "1.5": "94",
    "1.6": "93",
    "1.7": "92",
    "1.8": "91",
    "1.9": "90",
    "2.0": "89",
    "2.1": "88",
    "2.2": "87",
    "2.3": "86",
    "2.4": "85",
    "2.5": "84",
    "2.6": "82-83",
    "2.7": "80-81",
    "2.8": "78-79",
    "2.9": "76-77",
    "3.0": "75",
    "5.0": "Failure",
  };
  return map[grade] || "N/A";
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { studentId, password, captchaToken } = req.body;

  if (!studentId || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  // CAPTCHA Verification
  try {
    const verifyRes = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      {
        method: "POST",
      }
    );
    const verifyJson = await verifyRes.json();
    if (!verifyJson.success) {
      return res.status(403).json({ error: "CAPTCHA verification failed." });
    }
  } catch (e) {
    console.error("Captcha error:", e);
    return res.status(500).json({ error: "Failed to verify CAPTCHA." });
  }

  let browser = null;

  try {
    // Launch browser with Vercel-optimized settings but extended for Render's 0.1 CPU
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--hide-scrollbars",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Essential for 512MB RAM
        "--single-process", // Reduces overhead on low CPU
      ],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: (chromium as any).headless,
      ignoreHTTPSErrors: true,
    } as any);

    const page = await browser.newPage();

    // Optimize page loading by blocking non-essential resources
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (
        ["image", "stylesheet", "font", "media", "other"].includes(resourceType)
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 1. LOGIN
    // Increased timeout to 60s for Render Free Tier
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/login", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector("#student-id-1", { timeout: 30000 });
    await page.type("#student-id-1", studentId, { delay: 30 });
    await page.type("#student-password-1", password, { delay: 30 });

    // Click and wait for navigation
    await Promise.all([
      page.click("#submit"),
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
    ]);

    // Check for explicit error messages on page
    const errorElement = await page.$(".alert.alert-danger");
    if (errorElement) {
      const errorText = await page.evaluate(
        (el) => el.textContent?.trim(),
        errorElement
      );
      throw new Error(errorText || "Login failed");
    }

    // 2. NAVIGATE TO GRADES
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/grades", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("#semesters", { timeout: 30000 });

    // 3. GET SEMESTERS
    const semesters = await page.evaluate(() => {
      const select = document.querySelector("#semesters") as HTMLSelectElement;
      if (!select) return [];

      return (
        Array.from(select.options)
          .filter((opt) => opt.value && !opt.disabled)
          .map((opt) => ({
            value: opt.value,
            text: opt.textContent?.trim() || "",
          }))
          // Arrange from smallest to largest amount (Oldest to Newest)
          .reverse()
      );
    });

    const allGrades = [];

    // 4. SCRAPE LOOP
    for (const semester of semesters) {
      // 1. Select option
      await page.select("#semesters", semester.value);

      // 2. Force Change Event
      await page.evaluate((val) => {
        const el = document.querySelector("#semesters") as HTMLSelectElement;
        el.value = val;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, semester.value);

      // 3. Wait for Network Idle (Wait for AJAX table update)
      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
      } catch (e) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Extract grades
      const semesterGrades = await page.evaluate((semText) => {
        const rows = document.querySelectorAll("table tbody tr");
        const results: { semester: string; subject: string; grade: string }[] =
          [];

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 3) {
            const subject = cells[1].textContent?.trim() || "";
            const grade = cells[2].textContent?.trim() || "";

            if (
              subject &&
              grade &&
              !subject.toLowerCase().includes("no subject")
            ) {
              results.push({
                semester: semText,
                subject,
                grade,
              });
            }
          }
        });
        return results;
      }, semester.text);

      // Add equivalent grades
      const gradesWithEquivalents = semesterGrades.map((grade) => ({
        ...grade,
        equivalent: getEquivalent(grade.grade),
      }));

      allGrades.push(...gradesWithEquivalents);
    }

    return res.status(200).json(allGrades);
  } catch (error: any) {
    console.error("Scraping error:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error.message.includes("timeout"))
      errorMessage = "Request timed out. The portal or server is slow.";
    if (error.message.includes("Login failed"))
      errorMessage = "Invalid credentials.";

    return res.status(500).json({ error: errorMessage });
  } finally {
    if (browser) {
      await (browser as any).close().catch(() => {});
    }
  }
}
