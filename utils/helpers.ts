export const getSemesterOrder = (semString: string) => {
  const yearMatch = semString.match(/(\d{4})/);
  const startYear = yearMatch ? parseInt(yearMatch[0]) : 0;
  let semOrder = 4;
  const lower = semString.toLowerCase();
  if (lower.includes("1st") || lower.includes("first")) semOrder = 1;
  else if (lower.includes("2nd") || lower.includes("second")) semOrder = 2;
  else if (lower.includes("3rd") || lower.includes("third")) semOrder = 3;
  else if (lower.includes("summer") || lower.includes("mid")) semOrder = 3.5;
  return { startYear, semOrder };
};

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
