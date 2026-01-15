export interface Grade {
  semester: string;
  subject: string;
  grade: string;
  equivalent: string;
}

export interface ScrapeResponse {
  data?: Grade[];
  error?: string;
}

export enum AppStatus {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}
