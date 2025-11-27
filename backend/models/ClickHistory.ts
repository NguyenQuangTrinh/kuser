import mongoose, { Document, Schema } from 'mongoose';

export interface IClickHistory extends Document {
    userId: string;
    postId: string;
    parentUrl: string;
    childUrl: string;
    keyword: string;
    viewId?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    pointsAwarded?: number;
    createdAt: Date;
}

const ClickHistorySchema: Schema = new Schema({
    userId: { type: String, required: true },
    postId: { type: String, required: true },
    parentUrl: { type: String, required: true },
    childUrl: { type: String, required: true },
    keyword: { type: String, required: true },
    viewId: { type: Schema.Types.ObjectId, ref: 'PostView' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number },
    pointsAwarded: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IClickHistory>('ClickHistory', ClickHistorySchema);
