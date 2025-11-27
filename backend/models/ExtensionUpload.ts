import mongoose, { Schema, Document } from 'mongoose';

export interface IExtensionUpload extends Document {
    version: string;
    filename: string;
    filepath: string;
    uploadedBy: string; // uid of admin
    uploadedAt: Date;
    description?: string;
    fileSize: number;
    downloadCount: number;
}

const extensionUploadSchema = new Schema<IExtensionUpload>({
    version: {
        type: String,
        required: true,
        unique: true
    },
    filename: {
        type: String,
        required: true
    },
    filepath: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        default: ''
    },
    fileSize: {
        type: Number,
        required: true
    },
    downloadCount: {
        type: Number,
        default: 0
    }
});

export default mongoose.model<IExtensionUpload>('ExtensionUpload', extensionUploadSchema);
