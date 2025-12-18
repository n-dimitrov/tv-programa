/**
 * API Configuration
 * Uses relative URLs in production (same host) or localhost in development
 */

const getApiUrl = (): string => {
  // Detect at runtime: if hostname is localhost, use localhost:8000
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000';
  }
  
  // In production (Cloud Run), use relative URLs (same host as frontend)
  return '';
};

export const API_URL = getApiUrl();
