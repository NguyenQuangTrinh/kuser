import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IMessage extends Document {
    user: IUser['_id'];
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema: Schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        maxlength: 500,
        trim: true,
    },
}, {
    timestamps: true,
});

// Index for faster queries (get latest messages)
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
