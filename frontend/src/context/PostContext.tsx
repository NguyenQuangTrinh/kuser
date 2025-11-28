'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getPostsAction, getFeedPostsAction, getInfiniteFeedPostsAction } from '@/actions/post';

export interface Post {
    _id: string;
    author: {
        _id: string;
        uid: string;
        displayName: string;
        email: string;
    };
    title: string;
    description: string;
    content: string;
    links: Array<{
        url: string;
        description: string;
        _id: string;
    }>;
    currentView: number;
    maxView: number;
    createdAt: string;
    updatedAt: string;
}

interface PostContextType {
    posts: Post[];
    feedPosts: Post[];
    loading: boolean;
    feedLoading: boolean;
    error: string | null;
    fetchPosts: () => Promise<void>;
    fetchFeedPosts: (append?: boolean) => Promise<void>;
    addPost: (post: Post) => void;
    updatePost: (postId: string, updatedPost: Partial<Post>) => void;
    deletePost: (postId: string) => void;
    refreshPosts: () => Promise<void>;
    refreshFeedPosts: () => Promise<void>;
    setFeedPosts: React.Dispatch<React.SetStateAction<Post[]>>;
    feedOffset: number;
    hasMorePosts: boolean;
    fetchMorePosts: () => Promise<void>;
    fetchInfinitePosts: () => Promise<void>;
}

const PostContext = createContext<PostContextType>({
    posts: [],
    feedPosts: [],
    loading: false,
    feedLoading: false,
    error: null,
    fetchPosts: async () => { },
    fetchFeedPosts: async () => { },
    addPost: () => { },
    updatePost: () => { },
    deletePost: () => { },
    refreshPosts: async () => { },
    refreshFeedPosts: async () => { },
    setFeedPosts: () => { },
    feedOffset: 0,
    hasMorePosts: true,
    fetchMorePosts: async () => { },
    fetchInfinitePosts: async () => { },
});

export const usePost = () => useContext(PostContext);

export const PostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [feedPosts, setFeedPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedLoading, setFeedLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedOffset, setFeedOffset] = useState(0);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const { user } = useAuth();
    const { socket, onNewPost } = useSocket();

    const fetchPosts = useCallback(async () => {
        if (!user) {
            setPosts([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = await user.getIdToken();
            const result = await getPostsAction(token);

            if (result.success && result.posts) {
                setPosts(result.posts);
            } else {
                setError(result.error || 'Failed to fetch posts');
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
            setError(err instanceof Error ? err.message : 'Error fetching posts');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchFeedPosts = useCallback(async (append: boolean = false) => {
        if (!user) {
            setFeedPosts([]);
            return;
        }

        setFeedLoading(true);
        setError(null);

        try {
            const token = await user.getIdToken();
            const skip = append ? feedOffset : 0;
            const result = await getFeedPostsAction(token, skip, 10);

            if (result.success && result.posts) {
                if (append) {
                    // Append to existing posts, filtering duplicates
                    setFeedPosts(prev => {
                        const newPosts = result.posts.filter(
                            (newPost: Post) => !prev.some(p => p._id === newPost._id)
                        );
                        return [...prev, ...newPosts];
                    });
                } else {
                    // Replace with new posts
                    setFeedPosts(result.posts);
                }

                // Update offset
                const newOffset = append ? feedOffset + result.posts.length : result.posts.length;
                setFeedOffset(newOffset);

                // Save offset to localStorage
                localStorage.setItem('feedOffset', newOffset.toString());

                // Check if more posts available
                if (result.posts.length < 10) {
                    setHasMorePosts(false);
                }
            } else {
                setError(result.error || 'Failed to fetch feed posts');
            }
        } catch (err) {
            console.error('Error fetching feed posts:', err);
            setError(err instanceof Error ? err.message : 'Error fetching feed posts');
        } finally {
            setFeedLoading(false);
        }
    }, [user, feedOffset]); // Added feedOffset dependency

    // Fetch more posts (append mode)
    const fetchMorePosts = useCallback(async () => {
        if (!hasMorePosts || feedLoading) {
            console.log('Cannot fetch more:', { hasMorePosts, feedLoading });
            return;
        }
        await fetchFeedPosts(true); // append = true
    }, [hasMorePosts, feedLoading, fetchFeedPosts]);

    // Fetch infinite posts (for auto-opener)
    const fetchInfinitePosts = useCallback(async () => {
        if (!user || feedLoading) return;

        setFeedLoading(true);
        try {
            const token = await user.getIdToken();
            const result = await getInfiniteFeedPostsAction(token, 10);

            if (result.success && result.posts && result.posts.length > 0) {
                // Append to existing posts, filtering duplicates
                setFeedPosts(prev => {
                    const newPosts = result.posts.filter(
                        (newPost: Post) => !prev.some(p => p._id === newPost._id)
                    );

                    // If all fetched posts are duplicates, we might want to force add them 
                    // if the queue is empty, but for now let's stick to unique in feed.
                    // Wait, the user wants duplicates if needed for auto-open.
                    // But PostContext feed is displayed to user. 
                    // If we add duplicates to feedPosts, React keys might clash if we use _id.
                    // We should probably rely on AutoLinkOpener to handle the "work" queue, 
                    // and maybe not clutter the UI feed with duplicates?
                    // The user said: "cứ lấy thêm trung lặp post cũng được".

                    // If we add duplicates to feedPosts, we MUST ensure unique keys in rendering.
                    // However, AutoLinkButton reads from feedPosts.

                    // Let's add them to feedPosts but maybe we need to be careful about keys in UI.
                    // For now, let's filter duplicates in FEED to avoid UI key errors,
                    // BUT if we filter them out, AutoLinkButton won't see "new" posts to add to queue.

                    // CRITICAL: AutoLinkButton listens to feedPosts changes.
                    // If we don't add them to feedPosts, AutoLinkButton won't trigger.
                    // If we add them, we risk key collisions.

                    // Compromise: Add them, but maybe AutoLinkButton should consume them and REMOVE them?
                    // AutoLinkButton already removes posts when done.

                    // Actually, if we use the "infinite" endpoint, we are likely in a state where 
                    // we've exhausted normal posts.

                    // Let's allow duplicates in feedPosts but we need to handle UI keys in PostList.
                    // OR, we just append them. The backend returns "random" posts.
                    // If the ID is the same, React key error.

                    // Let's filter duplicates for now to be safe for UI.
                    // Wait, if I filter duplicates, and I have 12 posts total, and I have 10 in feed.
                    // I fetch 10 random. 8 are already in feed. I add 2.
                    // Feed has 12.
                    // Next fetch, I fetch 10 random. All 10 are in feed. I add 0.
                    // AutoLinkButton sees 0 new posts.

                    // The user wants the auto-opener to keep running.
                    // If AutoLinkButton removes posts as it processes them, then the feed shrinks.
                    // So duplicates aren't an issue if they are removed!
                    // AutoLinkButton removes posts: `setFeedPosts(prev => prev.filter(p => p._id !== postId))`

                    // So, if AutoLinkButton is running, it consumes posts.
                    // So we CAN add duplicates because the old ones are likely gone or being removed.
                    // BUT, if they are NOT removed yet (e.g. queue is full but slow), we might have duplicates.

                    // Let's allow duplicates but maybe check if the EXACT SAME post object is there?
                    // No, IDs are what matters.

                    // Let's trust that AutoLinkButton removes them.
                    // But to be safe, let's only add if not currently in feed.
                    // If the feed is empty (because AutoLinkButton ate everything), then we add.
                    // This works perfectly.

                    return [...prev, ...newPosts];
                });
            }
        } catch (err) {
            console.error('Error fetching infinite posts:', err);
        } finally {
            setFeedLoading(false);
        }
    }, [user, feedLoading]);

    // Auto-fetch feed posts when user changes (initial load only)
    useEffect(() => {
        if (user) {
            fetchFeedPosts(false); // Initial load, don't append
        } else {
            setFeedPosts([]);
            setFeedOffset(0);
            setHasMorePosts(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); // Only run when user changes

    // Listen for real-time new posts
    useEffect(() => {
        if (!socket) return;

        const handleNewPost = (post: Post) => {
            console.log('Received new post via socket:', post);

            // Check if post already exists in feed
            setFeedPosts(prevPosts => {
                const exists = prevPosts.some(p => p._id === post._id);
                if (exists) {
                    // Post exists - this is a reup, move it to top
                    console.log('Post already in feed, moving to top (reup)');
                    return [post, ...prevPosts.filter(p => p._id !== post._id)];
                }

                // New post - add to beginning of feed
                console.log('Adding new post to feed');

                // Show toast notification
                // const authorName = typeof post.author === 'object'
                //     ? post.author.displayName
                //     : 'Unknown';
                // toast.success(
                //     `📝 Bài viết mới từ ${authorName}`,
                //     {
                //         duration: 3000,
                //         icon: '🆕',
                //     }
                // );

                return [post, ...prevPosts];
            });
        };

        onNewPost(handleNewPost);

        // Cleanup
        return () => {
            if (socket) {
                socket.off('new_post', handleNewPost);
            }
        };
    }, [socket, onNewPost]);

    const addPost = useCallback((post: Post) => {
        setPosts(prev => [post, ...prev]);
    }, []);

    const updatePost = useCallback((postId: string, updatedPost: Partial<Post>) => {
        setPosts(prev =>
            prev.map(post =>
                post._id === postId ? { ...post, ...updatedPost } : post
            )
        );
    }, []);

    const deletePost = useCallback((postId: string) => {
        setPosts(prev => prev.filter(post => post._id !== postId));
    }, []);

    const refreshPosts = useCallback(async () => {
        await fetchPosts();
    }, [fetchPosts]);

    const refreshFeedPosts = useCallback(async () => {
        await fetchFeedPosts();
    }, [fetchFeedPosts]);

    return (
        <PostContext.Provider
            value={{
                posts,
                feedPosts,
                loading,
                feedLoading,
                error,
                fetchPosts,
                fetchFeedPosts,
                addPost,
                updatePost,
                deletePost,
                refreshPosts,
                refreshFeedPosts,
                setFeedPosts,
                feedOffset,
                hasMorePosts,
                fetchMorePosts,
                fetchInfinitePosts,
            }}
        >
            {children}
        </PostContext.Provider>
    );
};
