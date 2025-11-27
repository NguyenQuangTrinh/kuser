'use client';

import React from 'react';
import { usePost } from '@/context/PostContext';
import PostItem from '@/components/dashboard/PostItem';

export default function DashboardPage() {
    const { feedPosts, feedLoading } = usePost();

    if (feedLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Bảng tin</h1>

                <div className="space-y-6">
                    {feedPosts.length > 0 ? (
                        feedPosts.map((post) => (
                            <PostItem key={post._id} post={post} />
                        ))
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center text-gray-500">
                            Chưa có bài viết nào.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
