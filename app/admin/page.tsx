import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { glaciers, observations } from '@/lib/db';
import { LoginForm, Logout, ReviewList } from '@/components/Admin';
export const dynamic='force-dynamic';
export const metadata={title:'Curator desk',robots:{index:false,follow:false}};
export default async function Admin() { const signedIn=await isAdmin();return <section className="shell admin-page"><div className="section-heading"><div><span className="eyebrow">BEHIND THE RECORD</span><h1>The curator’s desk.</h1></div>{signedIn&&<Logout/>}</div>{signedIn?<><div className="admin-intro"><p>Review observations, preserve their context, and decide what joins the journal.</p><Link className="button outline" href="/admin/comparisons">Curate comparisons ↗</Link></div><ReviewList observations={observations()} glaciers={glaciers()}/></>:<><p className="lead">Sign in to review contributions and care for the collection.</p><LoginForm/></>}</section>; }
