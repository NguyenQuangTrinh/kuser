/**
 * Calculate points to award based on view duration
 * @param durationInSeconds - Duration of the view in seconds
 * @returns Points to award (0-10)
 */
export function calculatePointsFromDuration(durationInSeconds: number): number {
    if (durationInSeconds < 30) {
        return 0; // No points for views less than 30 seconds
    } else if (durationInSeconds < 60) {
        return 2; // 30-59 seconds
    } else if (durationInSeconds < 90) {
        return 5; // 60-89 seconds
    } else if (durationInSeconds < 120) {
        return 8; // 90-119 seconds
    } else {
        return 10; // 120+ seconds (maximum)
    }
}
