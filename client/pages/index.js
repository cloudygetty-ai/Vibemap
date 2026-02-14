import Head from 'next/head';
import dynamic from 'next/dynamic';

const VibeMap = dynamic(() => import('../components/VibeMap'), { ssr: false });
const VibeControl = dynamic(() => import('../components/VibeControl'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>VibeMap Pro</title>
        <meta name="description" content="Real-Time Urban Discovery" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <main className="relative w-full h-screen bg-black">
        <VibeMap />
        <VibeControl activeLocation={{ id: 'default' }} />
      </main>
    </>
  );
}
