import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import adminRoutes from './routes/admin';
import viewsRoutes from './routes/views';
import reupSettingsRoutes from './routes/reupSettings';
import clickHistoryRoutes from './routes/clickHistory';
import extensionRoutes from './routes/extension';

dotenv.config();

connectDB();

import http from 'http';
import { Server } from 'socket.io';
import { setupSocket } from './socket/socketManager';

const app: Application = express();
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = FRONTEND_URL.split(',').map(url => url.trim());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup Socket.io logic
setupSocket(io);

const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/views', viewsRoutes);
app.use('/api/reup-settings', reupSettingsRoutes);
app.use('/api/click-history', clickHistoryRoutes);
app.use('/api/extension', extensionRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('KuserNew Backend is running');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
