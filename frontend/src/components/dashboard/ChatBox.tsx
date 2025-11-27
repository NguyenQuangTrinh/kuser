'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    _id: string;
    user: {
        uid: string;
        displayName: string;
        photoURL?: string;
    };
    content: string;
    createdAt: string;
}

interface ChatBoxProps {
    isExpanded: boolean;
    setIsExpanded: (value: boolean) => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ isExpanded, setIsExpanded }) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load messages on mount
    useEffect(() => {
        if (!socket) return;

        // Request messages
        socket.emit('get_messages', { limit: 50 });

        // Listen for loaded messages
        const handleMessagesLoaded = (loadedMessages: Message[]) => {
            console.log('Messages loaded:', loadedMessages.length);
            setMessages(loadedMessages);
        };

        // Listen for new messages
        const handleNewMessage = (message: Message) => {
            console.log('New message received:', message);
            console.log('Chat isExpanded:', isExpanded); // Debug log
            setMessages(prev => [...prev, message]);

            // Increment unread count if chat is collapsed
            if (!isExpanded) {
                console.log('Incrementing unread count'); // Debug logsocial
                setUnreadCount(prev => prev + 1);
            }
        };

        // Listen for errors
        const handleMessageError = (data: { message: string }) => {
            toast.error(data.message);
            setIsSending(false);
        };

        socket.on('messages_loaded', handleMessagesLoaded);
        socket.on('new_message', handleNewMessage);
        socket.on('message_error', handleMessageError);

        return () => {
            socket.off('messages_loaded', handleMessagesLoaded);
            socket.off('new_message', handleNewMessage);
            socket.off('message_error', handleMessageError);
        };
    }, [socket, isExpanded]); // Added isExpanded to dependency array

    // Auto-scroll to bottom
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isExpanded]);

    // Focus input when expanded and reset unread count
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
            setUnreadCount(0); // Reset unread count when opening chat
        }
    }, [isExpanded]);

    const handleSend = () => {
        if (!socket || !user || !newMessage.trim() || isSending) return;

        if (newMessage.length > 500) {
            toast.error('Message too long (max 500 characters)');
            return;
        }

        setIsSending(true);
        const messageContent = newMessage.trim();
        setNewMessage(''); // Clear input immediately for better UX

        socket.emit('send_message', {
            userId: user.uid,
            content: messageContent,
        });

        // Reset isSending after a short delay (server should respond quickly)
        // This will be overridden by message_error handler if there's an error
        setTimeout(() => {
            setIsSending(false);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'vừa xong';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div className="flex flex-col bg-gray-800 border-t border-gray-700">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="text-sm font-semibold text-white">Community Chat</span>
                    {!isExpanded && unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {/* Messages */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 384, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col overflow-hidden"
                    >
                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-500 text-sm py-8">
                                    Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isOwnMessage = user?.uid === msg.user.uid;
                                    return (
                                        <div
                                            key={msg._id}
                                            className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''
                                                }`}
                                        >
                                            {/* Avatar */}
                                            <div className="flex-shrink-0">
                                                {msg.user.photoURL ? (
                                                    <img
                                                        src={msg.user.photoURL}
                                                        alt={msg.user.displayName}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                                        {msg.user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Message Content */}
                                            <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {!isOwnMessage && (
                                                        <span className="text-xs font-semibold text-gray-300">
                                                            {msg.user.displayName}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-500">
                                                        {timeAgo(msg.createdAt)}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`inline-block px-3 py-2 rounded-lg text-sm ${isOwnMessage
                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                                        : 'bg-gray-700 text-gray-200'
                                                        }`}
                                                >
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Box */}
                        <div className="border-t border-gray-700 p-3">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập tin nhắn..."
                                    disabled={isSending}
                                    className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    maxLength={500}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || isSending}
                                    className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                                {newMessage.length}/500
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatBox;
