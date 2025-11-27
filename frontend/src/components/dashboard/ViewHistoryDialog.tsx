import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPostViewsAction } from '@/actions/post';
import { X, ExternalLink, MousePointer2, Clock, Award, User } from 'lucide-react';

interface ViewHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
}

interface PostView {
    _id: string;
    user: {
        displayName: string;
        photoURL?: string;
    };
    link: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    createdAt: string;
    pointsAwarded?: number;
    clickHistories?: Array<{
        _id: string;
        childUrl: string;
        keyword: string;
        createdAt: string;
        duration?: number;
        pointsAwarded?: number;
    }>;
}

interface LinkStat {
    _id: string; // The link URL
    count: number;
}

const ViewHistoryDialog: React.FC<ViewHistoryDialogProps> = ({ isOpen, onClose, postId }) => {
    const { user } = useAuth();
    const [views, setViews] = useState<PostView[]>([]);
    const [linkStats, setLinkStats] = useState<LinkStat[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [skip, setSkip] = useState(0);
    const LIMIT = 10;

    useEffect(() => {
        if (isOpen && postId) {
            setViews([]);
            setLinkStats([]);
            setSkip(0);
            setHasMore(true);
            fetchViews(0);
        }
    }, [isOpen, postId]);

    const fetchViews = async (currentSkip: number) => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const result = await getPostViewsAction(token, postId, currentSkip, LIMIT);
            if (result.success) {
                if (currentSkip === 0) {
                    setViews(result.views);
                    if (result.linkStats) {
                        setLinkStats(result.linkStats);
                    }
                } else {
                    setViews(prev => [...prev, ...result.views]);
                }

                if (result.views.length < LIMIT) {
                    setHasMore(false);
                }
            } else {
                console.error('Failed to fetch views:', result.error);
            }
        } catch (error) {
            console.error('Error fetching views:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextSkip = skip + LIMIT;
        setSkip(nextSkip);
        fetchViews(nextSkip);
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return 'Đang xem...';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        if (minutes > 0) {
            return `${minutes}p ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 backdrop-blur-sm p-4 md:p-0">
            <div className="relative w-full max-w-5xl max-h-[90vh] rounded-xl bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-white rounded-t-xl sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            Chi tiết lượt xem
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Theo dõi hoạt động xem và click của người dùng</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                        <X className="w-5 h-5" />
                        <span className="sr-only">Close modal</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
                    {/* Link Stats Section */}
                    {linkStats.length > 0 && (
                        <div className="mb-8">
                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Thống kê theo Link
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {linkStats.map((stat) => (
                                    <div key={stat._id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                                        <a
                                            href={stat._id}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-600 hover:text-indigo-600 truncate max-w-[70%] text-sm font-medium flex items-center gap-2"
                                            title={stat._id}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </div>
                                            <span className="truncate">{stat._id}</span>
                                        </a>
                                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                                            {stat.count} lượt
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Danh sách chi tiết
                    </h4>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 font-semibold">Người xem</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Link Layer 1</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Thời gian</th>
                                        <th scope="col" className="px-6 py-4 font-semibold">Thời lượng</th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Điểm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {views.map((view) => (
                                        <React.Fragment key={view._id}>
                                            <tr className="bg-white hover:bg-gray-50/80 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center space-x-3">
                                                        {view.user?.photoURL ? (
                                                            <img className="h-9 w-9 rounded-full object-cover border border-gray-200" src={view.user.photoURL} alt={view.user.displayName} />
                                                        ) : (
                                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                                {view.user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-gray-900">{view.user?.displayName || 'Ẩn danh'}</div>
                                                            <div className="text-xs text-gray-500">View ID: {view._id.slice(-6)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <a href={view.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors group-hover:text-indigo-600" title={view.link}>
                                                        <span className="truncate font-medium">{view.link}</span>
                                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col text-xs">
                                                        <span className="text-gray-900 font-medium">{new Date(view.startTime).toLocaleTimeString('vi-VN')}</span>
                                                        <span className="text-gray-500">{new Date(view.startTime).toLocaleDateString('vi-VN')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${view.duration ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {formatDuration(view.duration)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-green-600 flex items-center justify-end gap-1">
                                                        +{view.pointsAwarded || 0}
                                                        <Award className="w-3 h-3" />
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Layer 2 Clicks (Nested) */}
                                            {view.clickHistories && view.clickHistories.length > 0 && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan={5} className="px-6 py-4">
                                                        <div className="ml-12 relative">
                                                            {/* Connector Line */}
                                                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-gray-200 border-l border-dashed border-gray-300"></div>
                                                            <div className="absolute -left-6 top-4 w-4 h-px bg-gray-300 border-t border-dashed"></div>

                                                            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
                                                                <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                                                                    <MousePointer2 className="w-3.5 h-3.5 text-indigo-500" />
                                                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                                        Hoạt động Click Tầng 2 ({view.clickHistories.length})
                                                                    </span>
                                                                </div>
                                                                <table className="w-full text-sm text-left">
                                                                    <thead className="text-xs text-gray-500 bg-white border-b border-gray-50">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium w-1/4">Từ khóa</th>
                                                                            <th className="px-4 py-2 font-medium w-1/3">Link đích</th>
                                                                            <th className="px-4 py-2 font-medium">Thời điểm</th>
                                                                            <th className="px-4 py-2 font-medium">Thời lượng</th>
                                                                            <th className="px-4 py-2 font-medium text-right">Điểm</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-50">
                                                                        {view.clickHistories.map(click => (
                                                                            <tr key={click._id} className="hover:bg-gray-50 transition-colors">
                                                                                <td className="px-4 py-2.5">
                                                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                                                        {click.keyword}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2.5">
                                                                                    <a href={click.childUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-600 hover:text-blue-600 max-w-[250px] truncate group transition-colors">
                                                                                        <span className="truncate text-xs">{click.childUrl}</span>
                                                                                        <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                    </a>
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-xs text-gray-500">
                                                                                    {new Date(click.createdAt).toLocaleTimeString('vi-VN')}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-xs text-gray-500">
                                                                                    {formatDuration(click.duration)}
                                                                                </td>
                                                                                <td className="px-4 py-2.5 text-right font-semibold text-green-600 text-xs">
                                                                                    +{click.pointsAwarded || 0}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {views.length === 0 && !loading && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Chưa có dữ liệu</h3>
                                <p className="text-gray-500 mt-1">Chưa có lượt xem nào được ghi nhận cho bài viết này.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        )}

                        {!loading && hasMore && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={handleLoadMore}
                                    className="w-full rounded-lg bg-white border border-gray-300 px-5 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                                >
                                    Tải thêm lịch sử
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewHistoryDialog;
