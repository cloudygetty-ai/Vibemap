import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Mapbox requires browser APIs — disable SSR for map components
const VibeMap = dynamic(() => import('../components/VibeMap'), { ssr: false });
const VibeControl = dynamic(() => import('../components/VibeControl'), { ssr: false });

export default function Home() {
  const [activeLocation, setActiveLocation] = useState(null);

  return (
    <>
      <Head>
        <title>VibeMap Pro</title>
        <meta name="description" content="Real-time urban discovery PWA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <main className="relative w-full h-screen overflow-hidden bg-black">
        <VibeMap onLocationSelect={setActiveLocation} />
        {activeLocation && <VibeControl activeLocation={activeLocation} />}
      </main>
    </>
  );
}
