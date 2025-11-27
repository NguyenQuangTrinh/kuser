// Content script - runs on KuserNew app pages
(function () {
    console.log('KuserNew Tab Tracker content script loaded');

    // IMPORTANT: Content scripts run in an isolated world.
    // To make the flag accessible to the webpage, we need to inject it into the page's context
    // We use a script file (not inline) to avoid CSP violations
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    // Also set it in the content script's context (for good measure)
    window.__KUSERNEW_EXTENSION_INSTALLED__ = true;

    // Function to read Firebase auth from IndexedDB
    async function getAuthFromIndexedDB() {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('firebaseLocalStorageDb');

                request.onerror = () => {
                    console.error('Error opening IndexedDB');
                    resolve(null);
                };

                request.onsuccess = (event) => {
                    const db = event.target.result;

                    try {
                        const transaction = db.transaction(['firebaseLocalStorage'], 'readonly');
                        const objectStore = transaction.objectStore('firebaseLocalStorage');
                        const getAllRequest = objectStore.getAll();

                        getAllRequest.onsuccess = () => {
                            const items = getAllRequest.result;

                            const authItem = items.find(item =>
                                item.fbase_key && item.fbase_key.includes('firebase:authUser')
                            );

                            if (authItem && authItem.value) {
                                resolve(authItem.value);
                            } else {
                                resolve(null);
                            }
                        };

                        getAllRequest.onerror = () => {
                            resolve(null);
                        };
                    } catch (error) {
                        resolve(null);
                    }
                };
            } catch (error) {
                resolve(null);
            }
        });
    }

    // Check auth and send to background
    let lastAuthData = null;

    async function checkAndSendAuth(source = 'polling') {
        try {
            const authData = await getAuthFromIndexedDB();

            if (authData) {
                const userId = authData.uid;
                const token = authData.stsTokenManager?.accessToken;

                const authChanged = !lastAuthData ||
                    lastAuthData.userId !== userId ||
                    lastAuthData.token !== token;

                if (userId && token && authChanged) {
                    lastAuthData = { userId, token };

                    console.log(`🔄 Token updated via ${source}`);
                    chrome.runtime.sendMessage({
                        type: 'AUTH_INFO',
                        data: { userId, token }
                    });
                }
            } else {
                if (lastAuthData !== null) {
                    lastAuthData = null;
                    chrome.runtime.sendMessage({
                        type: 'AUTH_INFO',
                        data: null
                    });
                }
            }
        } catch (error) {
            console.error('Error checking auth:', error);
        }
    }

    // === METHOD 1: Listen for webapp token refresh event (INSTANT) ===
    window.addEventListener('kusernew_token_refreshed', () => {
        console.log('📢 Token refresh event received from webapp');
        checkAndSendAuth('webapp-event');
    });

    // === METHOD 2: Monitor IndexedDB for token changes (NEAR REAL-TIME) ===
    // This catches Firebase SDK automatic token refreshes
    let dbCheckInterval;
    const startIndexedDBMonitoring = () => {
        // Check IndexedDB every 5 seconds for token changes (lighter than constant monitoring)
        dbCheckInterval = setInterval(async () => {
            const authData = await getAuthFromIndexedDB();
            if (authData) {
                const currentToken = authData.stsTokenManager?.accessToken;
                if (lastAuthData && currentToken !== lastAuthData.token) {
                    console.log('🔍 Token change detected via IndexedDB monitoring');
                    checkAndSendAuth('indexeddb-monitor');
                }
            }
        }, 5000);
    };

    // Initialize
    setTimeout(() => {
        checkAndSendAuth('initial');
        startIndexedDBMonitoring();
    }, 1000);

    // === METHOD 3: Improved polling as fallback (15s instead of 60s) ===
    setInterval(() => checkAndSendAuth('polling'), 15000);

    // Listen for messages from webapp
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'KUSERNEW_TRACK_TAB') {
            const { postId, link, keywords } = event.data;

            // Just forward to background worker, it will handle finding the tab
            try {
                chrome.runtime.sendMessage({
                    type: 'TRACK_TAB',
                    data: { postId, link, keywords }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Extension context invalidated or error:', chrome.runtime.lastError.message);
                    }
                });
            } catch (error) {
                console.log('⚠️ Extension context invalidated. Please refresh the page.');
            }
        }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'RANDOM_SCROLL') {
            performRandomScroll();
            sendResponse({ success: true });
        }
        return true;
    });

    function performRandomScroll() {
        const scrollHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = scrollHeight - viewportHeight;

        if (maxScroll <= 0) return; // Page too short to scroll

        // Random scroll positions: 1/4, 2/4, 3/4, or random percentage
        const scrollOptions = [0.25, 0.5, 0.75, Math.random()];
        const randomPosition = scrollOptions[Math.floor(Math.random() * scrollOptions.length)];
        const targetScroll = Math.floor(maxScroll * randomPosition);

        console.log(`📜 Random scrolling to ${Math.round(randomPosition * 100)}% of page`);

        window.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }

    console.log('KuserNew Tab Tracker ready');

    // === LAYER 2 CLICK LOGIC ===
    // Check if we need to perform auto-clicks
    setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'CHECK_TRACKING' }, (response) => {
            if (response && response.tracking && response.keywords && response.keywords.length > 0) {
                console.log('🎯 Layer 2 Tracking Active. Keywords:', response.keywords);

                // Check if we are on Google
                const isGoogle = window.location.hostname.includes('google.com') || window.location.hostname.includes('google.com.vn');

                if (isGoogle) {
                    // If it's a search result page, highlight results
                    if (window.location.href.includes('/search')) {
                        highlightGoogleResults(response.keywords, response.postId, response.parentUrl, response.viewId);
                    } else {
                        // Check for start/num params in the URL (e.g. google.com/?start=10)
                        const urlParams = new URLSearchParams(window.location.search);
                        const start = urlParams.get('start');
                        const num = urlParams.get('num');

                        if (start || num) {
                            const keyword = response.keywords[0];
                            if (keyword) {
                                let newUrl = `${window.location.origin}/search?q=${encodeURIComponent(keyword)}`;
                                if (start) newUrl += `&start=${start}`;
                                if (num) newUrl += `&num=${num}`;

                                console.log('🚀 Redirecting to Google Search with params:', newUrl);
                                window.location.href = newUrl;
                                return;
                            }
                        }

                        performGoogleSearch(response.keywords);
                    }
                } else {
                    performLayer2Clicks(response.keywords, response.postId, response.parentUrl, response.viewId);
                }
            }
        });
    }, 1000 * 5); // Reduced to 5s to be faster for Google (was 30s)

    function highlightGoogleResults(keywords, postId, parentUrl, viewId) {
        const keyword = keywords[0];
        if (!keyword) return;

        console.log('🔍 Scanning Google Search results for:', keyword);

        // Google search results are usually in div.g or similar, but links are standard <a>
        // We look for the main link in the result
        const links = document.querySelectorAll('#search a');
        let found = false;

        links.forEach(link => {
            if (found) return; // Only highlight first match? Or all? Let's do first for now.

            const href = link.href;
            const text = link.innerText;

            // Check if href contains the keyword (assuming keyword is domain)
            // or if text contains it
            if (href.includes(keyword) || text.toLowerCase().includes(keyword.toLowerCase())) {
                console.log(`✨ Found matching result: ${href}`);

                // Blinking highlight effect (same as Layer 2)
                let colors = ['#ffff00', '#ff0000', '#00ff00', '#00ffff', '#ff00ff'];
                let colorIndex = 0;

                link.style.border = '3px solid red';
                link.style.fontWeight = 'bold';
                link.style.display = 'inline-block'; // Ensure transform works
                link.style.transition = 'all 0.2s ease';

                // Scroll to view
                link.scrollIntoView({ behavior: 'smooth', block: 'center' });

                const blinkInterval = setInterval(() => {
                    link.style.backgroundColor = colors[colorIndex];
                    link.style.transform = colorIndex % 2 === 0 ? 'scale(1.05)' : 'scale(1)';
                    colorIndex = (colorIndex + 1) % colors.length;
                }, 200);

                // Stop blinking after 60 seconds
                setTimeout(() => clearInterval(blinkInterval), 60000);

                // Log click to backend (Layer 2 tracking)
                chrome.runtime.sendMessage({
                    type: 'LOG_LAYER2_CLICK',
                    data: {
                        postId: postId,
                        parentUrl: parentUrl,
                        childUrl: href,
                        keyword: keyword,
                        viewId: viewId
                    }
                });

                // Click the link (open in new tab)
                console.log('🚀 Auto-clicking Google result...');
                setTimeout(() => {
                    window.open(href, '_blank');
                }, 2000); // Wait 2s to show highlight effect first

                found = true;
            }
        });

        if (!found) {
            console.log('⚠️ No matching results found for keyword:', keyword);
        }
    }

    function performGoogleSearch(keywords) {
        const keyword = keywords[0]; // Use the first keyword
        if (!keyword) return;

        console.log('🔍 Performing Google Search for:', keyword);

        // Find the textarea
        const textarea = document.querySelector('textarea[name="q"]') || document.getElementById('APjFqb');

        if (textarea) {
            // Simulate typing
            textarea.value = keyword;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));

            // Find form and submit
            const form = document.querySelector('form[action="/search"]');
            if (form) {
                console.log('🚀 Submitting search form...');
                setTimeout(() => {
                    form.submit();
                }, 1000); // Wait 1s before submitting
            } else {
                // Fallback: Try to find the search button
                const btn = document.querySelector('input[name="btnK"]') || document.querySelector('button[type="submit"]');
                if (btn) {
                    console.log('🚀 Clicking search button...');
                    setTimeout(() => {
                        btn.click();
                    }, 1000);
                }
            }
        } else {
            console.log('⚠️ Google search input not found');
        }
    }

    function normalizeString(str) {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[đĐ]/g, "d") // Handle d/đ
            .replace(/[^a-z0-9\s]/g, "") // Remove special chars
            .trim();
    }

    function performLayer2Clicks(keywords, postId, parentUrl, viewId) {
        const links = document.getElementsByTagName('a');
        let clickedCount = 0;
        const maxClicks = 2;

        console.log(`🔍 Scanning ${links.length} links for keywords:`, keywords);

        for (let i = 0; i < links.length; i++) {
            if (clickedCount >= maxClicks) break;

            const link = links[i];
            const text = link.innerText;
            const normalizedText = normalizeString(text);
            const href = link.href;

            // Skip invalid links
            if (!href || href.startsWith('javascript:') || href === '#' || href === window.location.href) continue;

            // Check if link matches any keyword
            const match = keywords.some(keyword => {
                const normalizedKeyword = normalizeString(keyword);
                return normalizedText.includes(normalizedKeyword);
            });

            if (match) {
                console.log(`✨ Found matching link: "${text}" -> ${href}`);

                // Blinking highlight effect
                let colors = ['#ffff00', '#ff0000', '#00ff00', '#00ffff', '#ff00ff'];
                let colorIndex = 0;

                link.style.border = '2px solid red';
                link.style.fontWeight = 'bold';
                link.style.transition = 'background-color 0.2s ease';
                link.scrollIntoView({ behavior: 'smooth', block: 'center' });

                const blinkInterval = setInterval(() => {
                    link.style.backgroundColor = colors[colorIndex];
                    link.style.color = colorIndex % 2 === 0 ? '#000000' : '#ffffff';
                    colorIndex = (colorIndex + 1) % colors.length;
                }, 200);

                // Stop blinking after 60 seconds (extended from 5s)
                setTimeout(() => clearInterval(blinkInterval), 60000);

                // Log click to backend
                chrome.runtime.sendMessage({
                    type: 'LOG_LAYER2_CLICK',
                    data: {
                        postId: postId,
                        parentUrl: parentUrl,
                        childUrl: href,
                        keyword: keywords.find(k => normalizedText.includes(normalizeString(k))),
                        viewId: viewId
                    }
                });

                // Click the link (open in new tab to preserve flow)
                console.log('🚀 Auto-clicking link in 30s...');
                setTimeout(() => {
                    window.open(href, '_blank');
                }, 30000); // Wait 30s as requested

                clickedCount++;
            }
        }

        if (clickedCount > 0) {
            console.log(`✅ Auto-clicked ${clickedCount} links.`);
        } else {
            console.log('⚠️ No matching links found.');
        }
    }

})();

