import { describe, it, expect } from 'vitest';
import { getTypingStatusText } from '../src/components/chat/ChatTypingIndicator';

describe('ChatTypingIndicator', () => {
    it('returns appropriate status text for Gemini AI mode', () => {
        const text = getTypingStatusText('gemini');
        expect(text).toContain('Gemini AI');
        expect(text).toContain('generating response');
    });

    it('returns appropriate status text for Offline Engine mode', () => {
        const text = getTypingStatusText('offline');
        expect(text).toContain('PocketBot');
        expect(text).toContain('SQLite');
    });
});
