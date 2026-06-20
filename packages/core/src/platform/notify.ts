import { toast } from 'sonner';

/**
 * Web user-facing notifications via sonner toasts. Metro resolves the
 * `notify.native.ts` variant on React Native, keeping sonner (a DOM library)
 * out of the mobile bundle.
 */
export const notify = {
  error: (message: string) => toast.error(message),
  success: (message: string) => toast.success(message),
};
