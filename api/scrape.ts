import type { VercelRequest, VercelResponse } from "@vercel/node";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

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
  // CORS Handling
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { studentId, password, captchaToken } = req.body;

  if (!studentId || !password)
    return res.status(400).json({ error: "Missing credentials" });

  // ---------------------------------------------------------------------------
  // CAPTCHA VERIFICATION (V3)
  // ---------------------------------------------------------------------------
  try {
    const verifyRes = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      {
        method: "POST",
      },
    );
    const verifyJson = await verifyRes.json();

    // V3 checks: success AND score threshold (e.g. 0.5)
    if (
      !verifyJson.success ||
      (verifyJson.score !== undefined && verifyJson.score < 0.5)
    ) {
      console.error("Captcha failed/low score:", verifyJson);
      return res
        .status(403)
        .json({
          error: "Security check failed (Low Score). Please try again.",
        });
    }
  } catch (e) {
    console.error("Captcha error:", e);
    return res.status(500).json({ error: "Failed to verify CAPTCHA." });
  }

  let browser = null;

  try {
    // ---------------------------------------------------------------------------
    // BROWSER LAUNCH (VERCEL OPTIMIZED)
    // ---------------------------------------------------------------------------

    const isLocal = process.env.VERCEL !== "1";

    let executablePath = "";

    if (isLocal) {
      // Local Development Fallback
      const localPaths = [
        "/usr/bin/google-chrome",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      ];
      // @ts-ignore
      executablePath =
        localPaths.find((p) => require("fs").existsSync(p)) || "";
    } else {
      // Vercel Production
      executablePath = await chromium.executablePath();
    }

    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    } as any);

    const page = await browser.newPage();

    // Optimize page loading
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
    await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/login", {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    await page.waitForSelector("#student-id-1", { timeout: 15000 });
    await page.type("#student-id-1", studentId);
    await page.type("#student-password-1", password);

    await Promise.all([
      page.click("#submit"),
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }),
    ]);

    const errorElement = await page.$(".alert.alert-danger");
    if (errorElement) {
      const errorText = await page.evaluate(
        (el) => el.textContent?.trim(),
        errorElement,
      );
      throw new Error(errorText || "Login failed");
    }

    // 2. NAVIGATE TO GRADES
    const currentUrl = page.url();
    if (!currentUrl.includes("grades")) {
      await page.goto("https://systems.bicol-u.edu.ph/ibu-beta/grades", {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
    }

    await page.waitForSelector("#semesters", { timeout: 15000 });

    // 3. GET SEMESTERS
    const semesters = await page.evaluate(() => {
      const select = document.querySelector("#semesters") as HTMLSelectElement;
      if (!select) return [];
      return Array.from(select.options)
        .filter((opt) => opt.value && !opt.disabled)
        .map((opt) => ({
          value: opt.value,
          text: opt.textContent?.trim() || "",
        }))
        .reverse();
    });

    const allGrades = [];

    // 4. SCRAPE LOOP
    for (const semester of semesters) {
      await page.select("#semesters", semester.value);
      await page.evaluate((val) => {
        const el = document.querySelector("#semesters") as HTMLSelectElement;
        el.value = val;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, semester.value);

      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
      } catch (e) {}

      const semesterGrades = await page.evaluate((semText) => {
        // IMPORTANT: Only select visible rows. The portal might just hide rows instead of removing them.
        const rows = Array.from(document.querySelectorAll("table tbody tr"));
        const results: { semester: string; subject: string; grade: string }[] =
          [];

        rows.forEach((row) => {
          // Check for visibility using offsetParent (null if hidden/display:none)
          if ((row as HTMLElement).offsetParent === null) return;

          const cells = row.querySelectorAll("td");
          if (cells.length >= 3) {
            const subject = cells[1].textContent?.trim() || "";
            const grade = cells[2].textContent?.trim() || "";
            if (
              subject &&
              grade &&
              !subject.toLowerCase().includes("no subject")
            ) {
              results.push({ semester: semText, subject, grade });
            }
          }
        });
        return results;
      }, semester.text);

      allGrades.push(
        ...semesterGrades.map((g) => ({
          ...g,
          equivalent: getEquivalent(g.grade),
        })),
      );
    }

    return res.status(200).json(allGrades);
  } catch (error: any) {
    console.error("Scraping error:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error.message.includes("timeout"))
      errorMessage = "Request timed out. The university portal is slow.";
    if (error.message.includes("Login failed"))
      errorMessage = "Invalid credentials.";

    return res.status(500).json({ error: errorMessage });
  } finally {
    if (browser) await browser.close();
  }
}
