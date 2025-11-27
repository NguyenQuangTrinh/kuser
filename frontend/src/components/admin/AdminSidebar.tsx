'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Users, Settings, Home, LogOut, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminSidebar = () => {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navigation = [
        { name: 'Users', href: '/admin', icon: Users },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const isActive = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    return (
        <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col w-64 bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen shadow-xl"
        >
            <div className="flex items-center justify-center h-16 bg-gray-950 border-b border-gray-700">
                <LayoutDashboard className="w-6 h-6 text-indigo-400 mr-2" />
                <h1 className="text-white text-xl font-bold">Admin Panel</h1>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-2">
                {navigation.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <motion.div
                            key={item.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link
                                href={item.href}
                                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${active
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:shadow-md'
                                    }`}
                            >
                                <Icon className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                    }`} />
                                {item.name}
                            </Link>
                        </motion.div>
                    );
                })}
            </nav>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-3 border-t border-gray-700 space-y-2"
            >
                <Link
                    href="/dashboard"
                    className="group flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                    <Home className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white transition-transform group-hover:scale-110" />
                    Back to Dashboard
                </Link>
                <button
                    onClick={logout}
                    className="group w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                    <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white transition-transform group-hover:scale-110" />
                    Logout
                </button>
            </motion.div>
        </motion.div>
    );
};

export default AdminSidebar;
