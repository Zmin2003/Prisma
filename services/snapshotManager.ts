import { DeepThinkSnapshot, SnapshotMetadata } from '../types';
import { STORAGE_KEYS } from '../config';
import { logger } from './logger';

const MAX_SNAPSHOTS = 10;
const SNAPSHOT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SnapshotManager {
  private static getStorageKey(): string {
    return STORAGE_KEYS.SNAPSHOTS;
  }

  static saveSnapshot(snapshot: DeepThinkSnapshot): void {
    try {
      const snapshots = this.getAllSnapshots();

      // Remove expired snapshots
      const now = Date.now();
      const validSnapshots = snapshots.filter(
        s => now - s.timestamp < SNAPSHOT_EXPIRY_MS
      );

      // Add new snapshot
      validSnapshots.unshift(snapshot);

      // Keep only MAX_SNAPSHOTS
      const trimmedSnapshots = validSnapshots.slice(0, MAX_SNAPSHOTS);

      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify(trimmedSnapshots)
      );

      logger.info('Snapshot', `Saved snapshot ${snapshot.id}`, {
        sessionId: snapshot.sessionId,
        state: snapshot.appState
      });
    } catch (error) {
      logger.error('Snapshot', 'Failed to save snapshot', error);
      console.error('Failed to save snapshot:', error);
    }
  }

  static loadSnapshot(snapshotId: string): DeepThinkSnapshot | null {
    try {
      const snapshots = this.getAllSnapshots();
      const snapshot = snapshots.find(s => s.id === snapshotId);

      if (snapshot) {
        logger.info('Snapshot', `Loaded snapshot ${snapshotId}`);
        return snapshot;
      }

      logger.warn('Snapshot', `Snapshot ${snapshotId} not found`);
      return null;
    } catch (error) {
      logger.error('Snapshot', 'Failed to load snapshot', error);
      console.error('Failed to load snapshot:', error);
      return null;
    }
  }

  static getAllSnapshots(): DeepThinkSnapshot[] {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (!stored) return [];

      const snapshots = JSON.parse(stored) as DeepThinkSnapshot[];

      // Filter out expired snapshots
      const now = Date.now();
      return snapshots.filter(s => now - s.timestamp < SNAPSHOT_EXPIRY_MS);
    } catch (error) {
      logger.error('Snapshot', 'Failed to load snapshots', error);
      console.error('Failed to load snapshots:', error);
      return [];
    }
  }

  static getSnapshotMetadata(): SnapshotMetadata[] {
    const snapshots = this.getAllSnapshots();
    return snapshots.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      sessionId: s.sessionId,
      query: s.query,
      model: s.model,
      appState: s.appState,
      canResume: this.canResumeSnapshot(s)
    }));
  }

  static deleteSnapshot(snapshotId: string): void {
    try {
      const snapshots = this.getAllSnapshots();
      const filtered = snapshots.filter(s => s.id !== snapshotId);

      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify(filtered)
      );

      logger.info('Snapshot', `Deleted snapshot ${snapshotId}`);
    } catch (error) {
      logger.error('Snapshot', 'Failed to delete snapshot', error);
      console.error('Failed to delete snapshot:', error);
    }
  }

  static clearExpiredSnapshots(): void {
    try {
      const snapshots = this.getAllSnapshots();
      const now = Date.now();
      const validSnapshots = snapshots.filter(
        s => now - s.timestamp < SNAPSHOT_EXPIRY_MS
      );

      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify(validSnapshots)
      );

      const removed = snapshots.length - validSnapshots.length;
      if (removed > 0) {
        logger.info('Snapshot', `Cleared ${removed} expired snapshots`);
      }
    } catch (error) {
      logger.error('Snapshot', 'Failed to clear expired snapshots', error);
    }
  }

  static getLatestSnapshotForSession(sessionId: string): DeepThinkSnapshot | null {
    const snapshots = this.getAllSnapshots();
    const sessionSnapshots = snapshots.filter(s => s.sessionId === sessionId);

    if (sessionSnapshots.length === 0) return null;

    // Return the most recent snapshot
    return sessionSnapshots.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  private static canResumeSnapshot(snapshot: DeepThinkSnapshot): boolean {
    // Can resume if not completed and not idle
    return snapshot.appState !== 'idle' && snapshot.appState !== 'completed';
  }
}
