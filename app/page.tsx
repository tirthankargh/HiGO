import Link from 'next/link';
import { glaciers, published, comparisons } from '@/lib/db';
import { atlasSummary } from '@/lib/atlas';
import Atlas from '@/components/Atlas';
import FeaturedStories, { type FeaturedStory } from '@/components/FeaturedStories';
import { photoDate } from '@/lib/format';
export const dynamic='force-dynamic';
export default function Home() {
  const records=glaciers();
  const stories:FeaturedStory[]=records.flatMap(g=>{
    const photos=published(g.id),cover=photos.find(p=>p.id==='drang-2023')||photos.find(p=>p.id===g.hero_id)||photos[0];
    if(!cover)return [];
    const pair=comparisons(g.id)[0];
    return [{name:g.name,eyebrow:pair?'CURATED COMPARISON':`${g.region} · FIELD JOURNAL`,title:pair?`${g.name}, across two moments`:g.id==='drang-drang'?'One valley. Many perspectives.':'A closer look at the ice.',description:pair?pair.caption:g.id==='drang-drang'?'Views of Drang Drung. The beginning of a photographic history.':'Panchinala, through a small collection of field photographs.',cover:cover.id,href:`/glaciers/${g.id}`,credit:cover.credit||'Photographer unconfirmed',date:photoDate(cover)}];
  });
  return <><FeaturedStories stories={stories}/><Atlas summary={atlasSummary()} hasJournal={published('drang-drang').length>0}/><section id="how" className="atlas-afterword shell"><div><span className="eyebrow">AN ATLAS OF PLACES. A RECORD MADE BY PEOPLE.</span><h2>Outlines tell us where.<br/><em>Photographs tell us more.</em></h2></div><div><p>We begin with two South Asian inventory regions and two photographic journals. As the collection grows, this atlas can connect more of the world’s glaciers to the people who remember them.</p><p>Each outline comes from a dated inventory. Each photograph keeps its own date, credit and context. Before-and-after comparisons appear only when their chronology and framing have been reviewed.</p><Link className="text-link" href="/about">How we keep the record honest <span>↗</span></Link></div></section><section className="atlas-journals shell"><div><span className="eyebrow">FROM THE FIELD</span><h2>The first journals</h2></div><div className="atlas-journal-links">{records.map(g=><Link href={`/glaciers/${g.id}`} key={g.id}><span><b>{g.name}</b><small>{published(g.id).length} reviewed photographs · {g.id==='panchinala'?'Map association awaiting review':'Provisional inventory association'}</small></span><span>↗</span></Link>)}</div></section><section className="contribute-banner shell"><span className="eyebrow">YOUR CAMERA ROLL COULD BE PART OF THE STORY</span><h2>Been here?<br/><em>Leave a moment.</em></h2><p>Your old trek photos could help document a glacier’s history.</p><Link className="button light" href="/contribute">Contribute a photograph <span>↗</span></Link><span className="banner-mountain" aria-hidden="true">△</span></section></>;
}
