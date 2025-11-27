export const syncUserWithBackend = async (token: string) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    try {
        const res = await fetch(`${backendUrl}/api/auth/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });
        console.log(res)
        if (!res.ok) {
            throw new Error('Failed to sync user with backend');
        }

        return await res.json();
    } catch (error) {
        console.error('Service Error:', error);
        throw error;
    }
};
