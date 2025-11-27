'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { Download, X, AlertCircle } from 'lucide-react';
import { getApiUrl } from '@/config/api';

interface ExtensionInfo {
    _id: string;
    version: string;
    description: string;
    uploadedAt: string;
}

export default function ExtensionUpdateBanner() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [latestVersion, setLatestVersion] = useState<ExtensionInfo | null>(null);
    const [dismissed, setDismissed] = useState(false);

    // Fetch latest version
    const fetchLatestVersion = async () => {
        if (!user) return;

        try {
            const token = await user.getIdToken();
            const response = await fetch(getApiUrl('/api/extension/latest'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setLatestVersion(data);
                    // Check if user has dismissed this version
                    const dismissedVersion = localStorage.getItem('dismissedExtensionVersion');
                    setDismissed(dismissedVersion === data.version);
                }
            }
        } catch (error) {
            console.error('Error fetching latest extension:', error);
        }
    };

    useEffect(() => {
        fetchLatestVersion();
    }, [user]);

    // Listen for new extension uploads
    useEffect(() => {
        if (!socket) return;

        const handleExtensionUpdate = (data: any) => {
            console.log('New extension version available:', data);
            setLatestVersion({
                _id: '',
                version: data.version,
                description: data.description,
                uploadedAt: data.uploadedAt
            });
            setDismissed(false);
            // Remove dismissed flag for new version
            localStorage.removeItem('dismissedExtensionVersion');
        };

        socket.on('extension_update', handleExtensionUpdate);

        return () => {
            socket.off('extension_update', handleExtensionUpdate);
        };
    }, [socket]);

    const handleDismiss = () => {
        if (latestVersion) {
            localStorage.setItem('dismissedExtensionVersion', latestVersion.version);
            setDismissed(true);
        }
    };

    const handleDownload = async () => {
        if (!latestVersion || !user) return;

        try {
            const token = await user.getIdToken();
            window.open(getApiUrl(`/api/extension/download/${latestVersion._id}?token=${token}`), '_blank');
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    if (!latestVersion || dismissed) return null;

    return (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">
                            New Extension Version Available: v{latestVersion.version}
                        </p>
                        {latestVersion.description && (
                            <p className="text-sm text-blue-100 mt-1">
                                {latestVersion.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
