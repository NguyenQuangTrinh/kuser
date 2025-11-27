import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSetting extends Document {
    key: string;
    value: any;
    postDistribution?: {
        enabled: boolean;
        waveCount: number;
        waveDelayMs: number;
    };
    reupSettings?: {
        enabled: boolean;
        cooldownMinutes: number;
        maxReupPerPost: number;
    };
}

const systemSettingSchema: Schema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    value: {
        type: Schema.Types.Mixed,
        required: true,
    },
    postDistribution: {
        enabled: {
            type: Boolean,
            default: true,
        },
        waveCount: {
            type: Number,
            default: 3,
            min: 1,
            max: 10,
        },
        waveDelayMs: {
            type: Number,
            default: 2000,
            min: 0,
        },
    },
    reupSettings: {
        enabled: {
            type: Boolean,
            default: true,
        },
        cooldownMinutes: {
            type: Number,
            default: 10,
            min: 0,
        },
        maxReupPerPost: {
            type: Number,
            default: -1, // -1 = unlimited
        },
    },
}, {
    timestamps: true,
});

const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', systemSettingSchema);

export default SystemSetting;
