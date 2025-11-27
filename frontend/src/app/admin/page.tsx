'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users as UsersIcon, Shield, UserCog, User, Calendar, Clock, AlertCircle, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import UserDetailDialog from '@/components/admin/UserDetailDialog';

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

export default function AdminUsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const fetchUsers = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${BACKEND_URL}/api/admin/users?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
                setTotalPages(data.totalPages);
            } else {
                toast.error('Không thể tải danh sách users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Lỗi kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const isExpired = (dateString?: string) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'ADMIN': return Shield;
            case 'MANAGER': return UserCog;
            default: return User;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'MANAGER': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedUser(null);
    };

    const handleUserUpdate = () => {
        fetchUsers();
    };

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center mb-6"
                >
                    <UsersIcon className="w-8 h-8 text-indigo-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                </motion.div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"
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
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Expiration
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((u, index) => {
                                        const RoleIcon = getRoleIcon(u.role);
                                        return (
                                            <motion.tr
                                                key={u._id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white font-semibold text-sm">
                                                                {u.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {u.displayName || 'N/A'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getRoleColor(u.role)}`}>
                                                        <RoleIcon className="w-3 h-3 mr-1" />
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`flex items-center text-sm ${isExpired(u.expirationDate) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                                        {isExpired(u.expirationDate) && <AlertCircle className="w-4 h-4 mr-1" />}
                                                        <Clock className="w-4 h-4 mr-1" />
                                                        {formatDate(u.expirationDate)}
                                                        {isExpired(u.expirationDate) && ' (Expired)'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <Calendar className="w-4 h-4 mr-1" />
                                                        {formatDate(u.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleEditUser(u)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </motion.div>

                        {/* Pagination */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow"
                        >
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>

            <UserDetailDialog
                user={selectedUser}
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onUpdate={handleUserUpdate}
            />
        </div>
    );
}
