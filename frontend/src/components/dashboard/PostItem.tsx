import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import ViewHistoryDialog from './ViewHistoryDialog';

interface Author {
    uid?: string;
    displayName: string;
    photoURL?: string;
}

interface Post {
    _id: string;
    title: string;
    content: string;
    createdAt: string;
    author: Author;
    maxView: number;
    currentView: number;
}

interface PostItemProps {
    post: Post;
}

const PostItem: React.FC<PostItemProps> = ({ post }) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [currentViewCount, setCurrentViewCount] = useState(post.currentView);
    const [isViewHistoryOpen, setIsViewHistoryOpen] = useState(false);
    const [reupCooldown, setReupCooldown] = useState<number>(0);
    const [isReupping, setIsReupping] = useState(false);
    const [remainingReups, setRemainingReups] = useState<number>(2); // Default 2 reups
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleViewUpdate = (data: { postId: string, action: string }) => {
            if (data.postId === post._id) {
                if (data.action === 'increment') {
                    setCurrentViewCount(prev => prev + 1);
                }
                // Handle other actions if needed
            }
        };

        socket.on('post_view_update', handleViewUpdate);

        return () => {
            socket.off('post_view_update', handleViewUpdate);
        };
    }, [socket, post._id]);

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return Math.floor(seconds) + " giây trước";
    };

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string, keywords: string[] = []) => {
        e.preventDefault();

        // Send message to extension to track this tab
        window.postMessage({
            type: 'KUSERNEW_TRACK_TAB',
            postId: post._id,
            link: url,
            keywords: keywords
        }, window.location.origin);

        // Open the link
        window.open(url, '_blank');
    };

    // Custom content parser to intercept links and handle ### format
    const parseContentWithTracking = (content: string) => {
        if (!content) return null;

        // Tách nội dung thành từng dòng để xử lý riêng biệt
        const lines = content.split('\n');

        return lines.map((line, lineIndex) => {
            // Regex tìm pattern: URL + khoảng trắng + ### + nội dung + !!!
            // Sử dụng non-greedy (+?) để đảm bảo bắt đúng cụm
            const formatPattern = /(https?:\/\/[^\s]+?)\s*###\s*(.+?)!!!/;
            const match = line.match(formatPattern);

            // TRƯỜNG HỢP 1: Dòng này đúng định dạng đặc biệt (URL ###...!!!)
            if (match) {
                const url = match[1].trim();
                const keywordsPart = match[2].trim();
                
                // Tách các từ khóa bằng dấu phẩy
                const parts = keywordsPart.split(',').map(p => p.trim()).filter(p => p !== '');

                let domain = '';
                let keywords: string[] = [];

                // Logic kiểm tra Google:
                // 1. Kiểm tra xem URL gốc có phải là Google không
                const isGoogleLink = url.includes('google.com') || url.includes('google.vn');

                if (isGoogleLink) {
                    // Nếu là Google: Kiểm tra phần tử cuối cùng có phải là domain không
                    const lastPart = parts[parts.length - 1];
                    const domainPattern = /^[a-z0-9.-]+\.(com|vn|net|org|io|co|edu|gov|info)$/i;

                    if (parts.length > 0 && domainPattern.test(lastPart)) {
                        domain = lastPart;
                        keywords = parts.slice(0, -1); // Lấy tất cả trừ phần cuối
                    } else {
                        keywords = parts;
                    }
                } else {
                    // Nếu KHÔNG phải Google (ví dụ thuanphatnhuy.com):
                    // Tất cả đều là keyword hết, không tách domain.
                    keywords = parts;
                }

                return (
                    <div key={lineIndex} className="space-y-2 mb-4 border-b border-gray-100 pb-2 last:border-0">
                        {/* Link */}
                        <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-gray-500 min-w-[50px] flex-shrink-0">Link:</span>
                            <a
                                href={url}
                                onClick={(e) => handleLinkClick(e, url, keywords)}
                                className="text-blue-600 hover:underline break-all cursor-pointer font-medium"
                            >
                                {url}
                            </a>
                        </div>

                        {/* Keywords */}
                        {keywords.length > 0 && (
                            <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-gray-500 min-w-[50px] flex-shrink-0">Từ khóa:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {keywords.map((keyword, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-100 text-green-800 text-sm font-medium"
                                        >
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Domain (Chỉ hiển thị nếu là link Google và tách được domain) */}
                        {domain && (
                            <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-gray-500 min-w-[50px] flex-shrink-0">Domain:</span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-sm font-medium">
                                    {domain}
                                </span>
                            </div>
                        )}
                    </div>
                );
            }

            // TRƯỜNG HỢP 2: Dòng bình thường (Fallback logic cũ)
            // Vẫn giữ lại logic cũ để xử lý các dòng text thường hoặc link không có ###
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const parts = line.split(urlRegex);
            
            // Nếu dòng trống thì bỏ qua hoặc render khoảng trắng nhỏ
            if (line.trim() === '') return <div key={lineIndex} className="h-2"></div>;

            return (
                <div key={lineIndex} className="min-h-[1.5em] mb-1">
                    {parts.map((part, partIndex) => {
                        if (part.match(urlRegex)) {
                            // Clean URL (remove ### suffix if present just in case)
                            const cleanUrl = part.replace(/###.*$/, '').replace(/[.,!?)\]]+$/, '');
                            return (
                                <a
                                    key={`${lineIndex}-${partIndex}`}
                                    href={cleanUrl}
                                    onClick={(e) => handleLinkClick(e, cleanUrl)}
                                    className="text-blue-600 hover:underline break-all cursor-pointer"
                                >
                                    {cleanUrl}
                                </a>
                            );
                        }
                        return <span key={`${lineIndex}-${partIndex}`}>{part}</span>;
                    })}
                </div>
            );
        });
    };

    // Handle reup button click
    const handleReup = () => {
        if (!socket || !user) return;
        if (isReupping || reupCooldown > 0 || remainingReups <= 0) return;

        setIsReupping(true);

        // Register ONE-TIME listeners for this specific reup
        const handleReupError = (data: { message: string, cooldownRemaining?: number, remainingReups?: number }) => {
            toast.error(data.message);
            if (data.cooldownRemaining) {
                setReupCooldown(data.cooldownRemaining);
            }
            if (data.remainingReups !== undefined) {
                setRemainingReups(data.remainingReups);
            }
            setIsReupping(false);
            setIsMenuOpen(false);

            // Cleanup listeners
            socket.off('reup_error', handleReupError);
            socket.off('reup_success', handleReupSuccess);
        };

        const handleReupSuccess = (data: { message: string, remainingReups?: number }) => {
            toast.success(data.message || '🔥 Bài viết đã được đẩy lên!');
            if (data.remainingReups !== undefined) {
                setRemainingReups(data.remainingReups);
            }
            setIsReupping(false);
            setIsMenuOpen(false);

            // Cleanup listeners
            socket.off('reup_error', handleReupError);
            socket.off('reup_success', handleReupSuccess);
        };

        // Add listeners
        socket.once('reup_error', handleReupError);
        socket.once('reup_success', handleReupSuccess);

        // Emit reup request
        socket.emit('reup_post', {
            postId: post._id,
            userId: user.uid
        });
    };

    // Format cooldown time
    const formatCooldown = (ms: number): string => {
        const minutes = Math.ceil(ms / 60000);
        return `${minutes}m`;
    };

    // Cooldown timer
    useEffect(() => {
        if (reupCooldown <= 0) return;

        const timer = setInterval(() => {
            setReupCooldown(prev => Math.max(0, prev - 1000));
        }, 1000);

        return () => clearInterval(timer);
    }, [reupCooldown]);

    // Close menu when clicking outside
    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.dropdown-menu-container')) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isMenuOpen]);

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                {/* Header */}
                <div className="p-4 flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        {post.author.photoURL ? (
                            <img
                                className="h-10 w-10 rounded-full"
                                src={post.author.photoURL}
                                alt={post.author.displayName}
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                                {post.author.displayName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                            {post.author.displayName || 'Người dùng ẩn danh'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {timeAgo(post.createdAt)} • Điểm: 0
                        </p>
                    </div>
                    <div className="flex-shrink-0 self-center relative dropdown-menu-container">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                <div className="py-1">
                                    <button
                                        onClick={handleReup}
                                        disabled={isReupping || reupCooldown > 0 || remainingReups <= 0}
                                        className={`w-full text-left px-4 py-2 text-sm flex items-center ${isReupping || reupCooldown > 0 || remainingReups <= 0
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <svg className={`h-4 w-4 mr-2 ${isReupping || reupCooldown > 0 || remainingReups <= 0
                                            ? 'text-gray-300'
                                            : 'text-orange-500'
                                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                        <span>
                                            {isReupping
                                                ? 'Đang reup...'
                                                : reupCooldown > 0
                                                    ? `Reup (${formatCooldown(reupCooldown)})`
                                                    : `Reup (${remainingReups} lượt)`
                                            }
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-2">
                    {post.title && <h3 className="text-lg font-semibold mb-2">{post.title}</h3>}
                    <div className="text-base text-gray-800 whitespace-pre-wrap">
                        {parseContentWithTracking(post.content)}
                    </div>
                </div>

                {/* Footer / Stats */}
                <div className="px-4 py-2">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <div className="flex items-center space-x-4">
                        </div>
                        <div className="flex space-x-2">
                            <span className="hover:underline cursor-pointer">0 Bình luận</span>
                            <span className="hover:underline cursor-pointer">0 Chia sẻ</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-1 flex items-center justify-between">
                        <button
                            onClick={() => setIsViewHistoryOpen(true)}
                            className="flex-1 flex items-center justify-center py-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors group"
                        >
                            <svg className="h-5 w-5 mr-1 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="font-medium group-hover:text-indigo-500">{currentViewCount || 0} / {post.maxView || 50}</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center py-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors group">
                            <svg className="h-5 w-5 mr-2 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            <span className="font-medium group-hover:text-indigo-500">Thích</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center py-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors group">
                            <svg className="h-5 w-5 mr-2 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <span className="font-medium group-hover:text-indigo-500">Bình luận</span>
                        </button>
                        <button className="flex-1 flex items-center justify-center py-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors group">
                            <svg className="h-5 w-5 mr-2 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span className="font-medium group-hover:text-indigo-500">Chia sẻ</span>
                        </button>
                    </div>
                </div>

                {/* Comment Input Placeholder */}
                <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0"></div>
                    <input
                        type="text"
                        placeholder="Write a comment..."
                        className="flex-1 bg-gray-100 border-none rounded-full py-2 px-4 text-sm focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                </div>
            </div>

            <ViewHistoryDialog
                isOpen={isViewHistoryOpen}
                onClose={() => setIsViewHistoryOpen(false)}
                postId={post._id}
            />
        </>
    );
};

export default PostItem;
