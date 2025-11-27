/**
 * Service to automatically open links from posts with staggered delays
 * Now supports extension tracking via postMessage
 */

import { extractURLs } from '@/utils/linkExtractor';
import { addReferrerToURL } from '@/utils/referrerSpoofing';

interface Post {
    _id: string;
    content: string;
    [key: string]: any;
}

interface PostWithLinks {
    post: Post;
    links: string[];
    currentLinkIndex: number;
}

interface AutoLinkStatus {
    isRunning: boolean;
    currentPostIndex: number;
    totalPosts: number;
}

class AutoLinkOpener {
    private isRunning = false;
    private postsQueue: PostWithLinks[] = [];
    private currentPostIndex = 0;
    private timeoutId: NodeJS.Timeout | null = null;
    private onPostComplete: ((postId: string) => void) | null = null;

    /**
     * Start auto-opening links from posts
     */
    start(posts: Post[], onPostCompleteCallback: (postId: string) => void): void {
        if (this.isRunning) {
            console.log('Auto link opener already running');
            // If already running, just add the new posts
            this.addPosts(posts);
            return;
        }

        // Store callback for removing posts
        this.onPostComplete = onPostCompleteCallback;

        // Build queue of posts with their links
        this.postsQueue = posts.map(post => ({
            post,
            links: extractURLs(post.content),
            currentLinkIndex: 0,
        })).filter(item => item.links.length > 0); // Only posts with links

        if (this.postsQueue.length === 0) {
            console.log('No posts with links found to start');
            // Don't stop here, just set running to true and wait for posts
            this.isRunning = true;
            return;
        }

        console.log(`Starting auto link opener with ${this.postsQueue.length} posts`);
        this.isRunning = true;
        this.currentPostIndex = 0;
        this.openNextLink();
    }

    /**
     * Add more posts to the queue while running
     */
    addPosts(posts: Post[]): void {
        // Filter duplicates within the input array first
        const uniqueInputPosts = posts.filter((post, index, self) =>
            index === self.findIndex((p) => p._id === post._id)
        );

        const newPosts = uniqueInputPosts.map(post => ({
            post,
            links: extractURLs(post.content),
            currentLinkIndex: 0,
        })).filter(item => {
            // Check if post has links
            if (item.links.length === 0) return false;

            // Check if post is already in queue AND is pending (not yet processed)
            // We allow adding it again if it was already processed (index < currentPostIndex)
            const isPending = this.postsQueue.slice(this.currentPostIndex).some(p => p.post._id === item.post._id);
            return !isPending;
        });

        if (newPosts.length > 0) {
            console.log(`Adding ${newPosts.length} new posts to auto-open queue`);
            this.postsQueue.push(...newPosts);

            // If we were idle (current index at end), resume processing
            if (this.isRunning && this.currentPostIndex >= this.postsQueue.length - newPosts.length) {
                console.log('Resuming auto-open with new posts');
                this.openNextLink();
            }
        }
    }

    /**
     * Open next link in current post
     */
    private openNextLink(): void {
        if (!this.isRunning) return;

        // Check if we've processed all posts
        if (this.currentPostIndex >= this.postsQueue.length) {
            console.log('All posts processed, waiting for more...');
            // Do NOT stop, just wait.
            return;
        }

        const currentItem = this.postsQueue[this.currentPostIndex];

        // Check if all links in current post are opened
        if (currentItem.currentLinkIndex >= currentItem.links.length) {
            console.log(`All links opened for post ${currentItem.post._id}, removing from feed`);

            // Notify to remove this post from feed
            if (this.onPostComplete) {
                this.onPostComplete(currentItem.post._id);
            }

            // Move to next post
            this.currentPostIndex++;

            // Continue with next post immediately
            this.openNextLink();
            return;
        }

        // Get current link
        const url = currentItem.links[currentItem.currentLinkIndex];
        const urlWithReferrer = addReferrerToURL(url);

        console.log(
            `[Post ${this.currentPostIndex + 1}/${this.postsQueue.length}] ` +
            `[Link ${currentItem.currentLinkIndex + 1}/${currentItem.links.length}] ` +
            `Opening: ${url}`
        );

        // Send message to extension for tracking BEFORE opening link
        this.sendTrackingMessage(currentItem.post._id, url);

        // Open link
        this.openLinkInNewTab(urlWithReferrer);

        // Move to next link in current post
        currentItem.currentLinkIndex++;

        // Determine delay for next link
        // First 2 links overall: 10 seconds
        // Remaining links: 30 seconds
        const totalLinksOpened = this.getTotalLinksOpened();
        const delay = totalLinksOpened < 2 ? 10000 : 30000;

        console.log(`Next link will open in ${delay / 1000} seconds`);

        // Schedule next link
        this.timeoutId = setTimeout(() => {
            this.openNextLink();
        }, delay);
    }

    /**
     * Send tracking message to extension
     */
    private sendTrackingMessage(postId: string, linkUrl: string): void {
        try {
            window.postMessage({
                type: 'KUSERNEW_TRACK_TAB',
                postId: postId,
                link: linkUrl
            }, window.location.origin);

            console.log(`Sent tracking message for post ${postId}, link: ${linkUrl}`);
        } catch (error) {
            console.error('Error sending tracking message:', error);
        }
    }

    /**
     * Get total number of links opened so far
     */
    private getTotalLinksOpened(): number {
        let total = 0;
        for (let i = 0; i <= this.currentPostIndex && i < this.postsQueue.length; i++) {
            if (i === this.currentPostIndex) {
                total += this.postsQueue[i].currentLinkIndex;
            } else {
                total += this.postsQueue[i].links.length;
            }
        }
        return total;
    }

    /**
     * Open link in new tab (bypasses popup blockers better than window.open)
     */
    private openLinkInNewTab(url: string): void {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        // Temporarily add to DOM, click, then remove
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * Stop auto-opening
     */
    stop(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        this.isRunning = false;
        // We do NOT clear onPostComplete so we can resume if needed, 
        // but typically stop means stop. 
        // If we restart, start() will re-assign it.
        console.log('Auto link opener stopped');
    }

    /**
     * Get current status
     */
    getStatus(): AutoLinkStatus {
        return {
            isRunning: this.isRunning,
            currentPostIndex: this.currentPostIndex,
            totalPosts: this.postsQueue.length,
        };
    }

    /**
     * Check if currently running
     */
    isActive(): boolean {
        return this.isRunning;
    }
}

// Export singleton instance
export const autoLinkOpener = new AutoLinkOpener();
