'use client';

import dynamic from 'next/dynamic';

const SpaceFlight = dynamic(() => import('./SpaceFlight'), {
  ssr: false,
});

export default function ClientSpaceFlight() {
  return <SpaceFlight />;
} 