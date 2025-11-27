import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IPost extends Document {
    title: string;
    content: string;
    author: IUser['_id'];
    maxView: number;
    currentView: number;
    lastReupAt?: Date;
    reupCount: number;
    lastDistributedAt: Date;
    autoReupEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema: Schema = new Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    maxView: {
        type: Number,
        default: 50,
    },
    currentView: {
        type: Number,
        default: 0,
    },
    lastReupAt: {
        type: Date,
    },
    reupCount: {
        type: Number,
        default: 0,
    },
    lastDistributedAt: {
        type: Date,
        default: Date.now,
        index: true, // Index for efficient sorting
    },
    autoReupEnabled: {
        type: Boolean,
        default: true,  // Default: all posts eligible for auto-reup
    },
}, {
    timestamps: true,
});

const Post = mongoose.model<IPost>('Post', postSchema);

export default Post;
