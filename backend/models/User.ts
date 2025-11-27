import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    phone?: string;
    socialLinks?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
    };
    provider: string;
    role: 'ADMIN' | 'MANAGER' | 'USER';
    points: number;
    expirationDate?: Date;
    reupQuota?: {
        windowStart: Date;
        count: number;
    };
    reupSettings?: {
        mode: 'normal' | 'specific' | 'one-user';
        specificPostIds?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}

const userSchema: Schema = new Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    displayName: {
        type: String,
    },
    photoURL: {
        type: String,
    },
    phone: {
        type: String,
    },
    socialLinks: {
        facebook: { type: String },
        twitter: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
    },
    provider: {
        type: String,
        default: 'password',
    },
    role: {
        type: String,
        enum: ['ADMIN', 'MANAGER', 'USER'],
        default: 'USER',
    },
    points: {
        type: Number,
        default: 6000,
        min: 0,
    },
    expirationDate: {
        type: Date,
    },
    reupQuota: {
        windowStart: {
            type: Date,
            default: null,
        },
        count: {
            type: Number,
            default: 0,
        },
    },
    reupSettings: {
        mode: {
            type: String,
            enum: ['normal', 'specific', 'one-user'],
            default: 'normal',
        },
        specificPostIds: {
            type: [String],
            default: [],
        },
    },
}, {
    timestamps: true,
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
