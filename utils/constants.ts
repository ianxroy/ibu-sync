export const GRADING_SCALE = [
  { rating: "Outstanding", grade: "1.0", eq: "99-100" },
  { rating: "Outstanding", grade: "1.1", eq: "98" },
  { rating: "Outstanding", grade: "1.2", eq: "97" },
  { rating: "Outstanding", grade: "1.3", eq: "96" },
  { rating: "Outstanding", grade: "1.4", eq: "95" },
  { rating: "Superior", grade: "1.5", eq: "94" },
  { rating: "Superior", grade: "1.6", eq: "93" },
  { rating: "Superior", grade: "1.7", eq: "92" },
  { rating: "Very Satisfactory", grade: "1.8", eq: "91" },
  { rating: "Very Satisfactory", grade: "1.9", eq: "90" },
  { rating: "Very Satisfactory", grade: "2.0", eq: "89" },
  { rating: "Very Satisfactory", grade: "2.1", eq: "88" },
  { rating: "Very Satisfactory", grade: "2.2", eq: "87" },
  { rating: "Very Satisfactory", grade: "2.3", eq: "86" },
  { rating: "Very Satisfactory", grade: "2.4", eq: "85" },
  { rating: "Very Satisfactory", grade: "2.5", eq: "84" },
  { rating: "Satisfactory", grade: "2.6", eq: "82-83" },
  { rating: "Satisfactory", grade: "2.7", eq: "80-81" },
  { rating: "Satisfactory", grade: "2.8", eq: "78-79" },
  { rating: "Fair/Average", grade: "2.9", eq: "76-77" },
  { rating: "Fair/Average", grade: "3.0", eq: "75 (Passing)" },
  { rating: "Poor", grade: "3.1-4.0", eq: "Below 75 (Conditional)" },
  { rating: "Failure", grade: "5.0", eq: "Failure" },
];

const getBackendUrls = () => {
  let urls = "";
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.VITE_BACKEND_URLS) {
      // @ts-ignore
      urls = import.meta.env.VITE_BACKEND_URLS;
    }
  } catch (e) {}

  const prodUrl = "https://ibu-sync-production.up.railway.app";
  if (!urls) return prodUrl;
  if (!urls.includes(prodUrl)) {
    return `${urls},${prodUrl}`;
  }
  return urls;
};

export const BACKEND_URLS = getBackendUrls()
  .split(",")
  .map((url: string) => url.trim())
  .filter((url: string) => url.length > 0);
