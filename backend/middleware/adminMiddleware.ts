import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const uid = res.locals.uid;

    if (!uid) {
        res.status(401).json({ message: 'Unauthorized: No user ID found' });
        return;
    }

    try {
        const user = await User.findOne({ uid });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden: Admin access required' });
            return;
        }

        next();
    } catch (error) {
        console.error('Verify Admin Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
