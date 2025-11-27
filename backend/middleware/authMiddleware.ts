import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    try {
        console.log('Verifying token...');
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Token verified. UID:', decodedToken.uid);
        (req as any).user = decodedToken; // Attach user to request
        res.locals.uid = decodedToken.uid; // Also attach to res.locals
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Export alias for compatibility
export const authenticateFirebase = verifyToken;

// Middleware to check if user is admin
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const uid = res.locals.uid;

        if (!uid) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Import User model here to avoid circular dependency
        const User = (await import('../models/User')).default;
        const user = await User.findOne({ uid });

        if (!user || user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Admin access required' });
            return;
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
