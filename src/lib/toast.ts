import type { ReactNode } from 'react';
import type { ExternalToast } from 'sonner';

type ToastMessage = ReactNode | (() => ReactNode);
type ToastMethod = 'success' | 'info' | 'warning' | 'error';
type ToastRequest = {
  method: ToastMethod;
  message: ToastMessage;
  data?: ExternalToast;
};

export const TOAST_REQUEST_EVENT = 'primedex:toast-requested';

let toasterReady = false;
let pendingToasts: ToastRequest[] = [];
let sonnerModulePromise: Promise<typeof import('sonner')> | null = null;

function requestToaster(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TOAST_REQUEST_EVENT));
  }
}

function loadSonner(): Promise<typeof import('sonner')> {
  sonnerModulePromise ??= import('sonner');
  return sonnerModulePromise;
}

async function dispatchToast({ method, message, data }: ToastRequest): Promise<void> {
  const { toast: sonnerToast } = await loadSonner();
  sonnerToast[method](message, data);
}

/** Flushes notifications queued while the deferred toaster was mounting. */
export function markToasterReady(): void {
  if (toasterReady) return;
  toasterReady = true;
  const queuedToasts = pendingToasts;
  pendingToasts = [];
  for (const queuedToast of queuedToasts) void dispatchToast(queuedToast);
}

function showToast(method: ToastMethod, message: ToastMessage, data?: ExternalToast): void {
  requestToaster();
  const request = { method, message, data } satisfies ToastRequest;
  if (!toasterReady) {
    pendingToasts.push(request);
    return;
  }
  void dispatchToast(request);
}

/** Keeps notifications out of the initial public-page bundle. */
export const toast = {
  success: (message: ToastMessage, data?: ExternalToast) => showToast('success', message, data),
  info: (message: ToastMessage, data?: ExternalToast) => showToast('info', message, data),
  warning: (message: ToastMessage, data?: ExternalToast) => showToast('warning', message, data),
  error: (message: ToastMessage, data?: ExternalToast) => showToast('error', message, data),
};
