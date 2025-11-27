'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Shield, UserCog, User as UserIcon, Calendar, Mail, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface User {
    _id: string;
    uid: string;
    email: string;
    displayName?: string;
    role: 'ADMIN' | 'MANAGER' | 'USER';
    points: number;
    expirationDate?: string;
    createdAt: string;
}

interface UserDetailDialogProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function UserDetailDialog({ user, isOpen, onClose, onUpdate }: UserDetailDialogProps) {
    const { user: currentUser } = useAuth();
    const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'USER'>('USER');
    const [expirationDate, setExpirationDate] = useState('');
    const [points, setPoints] = useState(6000);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setRole(user.role);
            setExpirationDate(user.expirationDate ? new Date(user.expirationDate).toISOString().split('T')[0] : '');
            setPoints(user.points || 6000);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user || !currentUser) return;

        setSaving(true);
        try {
            const token = await currentUser.getIdToken();
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

            const response = await fetch(`${BACKEND_URL}/api/admin/users/${user._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role,
                    expirationDate: expirationDate || null,
                    points,
                }),
            });

            if (response.ok) {
                toast.success('Cập nhật thông tin user thành công!');
                onUpdate();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Có lỗi xảy ra khi cập nhật user');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Không thể kết nối đến server');
        } finally {
            setSaving(false);
        }
    };

    const getRoleIcon = (roleType: string) => {
        switch (roleType) {
            case 'ADMIN': return Shield;
            case 'MANAGER': return UserCog;
            default: return UserIcon;
        }
    };

    const getRoleColor = (roleType: string) => {
        switch (roleType) {
            case 'ADMIN': return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'MANAGER': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    if (!user) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <UserIcon className="w-6 h-6" />
                                    Chi tiết User
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* User Info Section */}
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                        Thông tin cơ bản
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                                <span className="text-white font-semibold text-lg">
                                                    {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {user.displayName || 'N/A'}
                                                </p>
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <Mail className="w-4 h-4" />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-200">
                                            <Calendar className="w-4 h-4" />
                                            <span>Tạo lúc: {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm font-semibold pt-2 ${user.points < 5000 ? 'text-red-600' : 'text-green-600'}`}>
                                            <span className="text-lg">⭐</span>
                                            <span>Điểm số: {user.points.toLocaleString('vi-VN')}</span>
                                            {user.points < 5000 && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                                    Bài post không hiển thị
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Edit Form */}
                                <div className="space-y-5">
                                    {/* Role Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Vai trò
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['ADMIN', 'MANAGER', 'USER'] as const).map((roleOption) => {
                                                const RoleIcon = getRoleIcon(roleOption);
                                                const isSelected = role === roleOption;
                                                return (
                                                    <button
                                                        key={roleOption}
                                                        type="button"
                                                        onClick={() => setRole(roleOption)}
                                                        className={`
                                                            relative p-4 rounded-xl border-2 transition-all duration-200
                                                            ${isSelected
                                                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className={`
                                                                p-2 rounded-lg border
                                                                ${isSelected ? getRoleColor(roleOption) : 'bg-gray-50 border-gray-200 text-gray-600'}
                                                            `}>
                                                                <RoleIcon className="w-5 h-5" />
                                                            </div>
                                                            <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                                                                {roleOption}
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <motion.div
                                                                layoutId="role-indicator"
                                                                className="absolute inset-0 border-2 border-indigo-500 rounded-xl"
                                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Expiration Date */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Ngày hết hạn
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="date"
                                                value={expirationDate}
                                                onChange={(e) => setExpirationDate(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Để trống nếu không muốn giới hạn thời gian
                                        </p>
                                    </div>

                                    {/* Points */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Điểm số
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">⭐</span>
                                            <input
                                                type="number"
                                                value={points}
                                                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                                                min="0"
                                                step="100"
                                                className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:ring-2 transition-all outline-none ${points < 5000
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                                    : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'
                                                    }`}
                                            />
                                        </div>
                                        {points < 5000 ? (
                                            <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                                                ⚠️ Bài post của user này sẽ không hiển thị trong feed (cần {'>'}= 5000 điểm)
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                                                ✓ Bài post của user này sẽ hiển thị trong feed
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl border-t border-gray-200">
                                <button
                                    onClick={onClose}
                                    disabled={saving}
                                    className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/30"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Lưu thay đổi
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
