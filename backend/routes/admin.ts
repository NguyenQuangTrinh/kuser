import express, { Request, Response } from 'express';
import User from '../models/User';
import SystemSetting from '../models/SystemSetting';
import { verifyToken } from '../middleware/authMiddleware';
import { verifyAdmin } from '../middleware/adminMiddleware';

const router = express.Router();

// Apply middleware to all admin routes
router.use(verifyToken, verifyAdmin);

// @route   GET /api/admin/users
// @desc    Get all users (paginated)
// @access  Admin
router.get('/users', async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
        const users = await User.find()
            .select('-password') // Exclude password if it existed (though we use firebase)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.status(200).json({
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/settings
// @desc    Get all system settings
// @access  Admin
router.get('/settings', async (req: Request, res: Response) => {
    try {
        const settings = await SystemSetting.find();
        // Convert array to object for easier frontend consumption
        const settingsMap = settings.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        res.status(200).json(settingsMap);
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/settings
// @desc    Update a system setting
// @access  Admin
router.put('/settings', async (req: Request, res: Response) => {
    const { key, value } = req.body;

    if (!key || value === undefined) {
        res.status(400).json({ message: 'Key and value are required' });
        return;
    }

    try {
        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true } // Create if not exists
        );

        res.status(200).json(setting);
    } catch (error) {
        console.error('Update Setting Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/users/:userId
// @desc    Update user role, expiration date, and points
// @access  Admin
router.put('/users/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role, expirationDate, points } = req.body;

    // Validate role
    if (role && !['ADMIN', 'MANAGER', 'USER'].includes(role)) {
        res.status(400).json({ message: 'Invalid role. Must be ADMIN, MANAGER, or USER' });
        return;
    }

    // Validate points
    if (points !== undefined && (typeof points !== 'number' || points < 0)) {
        res.status(400).json({ message: 'Invalid points. Must be a non-negative number' });
        return;
    }

    try {
        const updateData: any = {};
        if (role) updateData.role = role;
        if (expirationDate !== undefined) {
            updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
        }
        if (points !== undefined) updateData.points = points;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
