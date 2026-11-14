import { spring } from 'remotion';

export function computeSpringProgress(
    frame: number,
    fps: number = 30,
    delayFrames: number = 0,
    damping: number = 14,
    stiffness: number = 120
): number {
    const relFrame = frame - delayFrames;
    if (relFrame <= 0) return 0;
    const val = spring({
        frame: relFrame,
        fps,
        config: { damping, stiffness }
    });
    if (Number.isNaN(val) || val < 0) return 0;
    return val;
}

export function formatPesoAnimated(targetAmount: number, progress: number): string {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    const current = targetAmount * clampedProgress;
    return `₱${current.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}
