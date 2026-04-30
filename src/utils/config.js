const isBrowserHttp = typeof window !== 'undefined' && /^https?:\/\//.test(window.location.origin);

const CONFIG = {
    // Default to same origin for web (e.g. http://localhost:3000).
    // Fallback keeps local dev working if loaded from non-http context.
    API_BASE_URL: isBrowserHttp ? window.location.origin : 'http://localhost:3000'
};
