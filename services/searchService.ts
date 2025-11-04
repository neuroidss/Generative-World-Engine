// services/searchService.ts

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    source: string;
}

const fetchWithCorsFallback = async (url: string, logEvent: (message: string) => void): Promise<Response> => {
    logEvent(`[Search] Attempting direct fetch for: ${url.substring(0, 100)}...`);
    try {
        const response = await fetch(url);
        if (response.ok) return response;
        logEvent(`[Search] Direct fetch failed with status ${response.status}.`);
    } catch (error) {
        logEvent(`[Search] Direct fetch failed. Error: ${error}. Falling back to proxy.`);
    }

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    logEvent(`[Search] Attempting fetch via proxy: ${proxyUrl.substring(0, 100)}...`);
    const response = await fetch(proxyUrl);
    if (!response.ok) {
        throw new Error(`Proxy fetch failed with status ${response.status}`);
    }
    return response;
};

export const searchWeb = async (query: string, logEvent: (message: string) => void, limit: number): Promise<SearchResult[]> => {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const results: SearchResult[] = [];
    try {
        const response = await fetchWithCorsFallback(url, logEvent);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const resultElements = doc.querySelectorAll('.result');

        for (const element of Array.from(resultElements).slice(0, limit)) {
            const titleEl = element.querySelector<HTMLAnchorElement>('.result__a');
            const snippetEl = element.querySelector('.result__snippet');
            
            const linkHref = titleEl?.href;
            const title = titleEl?.textContent?.trim();
            const snippet = snippetEl?.textContent?.trim();

            if (linkHref && title && snippet) {
                 let realLink = linkHref;
                 try {
                     const linkUrl = new URL(linkHref, 'https://duckduckgo.com');
                     if (linkUrl.searchParams.has('uddg')) {
                         realLink = linkUrl.searchParams.get('uddg')!;
                     }
                 } catch (e) {
                    logEvent(`[Search] WARN: Could not parse DDG redirect URL: ${linkHref}`);
                 }
                
                results.push({ link: realLink, title, snippet, source: 'WebSearch' });
            }
        }
        if (results.length > 0) {
            logEvent(`[Search] Success via DDG scraping, found ${results.length} results.`);
        } else {
             logEvent(`[Search] WARN: DDG scraping returned no parsable results.`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logEvent(`[Search] Error scraping DDG: ${message}`);
        // Do not throw, return empty results as a fallback
    }
    return results;
};

export const searchService = {
    searchWeb,
};
