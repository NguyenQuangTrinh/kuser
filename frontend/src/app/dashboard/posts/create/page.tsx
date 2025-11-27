'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createPostAction } from '@/actions/post';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function CreatePostPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [maxView, setMaxView] = useState(50);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!user) {
            setError('Bạn phải đăng nhập để tạo bài viết');
            setLoading(false);
            return;
        }

        try {
            const token = await user.getIdToken();
            const result = await createPostAction(token, title, content, maxView);

            if (result.success) {
                toast.success('✅ Đăng bài thành công!');
                // Redirect back to dashboard/posts after successful creation
                router.push('/dashboard/posts');
            } else {
                // Display backend error message directly
                setError(result.error || 'Có lỗi xảy ra, vui lòng thử lại');
            }
        } catch (err) {
            console.error('Error creating post:', err);
            setError('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Tạo Bài Viết Mới</h1>

            <div className="bg-white p-8 rounded-lg shadow border border-gray-200">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Tiêu Đề"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="Nhập tiêu đề bài viết"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nội Dung
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            rows={6}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Nhập nội dung bài viết..."
                        />
                    </div>

                    <Input
                        label="Số Lượt Xem Tối Đa"
                        type="number"
                        value={maxView}
                        onChange={(e) => setMaxView(Number(e.target.value))}
                        required
                        min={1}
                    />
                    <div className="flex justify-end space-x-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" isLoading={loading}>
                            Đăng Bài
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
