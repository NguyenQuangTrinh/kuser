import express from 'express';
import ClickHistory from '../models/ClickHistory';
import User from '../models/User'; // Added import for User model
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// Start tracking a Layer 2 click
router.post('/start', verifyToken, async (req: any, res) => {
    try {
        const { postId, parentUrl, childUrl, keyword, viewId } = req.body;
        const userId = req.user.uid;

        if (!postId || !parentUrl || !childUrl || !keyword || !viewId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newClick = new ClickHistory({
            userId,
            postId,
            parentUrl,
            childUrl,
            keyword,
            viewId,
            startTime: new Date()
        });

        await newClick.save();
        res.status(201).json({ clickId: newClick._id });
    } catch (error) {
        console.error('Error starting click history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// End tracking a Layer 2 click
router.post('/end', verifyToken, async (req: any, res) => {
    try {
        const { clickId } = req.body;
        const click = await ClickHistory.findById(clickId);

        if (!click) {
            return res.status(404).json({ message: 'Click record not found' });
        }

        click.endTime = new Date();
        click.duration = (click.endTime.getTime() - click.startTime.getTime()) / 1000;

        // Calculate points: Min 45s, 20-30 points
        let points = 0;
        if (click.duration >= 45) {
            // Random points between 20 and 30
            points = Math.floor(Math.random() * (30 - 20 + 1)) + 20;
        }
        click.pointsAwarded = points;

        await click.save();

        // Award points to user
        if (points > 0) {
            await User.findOneAndUpdate({ uid: click.userId }, { $inc: { points: points } });
        }

        res.json({ success: true, points });
    } catch (error) {
        console.error('Error ending click history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get click history (Admin only)
router.get('/', verifyToken, async (req: any, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const history = await ClickHistory.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('viewId', 'duration pointsAwarded'); // Populate view details if needed

        const total = await ClickHistory.countDocuments();

        res.json({
            history,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalClicks: total
        });
    } catch (error) {
        console.error('Error fetching click history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
