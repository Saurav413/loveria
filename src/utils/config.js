const isBrowserHttp = typeof window !== 'undefined' && /^https?:\/\//.test(window.location.origin);

function resolveApiBaseUrl() {
    if (!isBrowserHttp) {
        return 'http://localhost/loveria';
    }

    const { origin, pathname } = window.location;
    // XAMPP: http://localhost/loveria/...
    const loveriaMatch = pathname.match(/^(.*?\/loveria)(?:\/|$)/);
    if (loveriaMatch) {
        return origin + loveriaMatch[1];
    }

    return origin;
}

const CONFIG = {
    API_BASE_URL: resolveApiBaseUrl()
};
