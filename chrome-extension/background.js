// Background service worker for tab tracking
const BACKEND_URL = 'http://localhost:8000';
const APP_URL = 'http://localhost:3000';

// Global state cache
let activeViewsCache = null;
let authInfoCache = null;
let isRestoring = false;
let restorePromise = null;

// Pending tracks: Map<url, {postId, timestamp}>
// Used when we receive a track request but the tab hasn't finished loading the URL yet
const pendingTracks = new Map();

// Tab rotation system
let rotationInterval = null;
let tabFocusTime = new Map(); // Track focus time per tab
const ROTATION_INTERVAL_MS = 20000; // 20 seconds
const MIN_FOCUS_TIME_MS = 60000; // 1 minute minimum focus per tab
let lastFocusedTab = null;

// Helper to get the active views map, ensuring it's loaded from storage
function getState() {
    if (activeViewsCache && authInfoCache) {
        return Promise.resolve({ activeViews: activeViewsCache, authInfo: authInfoCache });
    }

    if (isRestoring && restorePromise) {
        return restorePromise;
    }

    isRestoring = true;
    restorePromise = new Promise((resolve) => {
        chrome.storage.local.get(['activeViews', 'authInfo'], (result) => {
            if (result.activeViews) {
                activeViewsCache = new Map(result.activeViews);
                console.log('🔄 Restored active views:', activeViewsCache.size);
            } else {
                activeViewsCache = new Map();
            }

            if (result.authInfo) {
                authInfoCache = result.authInfo;
                console.log('🔄 Restored auth info');
            }

            isRestoring = false;
            resolve({ activeViews: activeViewsCache, authInfo: authInfoCache });
        });
    });

    return restorePromise;
}

// Helper to save state
async function saveState() {
    const { activeViews, authInfo } = await getState();

    // Map cannot be stored directly in chrome.storage
    const viewsArray = Array.from(activeViews.entries());
    console.log('💾 Saving state, active tabs:', viewsArray.length);

    return new Promise((resolve) => {
        chrome.storage.local.set({
            activeViews: viewsArray,
            authInfo: authInfo
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving state:', chrome.runtime.lastError);
            }
            resolve();
        });
    });
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // We must return true immediately to indicate async response
    handleMessage(message, sender, sendResponse);
    return true;
});

async function handleMessage(message, sender, sendResponse) {
    // Ensure state is loaded before processing any message
    const { activeViews, authInfo } = await getState();

    if (message.type === 'AUTH_INFO') {
        authInfoCache = message.data; // Update cache
        await saveState(); // Save to storage

        // Concise logging
        if (authInfoCache) {
            console.log(`🔐 Auth updated: User ${authInfoCache.userId.substring(0, 8)}... | Token: ${authInfoCache.token.length} chars`);
        } else {
            console.log('🔐 Auth cleared');
        }

        sendResponse({ success: true });
    }
    else if (message.type === 'TRACK_TAB') {
        // Tab opened from our app
        // We pass null so handleTrackTab will look up the tab by URL.
        const tabId = message.tabId || null;

        await handleTrackTab(message.data, tabId);
        sendResponse({ success: true });
    }
    else if (message.type === 'GET_ACTIVE_VIEWS') {
        const views = Array.from(activeViews.entries()).map(([tabId, viewInfo]) => ({
            tabId: tabId,
            viewId: viewInfo.viewId,
            postId: viewInfo.postId,
            startTime: viewInfo.startTime,
            url: viewInfo.url
        }));

        console.log(`📤 Sending ${views.length} active views to popup`);

        sendResponse({
            views: views,
            authStatus: authInfo !== null
        });
    }
    else if (message.type === 'CHECK_TRACKING') {
        // Content script asking if it should track
        // Sender tab ID is in sender.tab.id
        if (sender.tab && activeViews.has(sender.tab.id)) {
            const viewInfo = activeViews.get(sender.tab.id);
            sendResponse({
                tracking: true,
                keywords: viewInfo.keywords || [],
                postId: viewInfo.postId,
                parentUrl: viewInfo.url,
                viewId: viewInfo.viewId
            });
        } else {
            sendResponse({ tracking: false });
        }
    }
    else if (message.type === 'LOG_LAYER2_CLICK') {
        // Instead of logging immediately, add to pending tracks so we can track the new tab
        const { postId, parentUrl, childUrl, keyword, viewId } = message.data;

        console.log(`📝 Queuing Layer 2 click: ${childUrl}`);

        pendingTracks.set(childUrl, {
            postId,
            keywords: [keyword], // Store as array for consistency
            viewId, // Link to parent view
            type: 'LAYER2',
            timestamp: Date.now()
        });

        sendResponse({ success: true });
    }
}

// Handle tab tracking request
async function handleTrackTab(data, tabId) {
    const { activeViews, authInfo } = await getState();

    if (!authInfo || !authInfo.userId || !authInfo.token) {
        console.log('❌ Cannot track: Not authenticated');
        return;
    }

    const { postId, link, keywords } = data;
    console.log(data)

    // If no tabId provided, try to find the tab by URL
    if (!tabId) {
        chrome.tabs.query({}, (tabs) => {
            // Find the most recently created tab with matching URL
            // AND ensure it is NOT already being tracked
            const matchingTab = tabs
                .filter(tab => {
                    const urlMatch = tab.url && tab.url.startsWith(link.split('?')[0]);
                    const notTracked = !activeViews.has(tab.id);
                    return urlMatch && notTracked;
                })
                .sort((a, b) => b.id - a.id)[0];

            if (matchingTab) {
                console.log(`🔍 Found available tab ${matchingTab.id} for ${link}`);
                startTracking(matchingTab.id, postId, link, keywords, 'LAYER1');
            } else {
                console.log(`⏳ No available tab found for ${link}, adding to pending tracks`);
                // Add to pending tracks to catch it when it loads
                pendingTracks.set(link, {
                    postId: postId,
                    keywords: keywords,
                    type: 'LAYER1',
                    timestamp: Date.now()
                });

                // Clear pending track after 10 seconds if not found
                setTimeout(() => {
                    if (pendingTracks.has(link)) {
                        pendingTracks.delete(link);
                        console.log(`❌ Pending track timed out for ${link}`);
                    }
                }, 10000);
            }
        });
    } else {
        await startTracking(tabId, postId, link, keywords, 'LAYER1');
    }
}

async function startTracking(tabId, postId, link, keywords = [], type = 'LAYER1', parentViewId = null) {
    const { activeViews, authInfo } = await getState();

    // Check if already tracking this tab
    if (activeViews.has(tabId)) {
        console.log(`⚠️ Already tracking tab ${tabId}, restarting tracking...`);
        // If we are already tracking this tab, we should end the previous session first
        // This handles cases where the user might have navigated within the same tab
        // or clicked the link again.
        await handleTabClosed(tabId);

        // Re-fetch state as handleTabClosed modifies it
        const newState = await getState();
        activeViews = newState.activeViews;
        authInfo = newState.authInfo;
    }

    try {
        // Send view_start to backend API
        let result;
        let response;

        if (type === 'LAYER2') {
            // Start Layer 2 tracking
            response = await fetch(`${BACKEND_URL}/api/click-history/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authInfo.token}`
                },
                body: JSON.stringify({
                    postId,
                    parentUrl: parentViewId ? activeViews.get(parentViewId)?.url || 'unknown' : 'unknown', // Pass parent URL if available
                    childUrl: link,
                    keyword: keywords[0] || '',
                    viewId: parentViewId // This is the parent viewId
                })
            });
            result = await response.json();
            // result should have clickId
            result.viewId = result.clickId; // Normalize ID for local storage
        } else {
            // Start Layer 1 tracking
            response = await fetch(`${BACKEND_URL}/api/views/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authInfo.token}`
                },
                body: JSON.stringify({
                    userId: authInfo.userId,
                    postId: postId,
                    link: link
                })
            });
            result = await response.json();
        }

        if (response.ok && (result.viewId || result.clickId)) {
            const id = result.viewId || result.clickId;
            console.log(`✅ Tracking started for ${link} (${type}). ID: ${id}`);

            // Calculate random auto-close duration
            // Layer 1: 120s - 180s (2m - 3m)
            // Layer 2: 120s - 240s (2m - 4m)
            let minSeconds = type === 'LAYER2' ? 120 : 120;
            let maxSeconds = type === 'LAYER2' ? 240 : 180;
            const durationSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
            const durationMs = durationSeconds * 1000;

            console.log(`⏱️ Auto-close scheduled in ${durationSeconds}s for tab ${tabId}`);

            // Schedule auto-close
            console.log(`⏱️ Auto-close scheduled in ${durationSeconds}s for tab ${tabId}`);

            // Use alarms instead of setTimeout for robustness
            chrome.alarms.create(`close_tab_${tabId}`, { when: Date.now() + durationMs });

            activeViews.set(tabId, {
                viewId: id,
                postId: postId,
                startTime: Date.now(),
                url: link,
                keywords: keywords,
                type: type
            });

            // Update cache and save
            activeViewsCache = activeViews;
            await saveState();

            console.log(`📊 Active tabs: ${activeViews.size}`);

            // Start tab rotation if this is the first tab
            if (activeViews.size === 1) {
                startTabRotation();
            }
        } else {
            const error = await response.text();
            console.error('❌ API error:', response.status, error);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Tab rotation functions
function startTabRotation() {
    if (rotationInterval) return; // Already running

    console.log('🔄 Starting tab rotation system');
    rotationInterval = setInterval(rotateToNextTab, ROTATION_INTERVAL_MS);
}

function stopTabRotation() {
    if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
        console.log('⏸️ Stopped tab rotation system');
    }
}

async function rotateToNextTab() {
    const { activeViews } = await getState();

    if (activeViews.size === 0) {
        stopTabRotation();
        return;
    }

    // Get all tracked tab IDs
    const trackedTabs = Array.from(activeViews.keys());

    // Filter tabs that need more focus time (< 60s total)
    const tabsNeedingFocus = trackedTabs.filter(tabId => {
        const focusTime = tabFocusTime.get(tabId) || 0;
        return focusTime < MIN_FOCUS_TIME_MS;
    });

    let nextTab;

    if (tabsNeedingFocus.length > 0) {
        // Prioritize tabs that haven't reached minimum focus time
        // Pick the one with least focus time
        nextTab = tabsNeedingFocus.reduce((minTab, currentTab) => {
            const minFocus = tabFocusTime.get(minTab) || 0;
            const currentFocus = tabFocusTime.get(currentTab) || 0;
            return currentFocus < minFocus ? currentTab : minTab;
        });
    } else {
        // All tabs have minimum focus, pick random
        nextTab = trackedTabs[Math.floor(Math.random() * trackedTabs.length)];
    }

    // Update focus time for last tab
    if (lastFocusedTab !== null && activeViews.has(lastFocusedTab)) {
        const currentFocus = tabFocusTime.get(lastFocusedTab) || 0;
        tabFocusTime.set(lastFocusedTab, currentFocus + ROTATION_INTERVAL_MS);
    }

    // Focus the next tab
    try {
        await chrome.tabs.update(nextTab, { active: true });
        const tab = await chrome.tabs.get(nextTab);
        await chrome.windows.update(tab.windowId, { focused: true });

        lastFocusedTab = nextTab;

        // Send scroll command to content script
        chrome.tabs.sendMessage(nextTab, { type: 'RANDOM_SCROLL' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Could not send scroll message:', chrome.runtime.lastError.message);
            }
        });

        console.log(`🎯 Focused tab ${nextTab} | Focus time: ${(tabFocusTime.get(nextTab) || 0) / 1000}s`);
    } catch (error) {
        console.log('Error focusing tab:', error.message);
        // Tab might be closed, clean up
        tabFocusTime.delete(nextTab);
    }
}

// Handle alarms for auto-closing tabs
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('close_tab_')) {
        const tabId = parseInt(alarm.name.replace('close_tab_', ''), 10);
        console.log(`⏰ Alarm triggered: Closing tab ${tabId}`);
        chrome.tabs.remove(tabId).catch(err => console.log('Tab already closed or could not be removed:', err.message));
    }
});

// Listen for tab removal (tab closed)
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    // handleTabClosed already contains the logic for ending tracking and saving state
    await handleTabClosed(tabId);
});

// Listen for tab updates (URL changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const { activeViews } = await getState();

    // 1. Check if this update matches a pending track
    if (changeInfo.url) {
        // Check if any pending track matches this URL
        for (const [link, data] of pendingTracks.entries()) {
            if (changeInfo.url.startsWith(link.split('?')[0])) {
                console.log(`🎯 Found pending match for ${link} on tab ${tabId}`);
                pendingTracks.delete(link);
                startTracking(tabId, data.postId, link, data.keywords, data.type || 'LAYER1', data.viewId);
                break;
            }
        }
    }

    // 2. Check if we need to stop tracking (navigation away)
    if (changeInfo.url && activeViews.has(tabId)) {
        const viewInfo = activeViews.get(tabId);
        // Ignore if it's just a hash change or query param change that keeps same base URL
        // But for now, strict check
        if (changeInfo.url !== viewInfo.url) {
            // Check if it's a Google search progression (e.g. google.com -> google.com/search?q=...)
            const isGoogle = (viewInfo.url.includes('google.com') || viewInfo.url.includes('google.com.vn')) &&
                (changeInfo.url.includes('google.com') || changeInfo.url.includes('google.com.vn'));

            if (isGoogle) {
                console.log(`Redirecting tracking for Google Search: ${viewInfo.url} -> ${changeInfo.url}`);
                viewInfo.url = changeInfo.url; // Update the tracked URL
                activeViews.set(tabId, viewInfo);
                saveState();
                return; // Don't close
            }

            console.log(`🔄 Tab ${tabId} navigated away from ${viewInfo.url} to ${changeInfo.url}`);
            await handleTabClosed(tabId);
        }
    }
});

async function handleTabClosed(tabId) {
    const { activeViews, authInfo } = await getState();
    const viewInfo = activeViews.get(tabId);

    if (viewInfo) {
        console.log(`🔴 Tab ${tabId} closed (or navigated), ending tracking...`);

        // Clear auto-close alarm if it exists
        chrome.alarms.clear(`close_tab_${tabId}`);

        const endpoint = viewInfo.type === 'LAYER2' ? '/api/click-history/end' : '/api/views/end';
        const body = viewInfo.type === 'LAYER2'
            ? { clickId: viewInfo.viewId }
            : { viewId: viewInfo.viewId, postId: viewInfo.postId };

        // Send end tracking request
        if (authInfo && authInfo.token) {
            try {
                const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authInfo.token}`
                    },
                    body: JSON.stringify(body)
                });

                if (response.ok) {
                    const result = await response.json();
                    const duration = Math.round((Date.now() - viewInfo.startTime) / 1000);
                    console.log(`✅ Ended tab ${tabId} | Duration: ${duration}s | Points: ${result.points || result.pointsEarned || 0}`);
                } else {
                    console.error('❌ API error on end:', response.status);
                }
            } catch (error) {
                console.error('❌ Error ending tracking:', error.message);
            }
        }

        activeViews.delete(tabId);
        activeViewsCache = activeViews; // Update cache reference
        await saveState();

        // Clean up focus tracking
        tabFocusTime.delete(tabId);
        if (lastFocusedTab === tabId) {
            lastFocusedTab = null;
        }

        // Stop rotation if no more tabs
        if (activeViews.size === 0) {
            stopTabRotation();
        }

        console.log(`📊 Active tabs: ${activeViews.size}`);
    }
}

console.log('🚀 KuserNew Tab Tracker loaded');
