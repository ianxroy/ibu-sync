import type { VercelRequest, VercelResponse } from "@vercel/node";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

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

  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  let browser = null;

  try {
    // Launch browser with Vercel-optimized settings
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--hide-scrollbars",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: true,
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
    // Use domcontentloaded instead of networkidle0 for speed
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/login", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForSelector("#student-id-1", { timeout: 10000 });
    await page.type("#student-id-1", studentId);
    await page.type("#student-password-1", password);

    // Click and wait for navigation safely
    await Promise.all([
      page.click("#submit"),
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20000 }),
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
    // Ensure we are logged in by checking URL or waiting for a specific element if needed
    // Then jump straight to grades to save time
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/grades", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForSelector("#semesters", { timeout: 15000 });

    // 3. GET SEMESTERS
    const semesters = await page.evaluate(() => {
      const select = document.querySelector("#semesters") as HTMLSelectElement;
      return (
        Array.from(select.options)
          .filter((opt) => opt.value && !opt.disabled)
          .map((opt) => ({
            value: opt.value,
            text: opt.textContent?.trim() || "",
          }))
          // IMPORTANT: Reverse to match "Smallest to Largest" (Oldest to Newest) mandate
          .reverse()
      );
    });

    const allGrades = [];

    // 4. SCRAPE LOOP
    for (const semester of semesters) {
      await page.select("#semesters", semester.value);

      // Robust wait for table to update or appear
      // We look for a table row that is NOT empty/loading
      try {
        await page.waitForFunction(
          () => {
            const rows = document.querySelectorAll("table tbody tr");
            // Ensure at least one row exists
            if (rows.length === 0) return false;
            // Ensure it's not a "Loading..." row if such exists (defensive)
            return true;
          },
          { timeout: 5000 }
        );
      } catch (e) {
        // If timeout, it might mean empty semester, continue to next
        continue;
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
      errorMessage = "Request timed out. The portal is slow.";
    if (error.message.includes("Login failed"))
      errorMessage = "Invalid credentials.";
    return res.status(500).json({ error: errorMessage });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
