'use client';

import React, { useState, useEffect } from 'react';
import { Play, Square, AlertCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { autoLinkOpener } from '@/services/autoLinkOpener';
import { usePost, Post } from '@/context/PostContext';
import { hasLinks } from '@/utils/linkExtractor';
import { useExtensionDetection } from '@/hooks/useExtensionDetection';

const AutoLinkButton: React.FC = () => {
    const pathname = usePathname();
    const { feedPosts, setFeedPosts, fetchMorePosts, hasMorePosts, fetchInfinitePosts } = usePost();
    const [isRunning, setIsRunning] = useState(false);
    const { isExtensionInstalled, isChecking } = useExtensionDetection();

    // Only show on feed page (/dashboard)
    const isFeedPage = pathname === '/dashboard';

    // Poll service status
    useEffect(() => {
        const interval = setInterval(() => {
            const s = autoLinkOpener.getStatus();
            setIsRunning(s.isRunning);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    // Filter out posts without links on component mount
    useEffect(() => {
        if (isFeedPage) {
            setFeedPosts((prevPosts: Post[]) =>
                prevPosts.filter((post: Post) => hasLinks(post.content))
            );
        }
    }, [isFeedPage, setFeedPosts]);

    // Auto-fetch when running and posts get low
    useEffect(() => {
        if (isRunning && feedPosts.length < 3) {
            console.log('Auto-fetching infinite posts... Current:', feedPosts.length);
            // Use infinite fetch to allow duplicates/looping
            fetchInfinitePosts();
        }
    }, [isRunning, feedPosts.length, fetchInfinitePosts]);

    // Continuously feed new posts to the opener if running
    useEffect(() => {
        if (isRunning && feedPosts.length > 0) {
            const postsWithLinks = feedPosts.filter((post: Post) => hasLinks(post.content));
            if (postsWithLinks.length > 0) {
                autoLinkOpener.addPosts(postsWithLinks);
            }
        }
    }, [isRunning, feedPosts]);

    const handleStart = () => {
        if (!isExtensionInstalled) {
            alert('⚠️ Vui lòng cài đặt KuserNew Extension để sử dụng tính năng này!');
            return;
        }

        // Filter posts with links only
        const postsWithLinks = feedPosts.filter((post: Post) => hasLinks(post.content));

        if (postsWithLinks.length === 0) {
            alert('Không có bài post nào có link!');
            return;
        }

        // Start auto-opener with callback to remove posts
        autoLinkOpener.start(postsWithLinks, async (postId: string) => {
            console.log('Removing post from feed:', postId);
            setFeedPosts((prevPosts: Post[]) => {
                const newPosts = prevPosts.filter((post: Post) => post._id !== postId);

                // Auto-fetch if needed
                if (newPosts.length < 3 && hasMorePosts) {
                    console.log('Post removed, fetching more...');
                    fetchMorePosts();
                }

                return newPosts;
            });
        });
    };

    const handleStop = () => {
        autoLinkOpener.stop();
    };

    // Don't render if not on feed page
    if (!isFeedPage) {
        return null;
    }

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
                    <span>Extension chưa cài. <a href="chrome://extensions" className="underline">Cài đặt ngay</a></span>
                </div>
            )}

            {!isRunning ? (
                <button
                    onClick={handleStart}
                    disabled={!isExtensionInstalled}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all shadow-lg ${isExtensionInstalled
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-emerald-500/50'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                >
                    <Play className="w-4 h-4" fill="currentColor" />
                    <span>Auto Open Links</span>
                </button>
            ) : (
                <button
                    onClick={handleStop}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium transition-all shadow-lg hover:shadow-red-500/50 animate-pulse"
                >
                    <Square className="w-4 h-4" fill="currentColor" />
                    <span>Stop Auto Open</span>
                </button>
            )}
        </motion.div>
    );
};

export default AutoLinkButton;

