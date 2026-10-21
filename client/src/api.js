import axios from 'axios';

/**
 * Normalizes API base URL from environment variables.
 * Handles trailing slashes, missing /api suffix, and prevents accidental /api/api duplication.
 */
export const getApiBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL;
  if (!rawUrl || !rawUrl.trim()) {
    return '/api';
  }

  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000 // Generous timeout to allow for Render free tier cold-starts (~30-50s)
});

export default api;
