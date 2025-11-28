const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const createPost = async (token: string, title: string, content: string, maxView: number) => {
    const res = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content, maxView }),
    });

    if (!res.ok) {
        throw new Error('Invalid content format. Must be: https://domain### keyword!!! (spaces optional)');
    }

    return await res.json();
};

export const getPosts = async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Fetch Posts Error: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to fetch posts: ${res.status} ${res.statusText}`);
    }

    return await res.json();
};

export const getFeedPosts = async (token: string, skip: number = 0, limit: number = 10) => {
    const res = await fetch(`${BACKEND_URL}/api/posts/feed?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Fetch Feed Posts Error: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to fetch feed posts: ${res.status} ${res.statusText}`);
    }

    return await res.json();
};

export const getInfiniteFeedPosts = async (token: string, limit: number = 10) => {
    const res = await fetch(`${BACKEND_URL}/api/posts/feed/infinite?limit=${limit}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Fetch Infinite Feed Posts Error: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to fetch infinite feed posts: ${res.status} ${res.statusText}`);
    }

    return await res.json();
};

export const getPostViews = async (token: string, postId: string, skip: number = 0, limit: number = 10) => {
    const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/views?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`Fetch Post Views Error: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to fetch post views: ${res.status} ${res.statusText}`);
    }

    return await res.json();
};
