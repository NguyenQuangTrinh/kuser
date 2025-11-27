'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { RefreshCw, Square, AlertCircle } from 'lucide-react';
import { useExtensionDetection } from '@/hooks/useExtensionDetection';

const AutoReupButton: React.FC = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [isRunning, setIsRunning] = useState(false);
    const [lastReupPost, setLastReupPost] = useState<string>('');
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
    const { isExtensionInstalled, isChecking } = useExtensionDetection();

    const INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [intervalId]);

    const handleStart = () => {
        if (!isExtensionInstalled) {
            toast.error('⚠️ Vui lòng cài đặt KuserNew Extension để sử dụng tính năng này!');
            return;
        }

        if (!socket || !user) {
            toast.error('Vui lòng đăng nhập để sử dụng tính năng này');
            return;
        }

        // Register socket listeners
        socket.on('smart_reup_success', (data: any) => {
            // toast.success(`✅ ${data.message}`);
            setLastReupPost(data.postTitle);
        });

        socket.on('smart_reup_error', (data: any) => {
            toast.error(`❌ ${data.message}`);
        });

        // First reup immediately
        socket.emit('smart_reup_request', { userId: user.uid });

        // Then every 5 mins
        const id = setInterval(() => {
            socket.emit('smart_reup_request', { userId: user.uid });
        }, INTERVAL_MS);

        setIntervalId(id);
        setIsRunning(true);
        toast.success('Auto Reup started!');
    };

    const handleStop = () => {
        if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
        }

        if (socket) {
            socket.off('smart_reup_success');
            socket.off('smart_reup_error');
        }

        setIsRunning(false);
        setLastReupPost('');
        toast.success('Auto Reup stopped');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 border-b border-gray-700/50"
        >
            {/* Extension warning */}
            {!isChecking && !isExtensionInstalled && (
                <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Extension chưa cài</span>
                </div>
            )}

            {!isRunning ? (
                <button
                    onClick={handleStart}
                    disabled={!isExtensionInstalled}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all shadow-lg ${isExtensionInstalled
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-purple-500/50'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Auto Reup</span>
                </button>
            ) : (
                <div>
                    <button
                        onClick={handleStop}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium transition-all shadow-lg hover:shadow-red-500/50 animate-pulse"
                    >
                        <Square className="w-4 h-4" fill="currentColor" />
                        <span>Stop Auto Reup</span>
                    </button>
                    {lastReupPost && (
                        <div className="mt-1.5 px-2 py-1 text-xs text-gray-400 bg-gray-800/50 rounded">
                            Last: {lastReupPost.substring(0, 30)}...
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default AutoReupButton;

