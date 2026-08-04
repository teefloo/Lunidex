'use client';

import { useEffect, useMemo } from 'react';
import { serializeJsonLd } from '@/lib/json-ld';

interface ClientJsonLdProps {
  id: string;
  data: object;
}

/**
 * Adds structured data after hydration without placing a script node in the
 * server/client tree that React has to reconcile.
 */
export function ClientJsonLd({ id, data }: ClientJsonLdProps) {
  const serialized = useMemo(() => serializeJsonLd(data), [data]);

  useEffect(() => {
    let script = document.getElementById(id) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = serialized;

    return () => {
      script?.remove();
    };
  }, [id, serialized]);

  return null;
}
