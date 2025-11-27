import { Server, Socket } from 'socket.io';
import PostView from '../models/PostView';
import Post from '../models/Post';
import User from '../models/User';
import Message from '../models/Message';
import distributionManager from '../utils/distributionManager';

let ioInstance: Server | null = null;

export const getIO = () => {
    return ioInstance;
};

export const setupSocket = (io: Server) => {
    ioInstance = io;
    io.on('connection', (socket: Socket) => {
        console.log('New client connected:', socket.id);

        // Track connection for distribution (will be assigned wave when joining user room)

        // Join user room for private notifications
        socket.on('join_user_room', (userId) => {
            console.log(`[DEBUG] Socket ${socket.id} requesting to join room user_${userId}`);
            socket.join(`user_${userId}`);

            // Track user and assign to wave
            const wave = distributionManager.trackUserConnection(userId, socket.id);

            // Send wave assignment to client
            socket.emit('wave_assignment', { wave });

            console.log(`[DEBUG] Socket ${socket.id} joined room user_${userId}, assigned to wave ${wave}`);
            // Verify rooms
            console.log(`[DEBUG] Socket ${socket.id} rooms:`, socket.rooms);
        });

        socket.on('view_start', async (data) => {
            const { userId, postId, link } = data;
            console.log('View Start:', data);

            try {
                // Find user by UID to get the ObjectId
                // Assuming 'User' model has a 'uid' field which matches Firebase UID
                const user = await User.findOne({ uid: userId });

                if (!user) {
                    console.error('User not found for view_start:', userId);
                    return;
                }

                // Create a new view record
                const newView = await PostView.create({
                    user: user._id, // Changed to use user._id
                    post: postId,
                    link: link,
                    startTime: new Date(),
                });

                // Update current view count in Post
                await Post.findByIdAndUpdate(postId, { $inc: { currentView: 1 } });

                // Broadcast the new view count (optional, or just notify that someone is viewing)
                // For simplicity, let's just emit the viewId back to the client so they can end it later
                socket.emit('view_started', { viewId: newView._id });

                // Broadcast update to all clients to update UI
                io.emit('post_view_update', { postId, action: 'increment' });

            } catch (error) {
                console.error('Error handling view_start:', error);
            }
        });

        socket.on('view_end', async (data) => {
            const { viewId, postId } = data;
            console.log('View End:', data);

            try {
                const view = await PostView.findById(viewId).populate('user');
                if (view) {
                    view.endTime = new Date();
                    view.duration = (view.endTime.getTime() - view.startTime.getTime()) / 1000;

                    // Calculate points based on duration
                    const { calculatePointsFromDuration } = await import('../utils/pointsCalculator');
                    const pointsEarned = calculatePointsFromDuration(view.duration);
                    view.pointsAwarded = pointsEarned;

                    await view.save();

                    // Award points to the viewer (user who clicked the link)
                    if (pointsEarned > 0) {
                        // Get post to find the author
                        const post = await Post.findById(postId).populate('author');

                        if (post) {
                            // Add points to viewer
                            await User.findByIdAndUpdate(
                                view.user,
                                { $inc: { points: pointsEarned } }
                            );

                            // Deduct points from post author
                            await User.findByIdAndUpdate(
                                post.author,
                                { $inc: { points: -pointsEarned } }
                            );

                            // Emit points awarded event to the viewer
                            const viewerRoom = `user_${(view.user as any).uid || view.user}`;
                            console.log(`[DEBUG] Emitting points_awarded to room ${viewerRoom}`);
                            io.to(viewerRoom).emit('points_awarded', {
                                userId: (view.user as any).uid || view.user,
                                points: pointsEarned,
                                duration: view.duration,
                                postId: postId,
                            });

                            // Emit points deducted event to the post author
                            io.to(`user_${(post.author as any).uid || post.author}`).emit('points_deducted', {
                                userId: (post.author as any).uid || post.author,
                                points: pointsEarned,
                                postId: postId,
                            });

                            console.log(`Awarded ${pointsEarned} points to viewer and deducted from post author for ${view.duration}s view`);
                        }
                    }

                    // Update current view count (decrement? or just keep track of active?)
                    // If 'currentView' means "currently active viewers", we decrement.
                    // If it means "total views", we don't decrement. 
                    // Based on user request "realtime... update for everyone", usually implies active or total.
                    // Let's assume 'currentView' is TOTAL views for now based on typical "view count" logic, 
                    // BUT user said "currentView" in the previous task. 
                    // If it's "Active Viewers", we should decrement. 
                    // Let's assume it's "Active Viewers" for this realtime feature context, or maybe just "Total Views" increasing.
                    // Actually, usually "currentView" in this context might mean "Active". 
                    // However, standard "Views" usually just go up.
                    // Let's stick to "Total Views" increasing for now as that's safer for "maxView" limits.
                    // Wait, if there is a "maxView", then "currentView" probably means "Total accumulated views".
                    // So we DO NOT decrement on view_end.

                    io.emit('post_view_update', { postId, action: 'update' });
                }
            } catch (error) {
                console.error('Error handling view_end:', error);
            }
        });

        // Handle post reup (bump to top of feed)
        socket.on('reup_post', async (data: { postId: string, userId: string }) => {
            const { postId, userId } = data;
            console.log('Reup Post Request:', { postId, userId });

            try {
                // Find user by UID
                const user = await User.findOne({ uid: userId });
                if (!user) {
                    socket.emit('reup_error', { message: 'User not found' });
                    return;
                }

                // Find post
                const post = await Post.findById(postId).populate('author');
                if (!post) {
                    socket.emit('reup_error', { message: 'Post not found' });
                    return;
                }

                // Validate user is the post owner
                if (post.author._id.toString() !== user._id.toString()) {
                    socket.emit('reup_error', { message: 'Only post owner can reup' });
                    return;
                }

                // USER-BASED RATE LIMITING: 2 reups per 5 minutes
                const REUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
                const MAX_REUPS_PER_WINDOW = 2;

                const now = new Date();

                // Initialize quota if not exists or windowStart is null
                if (!user.reupQuota || !user.reupQuota.windowStart) {
                    user.reupQuota = {
                        windowStart: now,
                        count: 0
                    };
                }

                // Check if window has expired
                const windowElapsed = now.getTime() - new Date(user.reupQuota.windowStart).getTime();
                if (windowElapsed >= REUP_WINDOW_MS) {
                    // Reset window
                    user.reupQuota.windowStart = now;
                    user.reupQuota.count = 0;
                }

                // Check if user has quota remaining
                if (user.reupQuota.count >= MAX_REUPS_PER_WINDOW) {
                    const timeUntilReset = REUP_WINDOW_MS - windowElapsed;
                    const minutesRemaining = Math.ceil(timeUntilReset / 60000);
                    socket.emit('reup_error', {
                        message: `Bạn đã hết lượt reup. Vui lòng đợi ${minutesRemaining} phút`,
                        cooldownRemaining: timeUntilReset,
                        remainingReups: 0
                    });
                    return;
                }

                // Increment reup count
                user.reupQuota.count += 1;
                await user.save();

                // Update post reup info (for analytics)
                post.lastReupAt = now;
                post.reupCount = (post.reupCount || 0) + 1;
                await post.save();

                // Populate full author details for distribution
                const populatedPost = await Post.findById(post._id)
                    .populate('author', 'uid displayName email photoURL');

                if (!populatedPost) {
                    socket.emit('reup_error', { message: 'Failed to load post details' });
                    return;
                }

                // Trigger wave-based distribution (same as new post)
                distributionManager.distributePost(populatedPost.toObject(), io);

                // Notify ONLY the user who reupped (not broadcast to all)
                const remainingReups = MAX_REUPS_PER_WINDOW - user.reupQuota.count;
                socket.emit('reup_success', {
                    postId: post._id,
                    message: `Đã reup! Còn lại ${remainingReups} lượt`,
                    remainingReups: remainingReups
                });

                console.log(`Post ${post._id} reupped by user ${userId}, user quota: ${user.reupQuota.count}/${MAX_REUPS_PER_WINDOW}`);
            } catch (error) {
                console.error('Error handling reup_post:', error);
                socket.emit('reup_error', { message: 'Failed to reup post' });
            }
        });

        // Handle smart auto-reup request (find lowest-view post and reup)
        socket.on('smart_reup_request', async (data: { userId: string }) => {
            const { userId } = data;
            console.log('Smart Reup Request:', { userId });

            try {
                // Find user
                const user = await User.findOne({ uid: userId });
                if (!user) {
                    socket.emit('smart_reup_error', { message: 'User not found' });
                    return;
                }

                // Get user's reup settings (default to normal mode if not set)
                const reupMode = user.reupSettings?.mode || 'normal';
                const specificPostIds = user.reupSettings?.specificPostIds || [];

                console.log(`Reup mode: ${reupMode}`, specificPostIds.length > 0 ? `with ${specificPostIds.length} specific posts` : '');

                let post;

                // Build query based on mode
                if (reupMode === 'specific') {
                    // SPECIFIC MODE: Only select from user's specified posts
                    if (specificPostIds.length === 0) {
                        socket.emit('smart_reup_error', {
                            message: 'Bạn chưa chọn post nào cho chế độ Specific. Vui lòng cập nhật cài đặt.'
                        });
                        return;
                    }

                    post = await Post.findOne({
                        _id: { $in: specificPostIds },
                        author: user._id,
                        $expr: { $lt: ['$currentView', '$maxView'] },
                        $or: [
                            { autoReupEnabled: true },
                            { autoReupEnabled: { $exists: false } }
                        ]
                    })
                        .sort({ currentView: 1, createdAt: -1 })
                        .limit(1);

                } else if (reupMode === 'one-user') {
                    // ONE-USER MODE: Select random post from user's posts
                    const eligiblePosts = await Post.find({
                        author: user._id,
                        $expr: { $lt: ['$currentView', '$maxView'] },
                        $or: [
                            { autoReupEnabled: true },
                            { autoReupEnabled: { $exists: false } }
                        ]
                    });

                    if (eligiblePosts.length === 0) {
                        socket.emit('smart_reup_error', {
                            message: 'Không có post nào để reup'
                        });
                        return;
                    }

                    // Select random post
                    post = eligiblePosts[Math.floor(Math.random() * eligiblePosts.length)];

                } else {
                    // NORMAL MODE: Find post with lowest views (existing behavior)
                    post = await Post.findOne({
                        author: user._id,
                        $expr: { $lt: ['$currentView', '$maxView'] },
                        $or: [
                            { autoReupEnabled: true },
                            { autoReupEnabled: { $exists: false } }
                        ]
                    })
                        .sort({ currentView: 1, createdAt: -1 })
                        .limit(1);
                }

                if (!post) {
                    socket.emit('smart_reup_error', {
                        message: 'Không có post nào để reup (tất cả đã đạt maxView hoặc bị tắt)'
                    });
                    return;
                }

                console.log('Smart reup selected post:', {
                    id: post._id,
                    title: post.title,
                    currentView: post.currentView,
                    maxView: post.maxView,
                    mode: reupMode
                });

                // Reup the post
                const now = new Date();
                post.createdAt = now;
                post.lastReupAt = now;
                post.reupCount = (post.reupCount || 0) + 1;
                await post.save();

                // Populate author details for distribution
                const populatedPost = await Post.findById(post._id)
                    .populate('author', 'uid displayName email photoURL points');

                if (!populatedPost) {
                    socket.emit('smart_reup_error', { message: 'Failed to load post details' });
                    return;
                }

                // Distribute based on mode
                if (reupMode === 'one-user') {
                    // ONE-USER MODE: Send to only ONE random online user
                    const onlineUsers = distributionManager.getOnlineUsers();
                    const otherUserIds = onlineUsers
                        .map(u => u.userId)
                        .filter(uid => uid !== userId); // Exclude self

                    if (otherUserIds.length === 0) {
                        socket.emit('smart_reup_error', {
                            message: 'Không có user nào đang online để nhận post'
                        });
                        return;
                    }

                    // Select random user
                    const randomUserId = otherUserIds[Math.floor(Math.random() * otherUserIds.length)];

                    // Send only to that user's room
                    io.to(`user_${randomUserId}`).emit('new_post', populatedPost.toObject());

                    console.log(`One-user reup: Sent post ${post._id} to user ${randomUserId}`);

                } else {
                    // NORMAL or SPECIFIC MODE: Distribute to all users
                    distributionManager.distributePost(populatedPost.toObject(), io);
                }

                // Notify success
                socket.emit('smart_reup_success', {
                    postId: post._id,
                    postTitle: post.title,
                    currentView: post.currentView,
                    maxView: post.maxView,
                    mode: reupMode,
                    message: `Auto-reupped (${reupMode}): "${post.title}" (${post.currentView}/${post.maxView} views)`
                });

                console.log(`Smart reup: Post ${post._id} (${post.currentView}/${post.maxView} views) reupped by user ${userId} [${reupMode} mode]`);
            } catch (error) {
                console.error('Error handling smart_reup_request:', error);
                socket.emit('smart_reup_error', { message: 'Failed to auto-reup post' });
            }
        });

        // Handle send message (community chat)
        socket.on('send_message', async (data: { userId: string, content: string }) => {
            const { userId, content } = data;
            console.log('Send Message:', { userId, content: content.substring(0, 50) });

            try {
                // Validate content
                if (!content || content.trim().length === 0) {
                    socket.emit('message_error', { message: 'Message cannot be empty' });
                    return;
                }

                if (content.length > 500) {
                    socket.emit('message_error', { message: 'Message too long (max 500 characters)' });
                    return;
                }

                // Find user
                const user = await User.findOne({ uid: userId });
                if (!user) {
                    socket.emit('message_error', { message: 'User not found' });
                    return;
                }

                // Create message
                const message = await Message.create({
                    user: user._id,
                    content: content.trim(),
                });

                // Populate user details
                const populatedMessage = await Message.findById(message._id)
                    .populate('user', 'uid displayName photoURL');

                if (!populatedMessage) {
                    socket.emit('message_error', { message: 'Failed to create message' });
                    return;
                }

                // Broadcast to ALL users (community-wide)
                io.emit('new_message', populatedMessage.toObject());

                console.log(`Message sent by ${userId}: "${content.substring(0, 30)}..."`);
            } catch (error) {
                console.error('Error handling send_message:', error);
                socket.emit('message_error', { message: 'Failed to send message' });
            }
        });

        // Handle get messages (load chat history)
        socket.on('get_messages', async (data: { limit?: number } = {}) => {
            const limit = Math.min(data.limit || 50, 100); // Max 100 messages
            console.log('Get Messages:', { limit });

            try {
                const messages = await Message.find()
                    .sort({ createdAt: -1 }) // Latest first
                    .limit(limit)
                    .populate('user', 'uid displayName photoURL');

                // Reverse to show oldest first
                const orderedMessages = messages.reverse();

                socket.emit('messages_loaded', orderedMessages);
                console.log(`Loaded ${orderedMessages.length} messages`);
            } catch (error) {
                console.error('Error handling get_messages:', error);
                socket.emit('message_error', { message: 'Failed to load messages' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            // Untrack user from distribution
            distributionManager.untrackUserConnection(socket.id);
        });
    });
};
