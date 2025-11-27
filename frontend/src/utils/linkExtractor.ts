/**
 * Utility to extract URLs from text content
 */

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Extract all URLs from text
 */
export const extractURLs = (text: string): string[] => {
    if (!text) return [];

    const matches = text.match(URL_REGEX);
    if (!matches) return [];

    // Clean URLs (remove trailing punctuation and ###)
    return matches.map(url => {
        // Remove ### suffix if present (from post format: https://domain###keyword!!!)
        let cleanedUrl = url.replace(/###.*$/, '');

        // Remove trailing punctuation like . , ! ? ) ]
        cleanedUrl = cleanedUrl.replace(/[.,!?)\]]+$/, '');

        return cleanedUrl;
    });
};

/**
 * Check if text contains any links
 */
export const hasLinks = (content: string): boolean => {
    return extractURLs(content).length > 0;
};

/**
 * Count total links in text
 */
export const countLinks = (content: string): number => {
    return extractURLs(content).length;
};
