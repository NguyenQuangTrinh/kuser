'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePost } from '@/context/PostContext';
import Button from '@/components/ui/Button';
import PostItem from '@/components/dashboard/PostItem';

export default function PostsPage() {
    const { posts, loading, fetchPosts } = usePost();

    // Manually fetch posts when this page loads
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Bài Viết Của Tôi</h1>
                <Link href="/dashboard/posts/create">
                    <Button>Đăng Bài Mới</Button>
                </Link>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Chưa có bài viết nào.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map((post) => (
                        <PostItem key={post._id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}
