/**
 * Hook to detect if KuserNew Chrome extension is installed
 */

import { useState, useEffect } from 'react';

export function useExtensionDetection() {
    const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check if global flag is set by extension
        const checkExtension = () => {
            // Method 1: Check global flag
            const hasGlobalFlag = !!(window as any).__KUSERNEW_EXTENSION_INSTALLED__;

            // Method 2: Try to ping extension via chrome.runtime
            let hasChromeRuntime = false;
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                    hasChromeRuntime = true;
                }
            } catch (e) {
                // Chrome runtime not available
            }

            const installed = hasGlobalFlag || hasChromeRuntime;
            setIsExtensionInstalled(installed);
            setIsChecking(false);

            if (installed) {
                console.log('✅ Extension detected (flag:', hasGlobalFlag, ', runtime:', hasChromeRuntime, ')');
            } else {
                console.warn('⚠️ Extension not detected');
            }
        };

        // Check immediately
        checkExtension();

        // Listen for extension ready event (in case it loads after webapp)
        const handleExtensionReady = () => {
            console.log('📢 Extension ready event received');
            setIsExtensionInstalled(true);
            setIsChecking(false);
        };

        window.addEventListener('kusernew_extension_ready', handleExtensionReady);

        // Recheck after delays (content script might load after webapp)
        const timeout1 = setTimeout(checkExtension, 1000);
        const timeout2 = setTimeout(checkExtension, 3000);

        return () => {
            window.removeEventListener('kusernew_extension_ready', handleExtensionReady);
            clearTimeout(timeout1);
            clearTimeout(timeout2);
        };
    }, []);

    return { isExtensionInstalled, isChecking };
}
