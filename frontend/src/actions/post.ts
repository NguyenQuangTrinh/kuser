'use server';

import { createPost, getPosts, getFeedPosts, getPostViews, getInfiniteFeedPosts } from '@/services/postService';

export async function createPostAction(token: string, title: string, content: string, maxView: number) {
    try {
        const post = await createPost(token, title, content, maxView);
        return { success: true, post };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPostsAction(token: string) {
    try {
        const posts = await getPosts(token);
        return { success: true, posts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getFeedPostsAction(token: string, skip: number = 0, limit: number = 10) {
    try {
        const posts = await getFeedPosts(token, skip, limit);
        return { success: true, posts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getInfiniteFeedPostsAction(token: string, limit: number = 10) {
    try {
        const posts = await getInfiniteFeedPosts(token, limit);
        return { success: true, posts };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPostViewsAction(token: string, postId: string, skip: number = 0, limit: number = 10) {
    try {
        const result = await getPostViews(token, postId, skip, limit);
        return { success: true, ...result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
