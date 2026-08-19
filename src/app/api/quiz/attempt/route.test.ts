import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const USER_ID = '72aaab1d-ae20-4ee0-9c60-cf8e8580f534';
const ATTEMPT_ID = '4f2a9b7e-4c32-4f84-9d11-8a3f6b7c2d10';

const mockGetNeonUserFromRequest = vi.hoisted(() => vi.fn());
const mockEnsureNeonUser = vi.hoisted(() => vi.fn());
const mockSql = vi.hoisted(() => vi.fn());

vi.mock('@/lib/neon/auth', () => ({
  ensureNeonUser: mockEnsureNeonUser,
  getNeonUserFromRequest: mockGetNeonUserFromRequest,
}));

vi.mock('@/lib/neon/server', () => ({
  getNeonClient: () => mockSql,
}));

vi.mock('@/lib/rate-limit', () => ({
  ipKey: () => 'test',
  rateLimit: () => true,
}));

import { POST } from './route';

function request(body: unknown): NextRequest {
  return new NextRequest('https://lunidex.test/api/quiz/attempt', {
    method: 'POST',
    headers: { authorization: 'Bearer signed-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/quiz/attempt', () => {
  beforeEach(() => {
    mockGetNeonUserFromRequest.mockReset().mockResolvedValue({
      id: USER_ID,
      email: 'ash@example.test',
      user_metadata: { name: 'Ash' },
    });
    mockEnsureNeonUser.mockReset().mockResolvedValue(undefined);
    mockSql.mockReset();
  });

  it('creates a server-owned daily attempt and returns only the first question', async () => {
    mockSql.mockResolvedValueOnce([{ id: ATTEMPT_ID, question_id: 25 }]);

    const response = await POST(request({ action: 'start', mode: 'marathon', challenge: 'classic' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      attemptId: ATTEMPT_ID,
      questionIndex: 0,
      questionId: 25,
      questionCount: 10,
    });
    expect(String(mockSql.mock.calls[0]?.[0]?.join(' '))).toContain('insert into public.quiz_attempts');
  });

  it('rejects unsupported challenge and mode values', async () => {
    const response = await POST(request({ action: 'start', mode: 'time-attack', challenge: 'silhouette' }));

    expect(response.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('records an answer against the expected question index and returns the next question', async () => {
    mockSql.mockResolvedValueOnce([{
      attempt_id: ATTEMPT_ID,
      answer_index: 1,
      correct: true,
      ready_to_submit: false,
      next_question_id: 26,
    }]);

    const response = await POST(request({
      action: 'answer',
      attemptId: ATTEMPT_ID,
      questionIndex: 0,
      answerId: 25,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      attemptId: ATTEMPT_ID,
      questionIndex: 1,
      correct: true,
      readyToSubmit: false,
      nextQuestionId: 26,
    });
    expect(String(mockSql.mock.calls[0]?.[0]?.join(' '))).toContain('answer_index =');
  });

  it('rejects an answer from another user or an unfinished/replayed attempt', async () => {
    mockSql.mockResolvedValueOnce([]);
    const response = await POST(request({
      action: 'answer',
      attemptId: ATTEMPT_ID,
      questionIndex: 0,
      answerId: 25,
    }));

    expect(response.status).toBe(409);
  });

  it('serializes concurrent answers through the expected question index', async () => {
    mockSql
      .mockResolvedValueOnce([{
        attempt_id: ATTEMPT_ID,
        answer_index: 1,
        correct: true,
        ready_to_submit: false,
        next_question_id: 26,
      }])
      .mockResolvedValueOnce([]);

    const responses = await Promise.all([
      POST(request({ action: 'answer', attemptId: ATTEMPT_ID, questionIndex: 0, answerId: 25 })),
      POST(request({ action: 'answer', attemptId: ATTEMPT_ID, questionIndex: 0, answerId: 25 })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  });
});

