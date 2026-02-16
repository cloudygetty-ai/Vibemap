import '../styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata = {
  title: 'VibeMap Pro',
  description: 'Real-Time Urban Discovery PWA',
  manifest: '/manifest.json',
  themeColor: '#000000',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
