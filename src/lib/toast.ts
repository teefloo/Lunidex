import type { ReactNode } from 'react';
import type { ExternalToast } from 'sonner';

type ToastMessage = ReactNode | (() => ReactNode);
type ToastMethod = 'success' | 'info' | 'warning' | 'error';

export const TOAST_REQUEST_EVENT = 'primedex:toast-requested';

function requestToaster(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TOAST_REQUEST_EVENT));
  }
}

function showToast(method: ToastMethod, message: ToastMessage, data?: ExternalToast): void {
  requestToaster();
  void import('sonner').then(({ toast: sonnerToast }) => {
    sonnerToast[method](message, data);
  });
}

/** Keeps notifications out of the initial public-page bundle. */
export const toast = {
  success: (message: ToastMessage, data?: ExternalToast) => showToast('success', message, data),
  info: (message: ToastMessage, data?: ExternalToast) => showToast('info', message, data),
  warning: (message: ToastMessage, data?: ExternalToast) => showToast('warning', message, data),
  error: (message: ToastMessage, data?: ExternalToast) => showToast('error', message, data),
};
