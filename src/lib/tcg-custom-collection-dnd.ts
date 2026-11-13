import type { DragEndEvent } from '@dnd-kit/react';

/** Returns a cancellation announcement only for canceled drag-end events. */
export function getTCGCustomCollectionDragEndAnnouncement(
  event: Pick<DragEndEvent, 'canceled'>,
  canceledMessage: string,
): string | undefined {
  return event.canceled ? canceledMessage : undefined;
}
