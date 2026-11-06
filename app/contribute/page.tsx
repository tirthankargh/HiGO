import Link from 'next/link';
import { glaciers } from '@/lib/db';
import ContributionForm from '@/components/ContributionForm';
import { atlasGlacier } from '@/lib/atlas';
export const dynamic='force-dynamic';
export const metadata={title:'Contribute a photograph'};
export default async function Contribute({ searchParams }: { searchParams:Promise<{ glacier?:string;rgi?:string }> }) {
  const all=glaciers(), selected=(await searchParams).glacier||'';
  const rgi=(await searchParams).rgi, inventory=rgi?atlasGlacier(rgi):null;
  return <section className="shell contribute-layout"><aside><Link className="back-link" href="/#explore">← Back to the record</Link><span className="eyebrow">EVERY PERSPECTIVE MATTERS</span><h1>Leave <br/>a <em>moment.</em></h1><p className="lead">Your photograph could be the missing piece of a glacier’s story.</p><p>You don’t need to be a scientist. You don’t need every detail. Start with a photograph and what you remember.</p><div className="contributor-aside"><span className="small-star">✳</span><p><b>Your contribution stays yours.</b><br/>We keep your credit attached and review each photograph before sharing it.</p></div></aside><ContributionForm inventory={inventory?{id:inventory.id,name:inventory.name}:null} glaciers={all} initialGlacier={all.some(g=>g.id===selected)?selected:''}/></section>;
}
