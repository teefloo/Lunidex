import { describe, expect, it } from 'vitest';
import { getTCGCustomCollectionDragEndAnnouncement } from './tcg-custom-collection-dnd';

describe('custom collection drag announcements', () => {
  it('announces cancellation only when the drag-end event is canceled', () => {
    const canceledMessage = 'Reordering cancelled.';

    expect(getTCGCustomCollectionDragEndAnnouncement({ canceled: true }, canceledMessage)).toBe(canceledMessage);
    expect(getTCGCustomCollectionDragEndAnnouncement({ canceled: false }, canceledMessage)).toBeUndefined();
  });
});
