'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePost } from '@/context/PostContext';
import toast from 'react-hot-toast';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

type ReupMode = 'normal' | 'specific' | 'one-user';

export default function ReupSettingsPage() {
    const { user } = useAuth();
    const { posts } = usePost();
    const [mode, setMode] = useState<ReupMode>('normal');
    const [specificPostIds, setSpecificPostIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load current settings
    useEffect(() => {
        const loadSettings = async () => {
            if (!user) return;

            try {
                const token = await user.getIdToken();
                const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
                const response = await fetch(`${BACKEND_URL}/api/reup-settings`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const settings = await response.json();
                    setMode(settings.mode || 'normal');
                    setSpecificPostIds(settings.specificPostIds || []);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;

        // Validation
        if (mode === 'specific' && specificPostIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một bài viết cho chế độ Cụ Thể');
            return;
        }

        setSaving(true);

        try {
            const token = await user.getIdToken();
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${BACKEND_URL}/api/reup-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    mode,
                    specificPostIds
                })
            });

            if (response.ok) {
                toast.success('✅ Lưu cài đặt thành công!');
            } else {
                const error = await response.json();
                toast.error(error.message || 'Lưu cài đặt thất bại');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Lưu cài đặt thất bại');
        } finally {
            setSaving(false);
        }
    };

    const togglePostSelection = (postId: string) => {
        setSpecificPostIds(prev =>
            prev.includes(postId)
                ? prev.filter(id => id !== postId)
                : [...prev, postId]
        );
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <Settings className="w-8 h-8 text-indigo-600" />
                <h1 className="text-3xl font-bold text-gray-900">Cài Đặt Reup</h1>
            </div>

            {/* Mode Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Chế Độ Reup</h2>

                <div className="space-y-4">
                    {/* Normal Mode */}
                    <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${mode === 'normal' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                        }`}>
                        <input
                            type="radio"
                            name="mode"
                            value="normal"
                            checked={mode === 'normal'}
                            onChange={() => setMode('normal')}
                            className="mt-1 w-4 h-4 text-indigo-600"
                        />
                        <div className="ml-3">
                            <div className="font-semibold text-gray-900">Chế Độ Thường</div>
                            <div className="text-sm text-gray-600">
                                Reup bài viết có lượt xem thấp nhất cho tất cả người dùng đang online (mặc định)
                            </div>
                        </div>
                        {mode === 'normal' && <CheckCircle2 className="ml-auto w-5 h-5 text-indigo-600" />}
                    </label>

                    {/* Specific Posts Mode */}
                    <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${mode === 'specific' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                        }`}>
                        <input
                            type="radio"
                            name="mode"
                            value="specific"
                            checked={mode === 'specific'}
                            onChange={() => setMode('specific')}
                            className="mt-1 w-4 h-4 text-indigo-600"
                        />
                        <div className="ml-3">
                            <div className="font-semibold text-gray-900">Chỉ Các Bài Viết Cụ Thể</div>
                            <div className="text-sm text-gray-600">
                                Chỉ reup các bài viết đã chọn (chọn bên dưới)
                            </div>
                        </div>
                        {mode === 'specific' && <CheckCircle2 className="ml-auto w-5 h-5 text-indigo-600" />}
                    </label>

                    {/* One User Mode */}
                    <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${mode === 'one-user' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                        }`}>
                        <input
                            type="radio"
                            name="mode"
                            value="one-user"
                            checked={mode === 'one-user'}
                            onChange={() => setMode('one-user')}
                            className="mt-1 w-4 h-4 text-indigo-600"
                        />
                        <div className="ml-3">
                            <div className="font-semibold text-gray-900">Reup Một Người Dùng</div>
                            <div className="text-sm text-gray-600">
                                Reup bài viết ngẫu nhiên cho MỘT người dùng online ngẫu nhiên
                            </div>
                        </div>
                        {mode === 'one-user' && <CheckCircle2 className="ml-auto w-5 h-5 text-indigo-600" />}
                    </label>
                </div>
            </div>

            {/* Post Selection (only for specific mode) */}
            {mode === 'specific' && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Chọn Bài Viết</h2>

                    {posts.length === 0 ? (
                        <p className="text-gray-500">Bạn chưa có bài viết nào.</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {posts.map(post => (
                                <label
                                    key={post._id}
                                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${specificPostIds.includes(post._id)
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-300 hover:border-indigo-400'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={specificPostIds.includes(post._id)}
                                        onChange={() => togglePostSelection(post._id)}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <div className="ml-3 flex-1">
                                        <div className="font-medium text-gray-900">{post.title}</div>
                                        <div className="text-sm text-gray-500">
                                            {post.currentView}/{post.maxView} lượt xem
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {specificPostIds.length > 0 && (
                        <div className="mt-3 text-sm text-indigo-600">
                            {specificPostIds.length} bài viết đã chọn
                        </div>
                    )}
                </div>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50"
            >
                <Save className="w-5 h-5" />
                {saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
            </button>
        </div>
    );
}
