'use client';

import { FormEvent, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchAppApi } from '@/lib/app-api';
import { useTranslation } from '@/lib/i18n';

type FieldName = 'name' | 'email' | 'subject' | 'message';
type FormValues = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialValues: FormValues = { name: '', email: '', subject: '', message: '' };
const lengths: Record<FieldName, number> = { name: 120, email: 320, subject: 160, message: 5000 };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({ privacyHref }: { privacyHref: string }) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'unavailable' | 'error' | 'success'>('idle');
  const fieldRefs = useRef<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>({ name: null, email: null, subject: null, message: null });

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    for (const field of Object.keys(values) as FieldName[]) {
      const value = values[field].trim();
      if (!value) next[field] = t('contact.required');
      else if (value.length > lengths[field]) next[field] = t('contact.too_long');
      else if (field === 'email' && !emailPattern.test(value)) next[field] = t('contact.invalid_email');
    }
    return next;
  };

  const updateField = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (status !== 'idle') setStatus('idle');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    const firstError = (Object.keys(values) as FieldName[]).find((field) => nextErrors[field]);
    if (firstError) {
      window.requestAnimationFrame(() => fieldRefs.current[firstError]?.focus());
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');
    try {
      const response = await fetchAppApi('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: '' }),
      });
      if (response.ok) {
        setValues(initialValues);
        setStatus('success');
      } else if (response.status === 503) {
        setStatus('unavailable');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (name: FieldName, input: React.ReactNode) => (
    <div className="space-y-2">
      {input}
      {errors[name] && <p id={`${name}-error`} className="text-sm text-destructive" role="alert">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-busy={isSubmitting}>
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {field('name', <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-semibold">{t('contact.name_label')}</label>
          <Input id="contact-name" name="name" ref={(element) => { fieldRefs.current.name = element; }} value={values.name} onChange={(event) => updateField('name', event.target.value)} maxLength={lengths.name} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} placeholder={t('contact.name_placeholder')} />
        </div>)}
        {field('email', <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-semibold">{t('contact.email_label')}</label>
          <Input id="contact-email" name="email" ref={(element) => { fieldRefs.current.email = element; }} type="email" inputMode="email" value={values.email} onChange={(event) => updateField('email', event.target.value)} maxLength={lengths.email} autoComplete="email" spellCheck={false} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} placeholder={t('contact.email_placeholder')} />
        </div>)}
      </div>

      {field('subject', <div>
        <label htmlFor="contact-subject" className="mb-2 block text-sm font-semibold">{t('contact.subject_label')}</label>
        <Input id="contact-subject" name="subject" ref={(element) => { fieldRefs.current.subject = element; }} value={values.subject} onChange={(event) => updateField('subject', event.target.value)} maxLength={lengths.subject} autoComplete="off" aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'subject-error' : undefined} placeholder={t('contact.subject_placeholder')} />
      </div>)}

      {field('message', <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold">{t('contact.message_label')}</label>
        <Textarea id="contact-message" name="message" ref={(element) => { fieldRefs.current.message = element; }} value={values.message} onChange={(event) => updateField('message', event.target.value)} maxLength={lengths.message} rows={8} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'message-error' : undefined} placeholder={t('contact.message_placeholder')} />
      </div>)}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={isSubmitting} className="min-h-11">
          {isSubmitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
          {isSubmitting ? t('contact.submitting') : t('contact.submit')}
        </Button>
        <a href="mailto:contact@lunidex.app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          {t('contact.mailto_fallback')}
        </a>
      </div>

      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {status === 'unavailable' && <p className="text-amber-700 dark:text-amber-300">{t('contact.unavailable')}</p>}
        {status === 'error' && <p className="text-destructive">{t('contact.send_error')}</p>}
        {status === 'success' && <p className="text-emerald-700 dark:text-emerald-300"><strong>{t('contact.success')}</strong> {t('contact.success_body')}</p>}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('contact.privacy_notice', { defaultValue: 'We use the details in this form only to answer your request. See our' })}{' '}
        <Link href={privacyHref} className="underline underline-offset-2 hover:text-foreground">
          {t('contact.privacy_link', { defaultValue: 'privacy policy' })}
        </Link>.
      </p>
    </form>
  );
}
