'use client';
export default function ErrorPage({ reset }: { reset:()=>void }) { return <section className="shell prose-page"><span className="eyebrow">A PAUSE IN THE JOURNEY</span><h1>We couldn’t load<br/>this page.</h1><p>Please try again. If you’re setting up HiGO, run <code>npm run setup</code> first.</p><button className="button dark" onClick={reset}>Try again ↗</button></section>; }
