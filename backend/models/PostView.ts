import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

export interface IPostView extends Document {
    user: IUser['_id'];
    post: IPost['_id'];
    link: string;
    startTime: Date;
    endTime?: Date;
    duration?: number; // in seconds
    pointsAwarded: number; // points given to viewer
}

const postViewSchema: Schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
    },
    link: {
        type: String,
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endTime: {
        type: Date,
    },
    duration: {
        type: Number,
    },
    pointsAwarded: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for Layer 2 clicks
postViewSchema.virtual('clickHistories', {
    ref: 'ClickHistory',
    localField: '_id',
    foreignField: 'viewId'
});

const PostView = mongoose.model<IPostView>('PostView', postViewSchema);

export default PostView;
