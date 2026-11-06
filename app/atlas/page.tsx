import Atlas from '@/components/Atlas';
import { atlasSummary } from '@/lib/atlas';
import { published } from '@/lib/db';
export const dynamic='force-dynamic';
export const metadata={title:'Glacier atlas',description:'Explore the glacier inventory, discover photographic records, and contribute a moment. Starting with South Asia West and East.'};
export default function AtlasPage(){return <><h1 className="visually-hidden">The glacier atlas</h1><Atlas summary={atlasSummary()} hasJournal={published('drang-drang').length>0} full/></>;}
