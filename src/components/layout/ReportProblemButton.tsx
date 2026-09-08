'use client';

import { MessageSquareWarning } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { useRef, useState } from 'react';

interface FeedbackDialog {
  appendToDom: () => void;
  open: () => void;
  removeFromDom: () => void;
}

export interface ReportProblemButtonProps {
  addScreenshotLabel: string;
  cancelLabel: string;
  confirmScreenshotLabel: string;
  contactHref: string;
  errorEmptyMessage: string;
  errorForbidden: string;
  errorGeneric: string;
  errorNoClient: string;
  errorTimeout: string;
  formTitle: string;
  label: string;
  messageLabel: string;
  messagePlaceholder: string;
  removeScreenshotLabel: string;
  requiredLabel: string;
  submitLabel: string;
  successMessage: string;
}

export function ReportProblemButton({
  addScreenshotLabel,
  cancelLabel,
  confirmScreenshotLabel,
  contactHref,
  errorEmptyMessage,
  errorForbidden,
  errorGeneric,
  errorNoClient,
  errorTimeout,
  formTitle,
  label,
  messageLabel,
  messagePlaceholder,
  removeScreenshotLabel,
  requiredLabel,
  submitLabel,
  successMessage,
}: ReportProblemButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const dialogRef = useRef<FeedbackDialog | null>(null);

  const goToContact = () => {
    window.location.assign(contactHref);
  };

  const openFeedback = async () => {
    if (isOpening) return;

    setIsOpening(true);

    try {
      const feedback = Sentry.getFeedback();
      if (!feedback) {
        goToContact();
        return;
      }

      const dialog = await feedback.createForm({
        addScreenshotButtonLabel: addScreenshotLabel,
        cancelButtonLabel: cancelLabel,
        confirmButtonLabel: confirmScreenshotLabel,
        enableScreenshot: true,
        errorEmptyMessageText: errorEmptyMessage,
        errorForbiddenText: errorForbidden,
        errorGenericText: errorGeneric,
        errorNoClientText: errorNoClient,
        errorTimeoutText: errorTimeout,
        formTitle,
        isEmailRequired: false,
        isNameRequired: false,
        messageLabel,
        messagePlaceholder,
        onFormClose: () => {
          dialogRef.current?.removeFromDom();
          dialogRef.current = null;
        },
        onFormSubmitted: () => {
          dialogRef.current?.removeFromDom();
          dialogRef.current = null;
        },
        removeScreenshotButtonLabel: removeScreenshotLabel,
        showEmail: false,
        showName: false,
        successMessageText: successMessage,
        submitButtonLabel: submitLabel,
        triggerAriaLabel: label,
        triggerLabel: label,
        isRequiredLabel: requiredLabel,
      });

      dialogRef.current = dialog;
      dialog.appendToDom();
      dialog.open();
    } catch {
      goToContact();
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <button
      type="button"
      className="site-footer__link site-footer__link--compact group/footer-link cursor-pointer border-0 bg-transparent text-left font-inherit"
      onClick={() => void openFeedback()}
      disabled={isOpening}
      aria-busy={isOpening}
    >
      <MessageSquareWarning aria-hidden="true" className="site-footer__link-leading-icon h-4 w-4" />
      <span className="site-footer__link-label">{label}</span>
    </button>
  );
}
