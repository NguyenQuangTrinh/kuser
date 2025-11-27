'use server';

import { syncUserWithBackend } from '@/services/authService';

export async function syncUserAction(token: string) {
    try {
        const user = await syncUserWithBackend(token);
        return { success: true, user };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
