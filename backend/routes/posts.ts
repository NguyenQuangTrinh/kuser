import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post';
import User from '../models/User';
import PostView from '../models/PostView';
import { verifyToken } from '../middleware/authMiddleware';
import { getIO } from '../socket/socketManager';
import distributionManager from '../utils/distributionManager';

const router = express.Router();


// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', verifyToken, async (req: Request, res: Response) => {
    const { title, content, maxView } = req.body;
    const uid = res.locals.uid;

    try {
        // Validate content format: https://domain ### keyword!!! or https://domain###keyword!!!
        // Allow optional spaces before/after ###
        const contentPattern = /https?:\/\/[^\s#]+\s*###\s*[^!]+!!!/;
        if (!content || !contentPattern.test(content)) {
            res.status(400).json({
                message: 'Invalid content format. Must be: https://domain### keyword!!! (spaces optional)'
            });
            return;
        }

        const user = await User.findOne({ uid });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const post = await Post.create({
            title,
            content,
            author: user._id,
            maxView: maxView || 50,
        });

        // Populate author details for distribution
        const populatedPost = await Post.findById(post._id)
            .populate('author', 'uid displayName email photoURL');

        // Trigger real-time distribution (async, non-blocking)
        const io = getIO();
        if (io && populatedPost) {
            distributionManager.distributePost(populatedPost.toObject(), io);
        }

        res.status(201).json(post);
    } catch (error) {
        console.error('Create Post Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/posts
// @desc    Get all posts for the authenticated user
// @access  Private
router.get('/', verifyToken, async (req: Request, res: Response) => {
    const uid = res.locals.uid;

    try {
        const user = await User.findOne({ uid });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const posts = await Post.find({ author: user._id })
            .sort({ createdAt: -1 })
            .populate('author', 'displayName photoURL');
        res.status(200).json(posts);
    } catch (error) {
        console.error('Get Posts Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/posts/feed
// @desc    Get posts for the feed with weighted distribution (70% new, 30% old)
// @access  Private
router.get('/feed', verifyToken, async (req: Request, res: Response) => {
    try {
        // Parse pagination parameters
        const skip = parseInt(req.query.skip as string) || 0;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        // Get users with >= 5000 points
        const eligibleUsers = await User.find({ points: { $gte: 5000 } }).select('_id');
        const eligibleUserIds = eligibleUsers.map(user => user._id);

        // Base query: posts from eligible users with views remaining
        const baseQuery = {
            author: { $in: eligibleUserIds },
            currentView: { $lt: mongoose.Types.ObjectId }  // This will be replaced
        };

        // For weighted distribution when skip = 0 (initial load)
        if (skip === 0) {
            // 70% newest posts (7 out of 10)
            const newPosts = await Post.find({
                author: { $in: eligibleUserIds }
            })
                .sort({ createdAt: -1 })
                .limit(7)
                .populate('author', 'displayName photoURL points');

            // 30% oldest distributed posts (3 out of 10)
            const oldPosts = await Post.find({
                author: { $in: eligibleUserIds }
            })
                .sort({ lastDistributedAt: 1 })
                .limit(3)
                .populate('author', 'displayName photoURL points');

            // Remove duplicates (if any)
            const newPostIds = new Set(newPosts.map(p => p._id.toString()));
            const uniqueOldPosts = oldPosts.filter(p => !newPostIds.has(p._id.toString()));

            // Combine and shuffle
            const allPosts = [...newPosts, ...uniqueOldPosts];
            const shuffled = shuffleArray(allPosts);

            // Update lastDistributedAt for distributed posts
            const postIds = shuffled.map(p => p._id);
            await Post.updateMany(
                { _id: { $in: postIds } },
                { $set: { lastDistributedAt: new Date() } }
            );

            res.status(200).json(shuffled);
        } else {
            // For pagination (skip > 0), use standard newest-first approach
            const posts = await Post.find({ author: { $in: eligibleUserIds } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'displayName photoURL points');

            res.status(200).json(posts);
        }
    } catch (error) {
        console.error('Get Feed Posts Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/posts/feed/infinite
// @desc    Get random posts for auto-opener (allows duplicates/looping)
// @access  Private
router.get('/feed/infinite', verifyToken, async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        // Get users with >= 5000 points
        const eligibleUsers = await User.find({ points: { $gte: 5000 } }).select('_id');
        const eligibleUserIds = eligibleUsers.map(user => user._id);

        // Count total eligible posts
        const count = await Post.countDocuments({ author: { $in: eligibleUserIds } });

        if (count === 0) {
            res.status(200).json([]);
            return;
        }

        // Get random sample of posts
        const posts = await Post.aggregate([
            { $match: { author: { $in: eligibleUserIds } } },
            { $sample: { size: limit } },
            { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
            { $unwind: '$author' },
            {
                $project: {
                    'author.password': 0,
                    'author.googleId': 0,
                    'author.role': 0
                }
            }
        ]);

        res.status(200).json(posts);
    } catch (error) {
        console.error('Get Infinite Feed Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper: Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// @route   GET /api/posts/:id/views
// @desc    Get views for a specific post
// @access  Private
router.get('/:id/views', verifyToken, async (req: Request, res: Response) => {
    const postId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = parseInt(req.query.skip as string) || 0;

    try {
        const views = await PostView.find({ post: postId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .limit(limit)
            .populate('user', 'displayName photoURL')
            .populate('clickHistories');

        const total = await PostView.countDocuments({ post: postId });

        // Aggregate views by link
        const linkStats = await PostView.aggregate([
            { $match: { post: new mongoose.Types.ObjectId(postId) } },
            { $group: { _id: "$link", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({ views, total, linkStats });
    } catch (error) {
        console.error('Get Post Views Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH /api/posts/:id/auto-reup
// @desc    Toggle auto-reup for a specific post
// @access  Private (only post owner)
router.patch('/:id/auto-reup', verifyToken, async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        const uid = res.locals.uid;
        const { enabled } = req.body;

        const user = await User.findOne({ uid });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: 'Post not found' });
            return;
        }

        // Verify ownership
        if (post.author.toString() !== user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }

        post.autoReupEnabled = enabled;
        await post.save();

        res.status(200).json({
            message: `Auto-reup ${enabled ? 'enabled' : 'disabled'}`,
            post
        });
    } catch (error) {
        console.error('Toggle auto-reup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
