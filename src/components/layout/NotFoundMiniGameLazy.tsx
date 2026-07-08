'use client';

import dynamic from 'next/dynamic';

const NotFoundMiniGame = dynamic(() => import('./NotFoundMiniGame'), {
  ssr: false,
  loading: () => (
    <div
      className="section-frame min-h-[24rem] animate-pulse lg:min-h-[34rem]"
      aria-hidden="true"
    />
  ),
});

export default NotFoundMiniGame;
