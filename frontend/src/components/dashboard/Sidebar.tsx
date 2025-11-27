'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Settings, LogOut, ChevronRight, Star, Package } from 'lucide-react';
import ChatBox from './ChatBox';
import AutoLinkButton from './AutoLinkButton';
import AutoReupButton from './AutoReupButton';

interface UserData {
    displayName?: string;
    photoURL?: string;
    email?: string;
    points?: number;
    role?: string;
}

const navigation = [
    { name: 'Tổng Quan', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Bài Viết', href: '/dashboard/posts', icon: FileText },
    { name: 'Cài Đặt', href: '/dashboard/settings', icon: Settings },
];

const adminNavigation = [
    { name: 'Extension', href: '/dashboard/admin/extension', icon: Package },
];

const Sidebar = () => {
    const pathname = usePathname();
    const { user, mongoUser, logout, expirationDate, isExpired, loading: authLoading } = useAuth();
    const [isChatExpanded, setIsChatExpanded] = useState(true); // Open by default
    // Use mongoUser if available, otherwise fall back to basic user info or empty object
    const userData = mongoUser || {};
    const loading = authLoading;

    // Calculate days until expiration
    const daysUntilExpiration = expirationDate
        ? Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className={`flex flex-col ${isChatExpanded ? 'w-96' : 'w-64'} bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white min-h-screen shadow-2xl transition-all duration-300`}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center h-16 border-b border-gray-700/50 bg-gradient-to-r from-indigo-600 to-purple-600"
            >
                <h1 className="text-xl font-bold tracking-wide">KuserNew</h1>
            </motion.div>

            {/* User Profile Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 border-b border-gray-700/50"
            >
                {loading ? (
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-700 rounded animate-pulse" />
                            <div className="h-3 bg-gray-700 rounded w-2/3 animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-indigo-400/50">
                                    {userData.photoURL ? (
                                        <img
                                            src={userData.photoURL}
                                            alt={userData.displayName || 'User'}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-white font-semibold text-lg">
                                            {userData.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"
                                />
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {userData.displayName || 'User'}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {userData.email || user?.email}
                                </p>
                            </div>
                        </div>

                        {/* Points Display */}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={`flex items-center justify-between p-2 rounded-lg ${(userData.points || 0) < 5000
                                ? 'bg-red-500/10 border border-red-500/30'
                                : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Star className={`w-4 h-4 ${(userData.points || 0) < 5000 ? 'text-red-400' : 'text-yellow-400'}`} fill="currentColor" />
                                <span className="text-xs font-medium text-gray-300">Điểm số</span>
                            </div>
                            <span className={`text-sm font-bold ${(userData.points || 0) < 5000 ? 'text-red-400' : 'text-yellow-400'}`}>
                                {(userData.points || 0).toLocaleString('vi-VN')}
                            </span>
                        </motion.div>

                        {/* Warning if points < 5000 */}
                        {(userData.points || 0) < 5000 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded border border-red-500/30"
                            >
                                ⚠️ Bài post không hiển thị (cần {'>'}= 5000)
                            </motion.div>
                        )}

                        {/* Expiration Warning */}
                        {expirationDate && daysUntilExpiration !== null && daysUntilExpiration <= 7 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`text-xs px-2 py-1.5 rounded border ${isExpired
                                    ? 'text-red-400 bg-red-500/10 border-red-500/30'
                                    : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                                    }`}
                            >
                                {isExpired ? (
                                    <>⛔ Tài khoản đã hết hạn</>
                                ) : (
                                    <>⏰ Còn {daysUntilExpiration} ngày hết hạn</>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Auto Link Button */}
            <AutoLinkButton />

            {/* Auto Reup Button */}
            <AutoReupButton />

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="px-3 space-y-1">
                    {navigation.map((item, index) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                            >
                                <Link
                                    href={item.href}
                                    className="block"
                                >
                                    <motion.div
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                            <span>{item.name}</span>
                                        </div>
                                        {isActive && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </nav>

                {/* Admin Navigation */}
                {userData.role === 'ADMIN' && (
                    <div className="mt-6">
                        <div className="px-3 mb-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Admin
                            </p>
                        </div>
                        <nav className="px-3 space-y-1">
                            {adminNavigation.map((item, index) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href);
                                const Icon = item.icon;

                                return (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + index * 0.05 }}
                                    >
                                        <Link
                                            href={item.href}
                                            className="block"
                                        >
                                            <motion.div
                                                whileHover={{ scale: 1.02, x: 4 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                                    <span>{item.name}</span>
                                                </div>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </div>

            {/* Chat Box */}
            <div className="mt-auto">
                <ChatBox
                    isExpanded={isChatExpanded}
                    setIsExpanded={setIsChatExpanded}
                />
            </div>

            {/* Logout Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 border-t border-gray-700/50"
            >
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Đăng Xuất
                </motion.button>
            </motion.div>
        </div>
    );
};

export default Sidebar;
