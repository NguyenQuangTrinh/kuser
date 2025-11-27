'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userRole, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && userRole !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [userRole, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (userRole !== 'ADMIN') {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <AdminSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
