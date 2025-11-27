// Popup script - displays active tabs being tracked
let updateInterval;

// Format duration in seconds to readable format
function formatDuration(seconds) {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }
}

// Truncate URL for display
function truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

// Get active views from background
async function getActiveViews() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_ACTIVE_VIEWS' }, (response) => {
            resolve(response || { views: [], authStatus: false });
        });
    });
}

// Update the popup UI
async function updateUI() {
    const data = await getActiveViews();
    const { views, authStatus } = data;

    // Update status
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    if (authStatus) {
        statusDot.classList.remove('offline');
        statusText.textContent = 'Đã đăng nhập và sẵn sàng track';
    } else {
        statusDot.classList.add('offline');
        statusText.textContent = 'Chưa đăng nhập (Vui lòng đăng nhập webapp)';
    }

    // Update tab list
    const tabList = document.getElementById('tabList');

    if (views.length === 0) {
        // Show empty state when no tabs are being tracked
        tabList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-text">Chưa có tab nào đang được track</div>
            </div>
        `;
    } else {
        // Hide empty state and show tabs
        tabList.innerHTML = views.map(view => {
            return `
                <div class="tab-item">
                    <div class="tab-header">
                        <span class="tab-id">Tab #${view.tabId}</span>
                        <span class="tab-status">Đang xem...</span>
                    </div>
                    <div class="tab-link" title="${view.url}">
                        🔗 ${truncateUrl(view.url)}
                    </div>
                    <div class="tab-post">
                        Post ID: ${view.postId}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    // Update periodically to check for new tabs
    updateInterval = setInterval(updateUI, 2000);
});

// Cleanup on popup close
window.addEventListener('unload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
