import { useState, useEffect } from "react";
import { AppStatus, Grade } from "../types";
import { BACKEND_URLS } from "../utils/constants";
import { SUBJECT_UNITS } from "../subjects";

export interface ServerNode {
  url: string;
  name: string;
  latency?: number;
}

// Helper to humanize errors
const getUserFriendlyError = (error: string): string => {
  const e = error.toLowerCase();

  if (
    e.includes("failed to fetch") ||
    e.includes("networkerror") ||
    e.includes("connection refused")
  ) {
    return "Unable to connect to the server. Please check your internet connection or try refreshing the browser.";
  }
  if (e.includes("security check") || e.includes("captcha")) {
    return "Security verification expired. Please refresh the page and try again.";
  }
  if (e.includes("timeout") || e.includes("timed out")) {
    return "The university portal is taking too long to respond. Please try again later.";
  }
  if (e.includes("invalid credentials") || e.includes("login failed")) {
    return "Invalid Student ID or Password. Please check your inputs.";
  }
  if (e.includes("json") || e.includes("syntaxerror")) {
    return "Received incomplete data. The server might be overloaded. Please try again.";
  }
  if (e.includes("server is busy") || e.includes("503")) {
    return "The server is currently full. Please wait a moment and try again.";
  }

  // Clean up JSON-like strings if they leak through
  if (error.trim().startsWith("{") && error.includes("error")) {
    try {
      const parsed = JSON.parse(error);
      return parsed.error || "An unexpected error occurred.";
    } catch {
      return "An unexpected error occurred.";
    }
  }

  return error;
};

export const useScraper = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [units, setUnits] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [activeServer, setActiveServer] = useState<ServerNode | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === AppStatus.LOADING) {
      interval = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const processGrades = (data: Grade[]) => {
    setGrades(data);
    const initialUnits: Record<string, string> = {};

    // Create a normalized map for case-insensitive matching
    const normalizedSubjectMap = Object.keys(SUBJECT_UNITS).reduce(
      (acc, key) => {
        // Normalize dict keys: lowercase, single spaces
        const normKey = key.trim().replace(/\s+/g, " ").toLowerCase();
        acc[normKey] = SUBJECT_UNITS[key];
        return acc;
      },
      {} as Record<string, string>,
    );

    data.forEach((g: Grade) => {
      const key = `${g.semester}-${g.subject}`;

      // Clean the scraped subject: remove extra spaces, trim
      const subjectName = g.subject.trim().replace(/\s+/g, " ");
      const subjectNameLower = subjectName.toLowerCase();

      // 1. Try Exact Match (Case-Sensitive)
      if (SUBJECT_UNITS[subjectName]) {
        initialUnits[key] = SUBJECT_UNITS[subjectName];
      }
      // 2. Try Normalized Match (Case-Insensitive)
      else if (normalizedSubjectMap[subjectNameLower]) {
        initialUnits[key] = normalizedSubjectMap[subjectNameLower];
      }
    });

    setUnits(initialUnits);
    setStatus(AppStatus.SUCCESS);
    setIsModalOpen(false);
  };

  const connectToServer = async (): Promise<ServerNode> => {
    if (BACKEND_URLS.length > 0) {
      for (const baseUrl of BACKEND_URLS) {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${baseUrl}/api/health`, {
            signal: controller.signal,
            method: "GET",
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const end = Date.now();
            return {
              url: baseUrl,
              name: "Cloud Node (Railway)",
              latency: end - start,
            };
          }
        } catch (e) {
          console.warn(`Failed to connect to ${baseUrl}`, e);
        }
      }
    }

    // Try local/serverless fallback
    const startLocal = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`/api/health`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const endLocal = Date.now();
        return {
          url: "",
          name: "Local / Serverless",
          latency: endLocal - startLocal,
        };
      }
    } catch (e) {}

    // If we reach here, no servers are reachable
    throw new Error("Unable to reach any server. Please refresh the browser.");
  };

  const loginAndScrape = async (
    id: string,
    pass: string,
    captchaToken: string | null,
  ) => {
    setStatus(AppStatus.LOADING);
    setErrorMessage("");
    setElapsedTime(0);
    setActiveServer(null);
    setQueuePosition(null);
    setIsModalOpen(true);
    setStatusMessage("Connecting to Server...");

    try {
      if (!captchaToken) {
        throw new Error("Please complete the security check (CAPTCHA).");
      }

      let server: ServerNode;
      try {
        server = await connectToServer();
      } catch (connErr) {
        throw new Error("Connection failed. Please refresh the browser.");
      }

      setActiveServer(server);

      const endpoint = `${server.url}/api/scrape`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          password: pass,
          captchaToken: captchaToken,
        }),
      });

      const contentType = response.headers.get("content-type");

      // Handle standard JSON response (Success or Error immediately)
      if (
        contentType &&
        contentType.includes("application/json") &&
        !contentType.includes("ndjson")
      ) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch grades");
        }
        if (Array.isArray(data)) {
          processGrades(data);
          return;
        } else if (data.data && Array.isArray(data.data)) {
          processGrades(data.data);
          return;
        }
      }

      if (!response.body) {
        if (response.status === 403) throw new Error("Security check failed.");
        throw new Error("No response body");
      }

      // Handle Streaming NDJSON
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let msg;
          try {
            msg = JSON.parse(line);
          } catch (e) {
            console.error("Error parsing JSON chunk:", e, line);
            continue;
          }

          if (msg.type === "queue") {
            setQueuePosition(msg.position);
            setStatusMessage(msg.message);
          } else if (msg.type === "status") {
            setQueuePosition(null);
            setStatusMessage(msg.message);
          } else if (msg.type === "success") {
            processGrades(msg.data);
            return;
          } else if (msg.type === "error") {
            throw new Error(msg.error || "An error occurred");
          }
        }
      }
      // If loop finishes without success or error
      throw new Error("Server connection closed unexpectedly.");
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = getUserFriendlyError(err.message || "Unknown error");
      setErrorMessage(friendlyMsg);
      setStatus(AppStatus.ERROR);
      setIsModalOpen(false);
    }
  };

  const reset = () => {
    setGrades([]);
    setStatus(AppStatus.IDLE);
    setUnits({});
    setErrorMessage("");
  };

  return {
    status,
    grades,
    units,
    setUnits, // Allow manual unit overrides
    errorMessage,
    statusMessage,
    elapsedTime,
    activeServer,
    queuePosition,
    isModalOpen,
    loginAndScrape,
    reset,
    activeServerUrl: activeServer?.url,
  };
};
