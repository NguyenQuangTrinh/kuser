/**
 * Parse post content with format: https://domain###keyword!!!
 * Returns structured data: { url, keyword }
 */

export interface ParsedContent {
    url: string;
    keyword: string;
}

/**
 * Parse content format: https://domain ### keyword!!!
 */
export const parsePostContent = (content: string): ParsedContent | null => {
    if (!content) return null;

    // Match pattern: URL ### keyword!!!
    const pattern = /(https?:\/\/[^\s#]+)\s*###\s*([^!]+)!!!/;
    const match = content.match(pattern);

    if (!match) return null;

    return {
        url: match[1].trim(),
        keyword: match[2].trim(),
    };
};

/**
 * Check if content has valid format
 */
export const hasValidFormat = (content: string): boolean => {
    return parsePostContent(content) !== null;
};
