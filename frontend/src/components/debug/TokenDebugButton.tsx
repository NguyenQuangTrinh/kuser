'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';

export default function TokenDebugButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');

    const handleRefreshToken = async () => {
        setLoading(true);
        setResult('');

        try {
            const user = auth.currentUser;

            if (!user) {
                setResult('❌ No user logged in');
                setLoading(false);
                return;
            }

            // Force refresh token
            const token = await user.getIdToken(true);

            console.log('🔄 Token force refreshed');
            console.log('Token (first 50 chars):', token.substring(0, 50));
            console.log('Token length:', token.length);

            setResult(`✅ Token refreshed! Length: ${token.length} chars`);

        } catch (error: any) {
            console.error('Error refreshing token:', error);
            setResult(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckExtension = () => {
        const installed = (window as any).__KUSERNEW_EXTENSION_INSTALLED__;
        console.log('Extension installed:', installed);
        setResult(installed ? '✅ Extension detected' : '❌ Extension not found');
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#1f2937',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            color: 'white',
            fontSize: '14px',
            minWidth: '250px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#fbbf24' }}>
                🛠️ Debug Tools
            </div>

            <button
                onClick={handleRefreshToken}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '8px',
                    fontWeight: '500',
                    opacity: loading ? 0.6 : 1
                }}
            >
                {loading ? 'Refreshing...' : '🔄 Force Token Refresh'}
            </button>

            <button
                onClick={handleCheckExtension}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                }}
            >
                🔍 Check Extension
            </button>

            {result && (
                <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    backgroundColor: '#374151',
                    borderRadius: '4px',
                    fontSize: '12px',
                    wordBreak: 'break-word'
                }}>
                    {result}
                </div>
            )}

            <div style={{
                marginTop: '12px',
                fontSize: '11px',
                color: '#9ca3af',
                borderTop: '1px solid #4b5563',
                paddingTop: '8px'
            }}>
                Check console for detailed logs
            </div>
        </div>
    );
}
