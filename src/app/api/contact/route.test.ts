import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from './route';

const sendContactEmail = vi.hoisted(() => vi.fn());

vi.mock('@/lib/resend', () => ({ sendContactEmail }));

let requestNumber = 0;

function request(body: string, headers: Record<string, string> = {}) {
  requestNumber += 1;
  return new NextRequest('https://example.test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${requestNumber}`, ...headers },
    body,
  });
}

const validBody = JSON.stringify({
  name: 'Misty',
  email: 'misty@example.test',
  subject: 'A question',
  message: 'Hello Lunidex',
  website: '',
});

describe('/api/contact', () => {
  it('returns unavailable when delivery is not configured', async () => {
    sendContactEmail.mockResolvedValue(false);
    const response = await POST(request(validBody));

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ error: 'contact_delivery_unavailable' });
  });

  it('sends a valid message through the configured provider', async () => {
    sendContactEmail.mockResolvedValue(true);
    const response = await POST(request(validBody));

    expect(response.status).toBe(202);
    expect(sendContactEmail).toHaveBeenCalledWith({
      name: 'Misty',
      email: 'misty@example.test',
      subject: 'A question',
      message: 'Hello Lunidex',
    });
  });

  it('rejects invalid fields and the honeypot', async () => {
    expect((await POST(request(JSON.stringify({ ...JSON.parse(validBody), email: 'bad' })))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...JSON.parse(validBody), website: 'bot' })))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...JSON.parse(validBody), message: 'x'.repeat(5001) })))).status).toBe(400);
  });

  it('rejects non-JSON requests before parsing', async () => {
    const response = await POST(request(validBody, { 'content-type': 'text/plain' }));
    expect(response.status).toBe(415);
  });
});
