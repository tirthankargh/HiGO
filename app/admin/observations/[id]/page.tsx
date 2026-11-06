import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { glaciers, observation, viewpoints } from '@/lib/db';
import { ReviewForm } from '@/components/Admin';
export const dynamic='force-dynamic';
export const metadata={title:'Review observation',robots:{index:false,follow:false}};
export default async function Review({ params }: { params:Promise<{id:string}> }) {
  if(!await isAdmin())redirect('/admin');const o=observation((await params).id);if(!o)notFound();const gs=glaciers();
  return <section className="shell admin-page"><Link className="back-link" href="/admin">← Curator’s desk</Link><span className="eyebrow">OBSERVATION REVIEW</span><h1>Keep the context.</h1><div className="review-layout"><aside><img className="review-full-image" src={`/api/media/${o.id}`} alt={o.caption||'Submitted photograph'}/><a className="text-link" href={`/api/media/${o.id}?variant=original`}>Download private original ↓</a><p className="form-fineprint">Public display copies omit embedded metadata. The original is preserved privately.</p></aside><ReviewForm observation={o} glaciers={gs} viewpoints={gs.flatMap(g=>viewpoints(g.id))}/></div></section>;
}
