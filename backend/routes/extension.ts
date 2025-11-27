import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ExtensionUpload from '../models/ExtensionUpload';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware';
import { getIO } from '../socket/socketManager';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/extensions');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'extension-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('Only .zip files are allowed'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// @route   POST /api/extension/upload
// @desc    Upload new extension version (Admin only)
// @access  Private (Admin)
router.post('/upload', verifyToken, requireAdmin, upload.single('extension'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const { version, description } = req.body;
        const uid = res.locals.uid;

        if (!version) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            res.status(400).json({ message: 'Version is required' });
            return;
        }

        // Check if version already exists
        const existing = await ExtensionUpload.findOne({ version });
        if (existing) {
            fs.unlinkSync(req.file.path);
            res.status(400).json({ message: 'Version already exists' });
            return;
        }

        const extensionUpload = await ExtensionUpload.create({
            version,
            filename: req.file.originalname,
            filepath: req.file.path,
            uploadedBy: uid,
            description: description || '',
            fileSize: req.file.size
        });

        // Notify all users via socket
        const io = getIO();
        if (io) {
            io.emit('extension_update', {
                version: extensionUpload.version,
                description: extensionUpload.description,
                uploadedAt: extensionUpload.uploadedAt
            });
        }

        res.status(201).json({
            message: 'Extension uploaded successfully',
            extension: extensionUpload
        });
    } catch (error) {
        console.error('Extension upload error:', error);
        // Clean up file if exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/extension/latest
// @desc    Get latest extension version info
// @access  Private
router.get('/latest', verifyToken, async (req: Request, res: Response) => {
    try {
        const latest = await ExtensionUpload.findOne()
            .sort({ uploadedAt: -1 })
            .select('-filepath');

        res.json(latest || null);
    } catch (error) {
        console.error('Get latest extension error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/extension/all
// @desc    Get all extension versions (Admin only)
// @access  Private (Admin)
router.get('/all', verifyToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const extensions = await ExtensionUpload.find()
            .sort({ uploadedAt: -1 })
            .select('-filepath');

        res.json(extensions);
    } catch (error) {
        console.error('Get all extensions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/extension/download/:id
// @desc    Download extension file
// @access  Private
router.get('/download/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const extension = await ExtensionUpload.findById(req.params.id);

        if (!extension) {
            res.status(404).json({ message: 'Extension not found' });
            return;
        }

        if (!fs.existsSync(extension.filepath)) {
            res.status(404).json({ message: 'File not found' });
            return;
        }

        // Increment download count
        extension.downloadCount += 1;
        await extension.save();

        res.download(extension.filepath, extension.filename);
    } catch (error) {
        console.error('Download extension error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/extension/:id
// @desc    Delete extension version (Admin only)
// @access  Private (Admin)
router.delete('/:id', verifyToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const extension = await ExtensionUpload.findById(req.params.id);

        if (!extension) {
            res.status(404).json({ message: 'Extension not found' });
            return;
        }

        // Delete file
        if (fs.existsSync(extension.filepath)) {
            fs.unlinkSync(extension.filepath);
        }

        await ExtensionUpload.findByIdAndDelete(req.params.id);

        res.json({ message: 'Extension deleted successfully' });
    } catch (error) {
        console.error('Delete extension error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
