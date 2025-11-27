import express, { Request, Response } from 'express';
import User from '../models/User';
import { authenticateFirebase } from '../middleware/authMiddleware';

const router = express.Router();

// Get current user's reup settings
router.get('/', authenticateFirebase, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;

        const user = await User.findOne({ uid: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return reup settings with defaults if not set
        const settings = user.reupSettings || {
            mode: 'normal',
            specificPostIds: []
        };

        res.json(settings);
    } catch (error) {
        console.error('Error fetching reup settings:', error);
        res.status(500).json({ message: 'Failed to fetch reup settings' });
    }
});

// Update user's reup settings
router.put('/', authenticateFirebase, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.uid;
        const { mode, specificPostIds } = req.body;

        // Validate mode
        if (!['normal', 'specific', 'one-user'].includes(mode)) {
            return res.status(400).json({ message: 'Invalid reup mode' });
        }

        // Validate specificPostIds if mode is 'specific'
        if (mode === 'specific') {
            if (!Array.isArray(specificPostIds) || specificPostIds.length === 0) {
                return res.status(400).json({
                    message: 'specificPostIds must be a non-empty array when mode is "specific"'
                });
            }
        }

        const user = await User.findOne({ uid: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update reup settings
        user.reupSettings = {
            mode,
            specificPostIds: mode === 'specific' ? specificPostIds : []
        };

        await user.save();

        res.json({
            message: 'Reup settings updated successfully',
            settings: user.reupSettings
        });
    } catch (error) {
        console.error('Error updating reup settings:', error);
        res.status(500).json({ message: 'Failed to update reup settings' });
    }
});

export default router;
