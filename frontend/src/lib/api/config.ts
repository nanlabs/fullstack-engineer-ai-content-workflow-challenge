// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const apiConfig = {
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
};
