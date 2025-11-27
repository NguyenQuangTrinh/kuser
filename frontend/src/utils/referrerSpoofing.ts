/**
 * Utility to add random social media referrer parameters to URLs
 */

interface SocialReferrer {
    name: string;
    paramName: string;
    generateValue: () => string;
}

/**
 * Generate random alphanumeric string
 */
const randomString = (length: number = 12): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Check if URL is a search engine or major platform
 * Don't add referrer to these domains
 */
const isSearchEngineOrMajorPlatform = (url: string): boolean => {
    const skipDomains = [
        'google.com',
        'google.co',
        'bing.com',
        'yahoo.com',
        'duckduckgo.com',
        'baidu.com',
        'yandex.com',
        'youtube.com',
        'facebook.com',
        'instagram.com',
        'twitter.com',
        'x.com',
        'linkedin.com',
        'tiktok.com',
    ];

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        return skipDomains.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
};

/**
 * Social media referrers with their parameter formats
 */
const SOCIAL_REFERRERS: SocialReferrer[] = [
    {
        name: 'facebook',
        paramName: 'fbclid',
        generateValue: () => `IwAR${randomString(22)}`,
    },
    {
        name: 'instagram',
        paramName: 'igshid',
        generateValue: () => randomString(16),
    },
    {
        name: 'twitter',
        paramName: 'twsrc',
        generateValue: () => 'twtr-share',
    },
    {
        name: 'linkedin',
        paramName: 'li_src',
        generateValue: () => 'linkedin',
    },
    {
        name: 'tiktok',
        paramName: 'tt_from',
        generateValue: () => 'share',
    },
    {
        name: 'pinterest',
        paramName: 'pin_it',
        generateValue: () => randomString(10),
    },
];

/**
 * Add random social media referrer to URL (skip for search engines)
 */
export const addReferrerToURL = (url: string): string => {
    if (!url) return url;

    // Skip referrer for search engines and major platforms
    if (isSearchEngineOrMajorPlatform(url)) {
        console.log('Skipping referrer for search engine/major platform:', url);
        return url;
    }

    // Pick random referrer
    const referrer = SOCIAL_REFERRERS[Math.floor(Math.random() * SOCIAL_REFERRERS.length)];

    // Generate parameter value
    const paramValue = referrer.generateValue();
    const param = `${referrer.paramName}=${paramValue}`;

    // Add parameter to URL
    const separator = url.includes('?') ? '&' : '?';
    const urlWithReferrer = `${url}${separator}${param}`;

    console.log(`Added ${referrer.name} referrer to URL`);
    return urlWithReferrer;
};

/**
 * Add multiple random referrers to a list of URLs
 */
export const addReferrersToURLs = (urls: string[]): string[] => {
    return urls.map(url => addReferrerToURL(url));
};
