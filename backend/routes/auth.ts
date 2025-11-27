import express, { Request, Response } from 'express';
import admin from '../config/firebase';
import User from '../models/User';

import SystemSetting from '../models/SystemSetting';

const router = express.Router();

// @route   POST /api/auth/sync
// @desc    Sync Firebase user to MongoDB
// @access  Public (Protected by Firebase Token)
router.post('/sync', async (req: Request, res: Response) => {
    const { token } = req.body;
    console.log('Received sync request');

    if (!token) {
        console.log('No token provided');
        res.status(400).json({ message: 'No token provided' });
        return;
    }

    try {
        console.log('Verifying token...');
        // Verify Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Token verified for UID:', decodedToken.uid);
        const { uid, email, name, picture, firebase } = decodedToken;

        if (!email) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        // Check if user exists in MongoDB
        let user = await User.findOne({ uid });

        if (user) {
            // Update existing user if needed (optional)
            // user.displayName = name || user.displayName;
            // user.photoURL = picture || user.photoURL;
            // await user.save();
            res.status(200).json(user);
            return;
        }

        // Fetch default demo days from SystemSetting
        let defaultDemoDays = 7; // Default fallback
        let demoSetting = await SystemSetting.findOne({ key: 'default_demo_days' });

        if (!demoSetting) {
            // Create default setting if not exists
            demoSetting = await SystemSetting.create({
                key: 'default_demo_days',
                value: 7
            });
        }

        if (demoSetting && typeof demoSetting.value === 'number') {
            defaultDemoDays = demoSetting.value;
        }

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + defaultDemoDays);

        // Create new user
        user = await User.create({
            uid,
            email,
            displayName: name || 'User',
            photoURL: picture || '',
            provider: firebase.sign_in_provider || 'password',
            role: 'USER',
            expirationDate,
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Auth Sync Error Full:', error);
        res.status(401).json({ message: 'Invalid token or auth error' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user info
// @access  Private
router.get('/me', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Verify Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { uid } = decodedToken;

        // Find user in MongoDB
        const user = await User.findOne({ uid }).select('-__v');

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

export default router;
