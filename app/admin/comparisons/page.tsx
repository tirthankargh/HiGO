import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { comparisons, glaciers, observations } from '@/lib/db';
import { CurateForm } from '@/components/Admin';
export const dynamic='force-dynamic';
export const metadata={title:'Curate comparisons',robots:{index:false,follow:false}};
export default async function Curate() { if(!await isAdmin())redirect('/admin');return <section className="shell admin-page"><Link className="back-link" href="/admin">← Curator’s desk</Link><span className="eyebrow">REPEAT PHOTOGRAPHY</span><h1>Put two moments<br/><em>in conversation.</em></h1><CurateForm observations={observations()} pairs={glaciers().flatMap(g=>comparisons(g.id,false))}/></section>; }
