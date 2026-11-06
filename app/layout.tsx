import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Brand';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
export const metadata: Metadata = { title: { default:'HiGO — A shared memory of the mountains', template:'%s · HiGO' }, description:'An atlas and living photographic record of the world’s glaciers. Starting in the Himalaya, built from people’s photographs.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main">{children}</main><Footer/></body></html>; }
