'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MousePointer, ExternalLink, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface ClickHistoryItem {
    _id: string;
    userId: string;
    postId: string;
    parentUrl: string;
    childUrl: string;
    keyword: string;
    createdAt: string;
    viewId?: {
        duration?: number;
        pointsAwarded?: number;
    };
}

export default function ClickHistoryPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState<ClickHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClicks, setTotalClicks] = useState(0);

    useEffect(() => {
        fetchHistory();
    }, [page]);

    const fetchHistory = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${BACKEND_URL}/api/click-history?page=${page}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setHistory(data.history);
                setTotalPages(data.totalPages);
                setTotalClicks(data.totalClicks);
            } else {
                toast.error('Không thể tải lịch sử click');
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Lỗi kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <div className="flex items-center justify-between mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center"
                    >
                        <Link href="/admin" className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </Link>
                        <MousePointer className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Lịch Sử Click Tầng 2</h2>
                            <p className="text-sm text-gray-500">Tổng số click: {totalClicks}</p>
                        </div>
                    </motion.div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"
                        />
                    </div>
                ) : (
                    <>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white shadow-lg overflow-hidden sm:rounded-lg border border-gray-200"
                        >
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Thời Gian
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Từ Khóa
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Link Gốc (Tầng 1)
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Link Được Click (Tầng 2)
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User ID
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                                    Chưa có dữ liệu click nào.
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((item, index) => (
                                                <motion.tr
                                                    key={item._id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                                            {formatDate(item.createdAt)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                            {item.keyword}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.parentUrl}>
                                                        <a href={item.parentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                                            <ExternalLink className="w-3 h-3 mr-1" />
                                                            {item.parentUrl}
                                                        </a>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.childUrl}>
                                                        <a href={item.childUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline flex items-center">
                                                            <ExternalLink className="w-3 h-3 mr-1" />
                                                            {item.childUrl}
                                                        </a>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.userId}
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
                                <div className="flex-1 flex justify-between">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-700 self-center">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
