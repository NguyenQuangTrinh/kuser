import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/kusernew';
        console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//<credentials>@')); // Log without exposing credentials
        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
