import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { PostProvider } from '@/context/PostContext';
import TokenDebugButton from '@/components/debug/TokenDebugButton';
import ExtensionUpdateBanner from '@/components/ExtensionUpdateBanner';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PostProvider>
            <div className="flex h-screen bg-gray-100">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <ExtensionUpdateBanner />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                        {children}
                    </main>
                </div>
                {/* Debug button - only shows in development */}
                {process.env.NODE_ENV === 'development' && <TokenDebugButton />}
            </div>
        </PostProvider>
    );
}
