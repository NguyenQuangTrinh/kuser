// This script runs in the page's context (not isolated)
// It's injected by the content script to set the extension detection flag

window.__KUSERNEW_EXTENSION_INSTALLED__ = true;
console.log('✅ KuserNew Extension detected - flag set in page context');

// Dispatch event to notify webapp
window.dispatchEvent(new CustomEvent('kusernew_extension_ready'));
