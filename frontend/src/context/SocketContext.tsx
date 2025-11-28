'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

import { API_CONFIG } from '../config/api';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    userWave: number | null;
    onNewPost: (callback: (post: any) => void) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    userWave: null,
    onNewPost: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userWave, setUserWave] = useState<number | null>(null);
    const { user, updatePoints } = useAuth();

    useEffect(() => {
        // Connect to the same origin (relative path)
        // The path option tells socket.io where to look for the socket endpoint
        const socketInstance = io(API_CONFIG.SOCKET_URL || 'localhost:8000', {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });

        console.log('Socket connected:', socketInstance.id);
        setIsConnected(true);

        // Join user-specific room
        if (user) {
            console.log('[DEBUG] Frontend emitting join_user_room for:', user.uid);
            socketInstance.emit('join_user_room', user.uid);
        } else {
            console.log('[DEBUG] User not found in SocketContext, cannot join room');
        }

        socketInstance.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        // Listen for points awarded events
        socketInstance.on('points_awarded', (data: { userId: string; points: number; totalPoints?: number; duration: number }) => {
            // Only show notification if it's for the current user
            if (user && user.uid === data.userId) {
                // toast.success(
                //     `🎉 Bạn nhận được ${data.points} điểm! (Xem ${Math.round(data.duration)}s)`,
                //     {
                //         duration: 4000,
                //         icon: '⭐',
                //     }
                // );
                updatePoints(data.points, data.totalPoints);
            }
        });

        // Listen for points deducted events
        socketInstance.on('points_deducted', (data: { userId: string; points: number; totalPoints?: number }) => {
            // Only show notification if it's for the current user
            if (user && user.uid === data.userId) {
                // toast.error(
                //     `📉 Bài post của bạn bị trừ ${data.points} điểm`,
                //     {
                //         duration: 4000,
                //         icon: '⚠️',
                //     }
                // );
                updatePoints(-data.points, data.totalPoints);
            }
        });

        // Listen for wave assignment
        socketInstance.on('wave_assignment', (data: { wave: number }) => {
            console.log('Assigned to wave:', data.wave);
            setUserWave(data.wave);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [user]);

    // Function to register callback for new_post events
    const onNewPost = (callback: (post: any) => void) => {
        if (socket) {
            socket.on('new_post', callback);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, userWave, onNewPost }}>
            {children}
        </SocketContext.Provider>
    );
};
