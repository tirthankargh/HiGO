import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
export const dynamic='force-dynamic';
export const metadata={title:'Your contribution',robots:{ index:false,follow:false }};
export default async function Receipt({ params }: { params:Promise<{ token:string }> }) {
  const token=(await params).token;
  if(!/^[a-f0-9]{64}$/.test(token)) notFound();
  const o=db().prepare('SELECT status, glacier_id FROM observations WHERE receipt_token=?').get(token) as {status:string;glacier_id:string|null}|undefined;
  if(!o) notFound();
  return <section className="shell receipt-page"><span className="receipt-mark">✓</span><span className="eyebrow">A MOMENT, PRESERVED</span><h1>Thank you for<br/><em>adding yours.</em></h1><p className="lead">Your photograph has been saved.</p><div className="receipt-status"><span className={`status ${o.status}`}>{o.status==='pending'?'Awaiting review':o.status==='approved'?'Published in the record':'Reviewed · not published'}</span><p>{o.status==='pending'?'The curator will check the photograph and its context before it appears in a journal.':o.status==='approved'?'Your photograph is now part of the glacier’s journal.':'The curator has reviewed this contribution. It is being kept out of the public record.'}</p></div><p className="muted">Bookmark this private receipt to check its status later.</p><div className="hero-actions"><Link className="button dark" href={o.status==='approved'&&o.glacier_id?`/glaciers/${o.glacier_id}`:'/#explore'}>Explore the record ↗</Link><Link className="text-link" href="/contribute">Add another photograph →</Link></div></section>;
}
