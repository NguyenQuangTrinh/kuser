import { Server } from 'socket.io';
import SystemSetting from '../models/SystemSetting';

interface ConnectedUser {
    userId: string;
    socketId: string;
    wave: number;
    connectedAt: Date;
}

class DistributionManager {
    private connectedUsers: Map<string, ConnectedUser> = new Map();
    private waveCounter: number = 0;
    private distributionConfig = {
        enabled: true,
        waveCount: 3,
        waveDelayMs: 2000,
    };

    constructor() {
        this.loadConfigFromDB();
    }

    /**
     * Load distribution configuration from SystemSetting
     */
    private async loadConfigFromDB() {
        try {
            const settings = await SystemSetting.findOne();
            if (settings?.postDistribution) {
                this.distributionConfig = {
                    enabled: settings.postDistribution.enabled ?? true,
                    waveCount: settings.postDistribution.waveCount ?? 3,
                    waveDelayMs: settings.postDistribution.waveDelayMs ?? 2000,
                };
            }
        } catch (error) {
            console.error('Error loading distribution config:', error);
        }
    }

    /**
     * Reload configuration from DB (can be called from admin panel)
     */
    async reloadConfig() {
        await this.loadConfigFromDB();
        console.log('Distribution config reloaded:', this.distributionConfig);
    }

    /**
     * Track user connection and assign to a wave
     */
    trackUserConnection(userId: string, socketId: string): number {
        // Assign wave in round-robin fashion
        const wave = (this.waveCounter % this.distributionConfig.waveCount) + 1;
        this.waveCounter++;

        this.connectedUsers.set(socketId, {
            userId,
            socketId,
            wave,
            connectedAt: new Date(),
        });

        console.log(`User ${userId} connected on socket ${socketId}, assigned to wave ${wave}`);
        return wave;
    }

    /**
     * Remove user from tracking on disconnect
     */
    untrackUserConnection(socketId: string) {
        const user = this.connectedUsers.get(socketId);
        if (user) {
            console.log(`User ${user.userId} disconnected from wave ${user.wave}`);
            this.connectedUsers.delete(socketId);
        }
    }

    /**
     * Get list of users in a specific wave
     */
    getUsersByWave(wave: number): string[] {
        const users: string[] = [];
        this.connectedUsers.forEach((user) => {
            if (user.wave === wave) {
                users.push(user.userId);
            }
        });
        return users;
    }

    /**
     * Get all online users
     */
    getOnlineUsers(): ConnectedUser[] {
        return Array.from(this.connectedUsers.values());
    }

    /**
     * Get wave assignment for a specific user
     */
    getUserWave(userId: string): number | null {
        for (const user of this.connectedUsers.values()) {
            if (user.userId === userId) {
                return user.wave;
            }
        }
        return null;
    }

    /**
     * Distribute post across waves with staggered timing
     */
    async distributePost(post: any, io: Server) {
        if (!this.distributionConfig.enabled) {
            // If distribution is disabled, send to everyone immediately
            io.emit('new_post', post);
            console.log('Distribution disabled, broadcasting post to all users immediately');
            return;
        }

        const { waveCount, waveDelayMs } = this.distributionConfig;

        console.log(`Distributing post ${post._id} across ${waveCount} waves with ${waveDelayMs}ms delay`);

        // Distribute to each wave with delay
        for (let wave = 1; wave <= waveCount; wave++) {
            const delay = (wave - 1) * waveDelayMs;

            setTimeout(() => {
                const usersInWave = this.getUsersByWave(wave);

                if (usersInWave.length > 0) {
                    console.log(`Emitting post ${post._id} to wave ${wave} (${usersInWave.length} users)`);

                    // Emit to each user in this wave
                    usersInWave.forEach(userId => {
                        io.to(`user_${userId}`).emit('new_post', post);
                    });
                } else {
                    console.log(`Wave ${wave} has no online users, skipping`);
                }
            }, delay);
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.distributionConfig };
    }

    /**
     * Get statistics
     */
    getStats() {
        const waveDistribution: { [key: number]: number } = {};

        this.connectedUsers.forEach((user) => {
            waveDistribution[user.wave] = (waveDistribution[user.wave] || 0) + 1;
        });

        return {
            totalOnlineUsers: this.connectedUsers.size,
            waveDistribution,
            config: this.distributionConfig,
        };
    }
}

// Singleton instance
const distributionManager = new DistributionManager();

export default distributionManager;
