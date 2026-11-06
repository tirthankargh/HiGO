import Link from 'next/link';
export default function NotFound() { return <section className="shell prose-page"><span className="eyebrow">A LITTLE OFF THE TRAIL</span><h1>This page isn’t<br/>in the record.</h1><p>It may have moved, or this observation is not available to view.</p><Link className="button dark" href="/">Return to the observatory ↗</Link></section>; }
