'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, onIdTokenChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    mongoUser: any | null; // Full user profile from MongoDB
    userRole: 'ADMIN' | 'MANAGER' | 'USER' | null;
    expirationDate: Date | null;
    isExpired: boolean;
    loading: boolean;
    refreshUserProfile: () => Promise<void>;
    updatePoints: (pointsDelta: number, totalPoints?: number) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    mongoUser: null,
    userRole: null,
    expirationDate: null,
    isExpired: false,
    loading: true,
    refreshUserProfile: async () => { },
    updatePoints: () => { },
    logout: async () => { },

});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | null>(null);
    const [mongoUser, setMongoUser] = useState<any | null>(null); // Added mongoUser state
    const [expirationDate, setExpirationDate] = useState<Date | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUserProfile = async (uid: string, token: string) => {
        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${BACKEND_URL}/api/auth/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ uid, token })
            });

            if (response.ok) {
                const userData = await response.json();
                setMongoUser(userData);
                setUserRole(userData.role);

                // Re-added expiration logic based on existing code
                if (userData.expirationDate) {
                    const expDate = new Date(userData.expirationDate);
                    setExpirationDate(expDate);
                    setIsExpired(expDate < new Date());
                } else {
                    setExpirationDate(null);
                    setIsExpired(false);
                }
            } else {
                // Handle cases where sync fails but user is authenticated
                setUserRole('USER'); // Default to USER
                setExpirationDate(null);
                setIsExpired(false);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserRole('USER'); // Default to USER on error
            setExpirationDate(null);
            setIsExpired(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                try {
                    const token = await user.getIdToken();
                    await fetchUserProfile(user.uid, token);
                } catch (error) {
                    console.error('Error syncing user:', error);
                    setUserRole('USER'); // Default to USER on error
                    setExpirationDate(null);
                    setIsExpired(false);
                }
            } else {
                setUserRole(null);
                setMongoUser(null); // Added
                setExpirationDate(null);
                setIsExpired(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Listen for Firebase token changes and notify extension
    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (user: User | null) => {
            if (user) {
                try {
                    // Dispatch event to notify extension of token refresh
                    window.dispatchEvent(new CustomEvent('kusernew_token_refreshed'));
                    console.log('✅ Token refreshed, notifying extension');
                } catch (error) {
                    console.error('Error notifying extension:', error);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const refreshUserProfile = async () => { // Added refreshUserProfile
        if (user) {
            const token = await user.getIdToken();
            await fetchUserProfile(user.uid, token);
        }
    };

    const updatePoints = (pointsDelta: number, totalPoints?: number) => {
        if (mongoUser) {
            console.log('Updating', pointsDelta);
            console.log('Current points:', mongoUser.points);
            console.log('Total points from server:', totalPoints);

            setMongoUser({
                ...mongoUser,
                // Use totalPoints if provided (from server), otherwise calculate
                points: totalPoints !== undefined ? totalPoints : (mongoUser.points || 0) + pointsDelta
            });
        }
    };

    const logout = async () => {
        try {
            await auth.signOut();
            setUser(null); // Explicitly set user to null
            setUserRole(null);
            setMongoUser(null); // Added
            setExpirationDate(null);
            setIsExpired(false);
            router.push('/login');
        } catch (error) {
            console.error('Logout Error:', error);
        }
    };

    useEffect(() => {
        const publicRoutes = ['/', '/login', '/signup', '/pricing'];

        if (!loading) {
            // Redirect expired non-admin users to pricing
            if (user && isExpired && userRole !== 'ADMIN' && pathname !== '/pricing') {
                router.push('/pricing');
                return;
            }

            if (!user && !publicRoutes.includes(pathname)) {
                router.push('/login');
            }
            // Optional: Redirect logged-in users away from login/signup pages
            if (user && (pathname === '/login' || pathname === '/signup')) {
                router.push('/dashboard');
            }
        }
    }, [user, loading, pathname, router, isExpired, userRole]);

    return (
        <AuthContext.Provider value={{ user, mongoUser, userRole, expirationDate, isExpired, loading, refreshUserProfile, updatePoints, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
