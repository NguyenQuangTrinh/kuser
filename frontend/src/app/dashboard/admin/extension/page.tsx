'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Upload, FileArchive, Download, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/config/api';

interface ExtensionVersion {
    _id: string;
    version: string;
    filename: string;
    description: string;
    uploadedAt: string;
    fileSize: number;
    downloadCount: number;
}

export default function ExtensionManagementPage() {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [versions, setVersions] = useState<ExtensionVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [version, setVersion] = useState('');
    const [description, setDescription] = useState('');

    // Fetch all versions
    const fetchVersions = async () => {
        if (!user) return;

        try {
            const token = await user.getIdToken();
            const response = await fetch(getApiUrl('/api/extension/all'), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setVersions(data);
            }
        } catch (error) {
            console.error('Error fetching versions:', error);
        } finally {
            setLoading(false);
        }
    };

    useState(() => {
        fetchVersions();
    });

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file || !version || !user) {
            toast.error('Please fill all required fields');
            return;
        }

        setUploading(true);

        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('extension', file);
            formData.append('version', version);
            formData.append('description', description);

            const response = await fetch(getApiUrl('/api/extension/upload'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Extension uploaded successfully!');
                setFile(null);
                setVersion('');
                setDescription('');
                fetchVersions();
            } else {
                toast.error(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this version?')) return;

        if (!user) return;

        try {
            const token = await user.getIdToken();
            const response = await fetch(getApiUrl(`/api/extension/${id}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success('Version deleted');
                fetchVersions();
            } else {
                toast.error('Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Delete failed');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Extension Management</h1>

            {/* Upload Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload New Version
                </h2>

                <form onSubmit={handleUpload} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Extension File (.zip) *
                        </label>
                        <input
                            type="file"
                            accept=".zip"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full border rounded-lg p-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Version Number *
                        </label>
                        <input
                            type="text"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            placeholder="e.g., 1.0.2"
                            className="w-full border rounded-lg p-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's new in this version?"
                            className="w-full border rounded-lg p-2"
                            rows={3}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload Extension'}
                    </button>
                </form>
            </div>

            {/* Versions List */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileArchive className="w-5 h-5" />
                    Extension Versions
                </h2>

                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : versions.length === 0 ? (
                    <p className="text-gray-500">No versions uploaded yet</p>
                ) : (
                    <div className="space-y-4">
                        {versions.map((ver) => (
                            <div
                                key={ver._id}
                                className="border rounded-lg p-4 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-lg font-semibold">v{ver.version}</span>
                                        <span className="text-sm text-gray-500">{ver.filename}</span>
                                    </div>
                                    {ver.description && (
                                        <p className="text-sm text-gray-600 mb-2">{ver.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>{formatFileSize(ver.fileSize)}</span>
                                        <span>{ver.downloadCount} downloads</span>
                                        <span>{new Date(ver.uploadedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={getApiUrl(`/api/extension/download/${ver._id}`)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                        title="Download"
                                    >
                                        <Download className="w-5 h-5" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(ver._id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
