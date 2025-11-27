import express, { Request, Response } from 'express';
import PostView from '../models/PostView';
import Post from '../models/Post';
import User from '../models/User';
import { verifyToken } from '../middleware/authMiddleware';
import { getIO } from '../socket/socketManager';

const router = express.Router();

// @route   POST /api/views/start
// @desc    Start tracking a view (called by extension)
// @access  Private
router.post('/start', verifyToken, async (req: Request, res: Response) => {
    const { userId, postId, link } = req.body;
    const uid = res.locals.uid;

    try {
        // Find user by UID
        const user = await User.findOne({ uid });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Create a new view record
        const newView = await PostView.create({
            user: user._id,
            post: postId,
            link: link,
            startTime: new Date(),
        });

        // Update current view count in Post
        await Post.findByIdAndUpdate(postId, { $inc: { currentView: 1 } });

        // Emit socket event to update view count for all clients
        const io = getIO();
        if (io) {
            io.emit('post_view_update', {
                postId: postId,
                action: 'increment'
            });
        }

        res.status(201).json({ viewId: newView._id });
    } catch (error) {
        console.error('View Start Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/views/end
// @desc    End tracking a view (called by extension)
// @access  Private
router.post('/end', verifyToken, async (req: Request, res: Response) => {
    const { viewId, postId } = req.body;

    try {
        const view = await PostView.findById(viewId).populate('user');

        if (!view) {
            res.status(404).json({ message: 'View not found' });
            return;
        }

        view.endTime = new Date();
        view.duration = (view.endTime.getTime() - view.startTime.getTime()) / 1000;

        // Calculate points based on duration
        const { calculatePointsFromDuration } = await import('../utils/pointsCalculator');
        const pointsEarned = calculatePointsFromDuration(view.duration);
        view.pointsAwarded = pointsEarned;

        await view.save();

        // Award points to the viewer and deduct from post author
        if (pointsEarned > 0) {
            const post = await Post.findById(postId).populate('author');

            if (post) {
                // Add points to viewer
                const updatedViewer = await User.findByIdAndUpdate(
                    view.user,
                    { $inc: { points: pointsEarned } },
                    { new: true }
                );

                // Deduct points from post author
                const updatedAuthor = await User.findByIdAndUpdate(
                    post.author,
                    { $inc: { points: -pointsEarned } },
                    { new: true }
                );

                console.log(`Extension: Awarded ${pointsEarned} points to viewer and deducted from post author for ${view.duration}s view`);

                // Emit socket events for real-time updates
                const io = getIO();
                if (io) {
                    // Notify viewer with total points
                    const viewerUid = (view.user as any).uid;
                    const viewerRoom = `user_${viewerUid}`;
                    console.log(`[DEBUG] API: Emitting points_awarded to room ${viewerRoom}`);

                    io.to(viewerRoom).emit('points_awarded', {
                        userId: viewerUid,
                        points: pointsEarned,
                        totalPoints: updatedViewer?.points || 0,
                        duration: view.duration,
                        postId: postId,
                    });

                    // Notify author with total points
                    const authorUid = (post.author as any).uid;
                    const authorRoom = `user_${authorUid}`;
                    console.log(`[DEBUG] API: Emitting points_deducted to room ${authorRoom}`);

                    io.to(authorRoom).emit('points_deducted', {
                        userId: authorUid,
                        points: pointsEarned,
                        totalPoints: updatedAuthor?.points || 0,
                        postId: postId,
                    });
                }
            }
        }

        res.status(200).json({ success: true, pointsEarned });
    } catch (error) {
        console.error('View End Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
