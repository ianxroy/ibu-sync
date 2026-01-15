import type { VercelRequest, VercelResponse } from "@vercel/node";

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

  const { message, studentId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // In production, you might want to:
    // 1. Save to a database
    // 2. Send an email notification
    // 3. Log to a monitoring service

    console.log(`Feedback from ${studentId || "Anonymous"}: ${message}`);

    // For now, just log and return success
    return res.status(200).json({
      success: true,
      message: "Feedback received. Thank you!",
    });
  } catch (error: any) {
    console.error("Feedback error:", error);
    return res.status(500).json({ error: "Failed to process feedback" });
  }
}
