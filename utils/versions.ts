export const APP_VERSIONS = [
  {
    version: "1.0.1",
    title: "Speed, Security & Features Update",
    date: "2024-05-20", // Approximate release date for sorting
    features: [
      {
        label: "Speed",
        desc: "Implemented server-side caching to eliminate redundant scraping for stable accounts.",
      },
      {
        label: "Security",
        desc: "Added Rate Limiting, Request Body constraints, and Google reCAPTCHA v3.",
      },
      {
        label: "Features",
        desc: 'Added "Download Grades" (CSV Export) capability.',
      },
      {
        label: "Architecture",
        desc: "Improved browser lifecycle management (Singleton pattern) and queue handling.",
      },
    ],
  },
  {
    version: "1.0.0",
    title: "Initial Release",
    date: "2024-01-01",
    features: [
      { label: "Core", desc: "Basic academic record scraping." },
      { label: "GWA", desc: "Real-time GWA calculator." },
      { label: "UI", desc: "Grade visualization dashboard." },
    ],
  },
];

export const LATEST_VERSION = APP_VERSIONS[0];
