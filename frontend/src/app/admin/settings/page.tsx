'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings as SettingsIcon, Calendar, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [defaultDemoDays, setDefaultDemoDays] = useState(7);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${BACKEND_URL}/api/admin/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setDefaultDemoDays(data.default_demo_days || 7);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setSaveSuccess(false);
        try {
            const token = await user.getIdToken();
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${BACKEND_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    key: 'default_demo_days',
                    value: defaultDemoDays,
                }),
            });

            if (response.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                fetchSettings();
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center mb-6"
                >
                    <SettingsIcon className="w-8 h-8 text-indigo-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                </motion.div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"
                        />
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white shadow-lg sm:rounded-lg border border-gray-200"
                    >
                        <div className="px-6 py-6 sm:p-8">
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="demo-days" className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                        <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                                        Default Demo Days
                                    </label>
                                    <div className="mt-2 flex rounded-lg shadow-sm">
                                        <input
                                            type="number"
                                            id="demo-days"
                                            value={defaultDemoDays}
                                            onChange={(e) => setDefaultDemoDays(parseInt(e.target.value) || 0)}
                                            className="flex-1 min-w-0 block w-full px-4 py-3 rounded-l-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                                            min="1"
                                        />
                                        <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 sm:text-sm font-medium">
                                            days
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-500 flex items-start">
                                        <span className="mr-2">ℹ️</span>
                                        Number of days new users can use the system for free during the trial period.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    {saveSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center text-green-600 text-sm font-medium"
                                        >
                                            <span className="mr-2">✓</span>
                                            Settings saved successfully!
                                        </motion.div>
                                    )}
                                    <div className="flex-1"></div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="-ml-1 mr-2 h-4 w-4" />
                                                Save Settings
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

