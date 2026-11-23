'use client';
import { useEffect, useState } from 'react';
import type { AtlasGlacier } from '@/lib/atlas-types';
export type ChosenInventory={id:string;name:string};
export default function GlacierPicker({chosen,onChoose}:{chosen:ChosenInventory|null;onChoose:(value:ChosenInventory|null)=>void}) {
  const [query,setQuery]=useState(''),[results,setResults]=useState<AtlasGlacier[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(query.trim().length<2){setResults([]);setBusy(false);setError('');return;}
    const controller=new AbortController();setBusy(true);setError('');
    const timer=setTimeout(async()=>{try{const r=await fetch(`/api/atlas?q=${encodeURIComponent(query)}`,{signal:controller.signal});if(!r.ok)throw new Error();const data=await r.json();if(!controller.signal.aborted){setResults(data.results);setBusy(false);}}catch{if(!controller.signal.aborted){setError('Could not search the inventory. You can still describe the glacier below.');setBusy(false);}}},250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  return <div className="glacier-picker"><input type="hidden" name="rgi_id" value={chosen?.id||''}/>
    <label>Find a glacier in the inventory <span className="optional">Optional</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name or RGI ID" maxLength={120} aria-describedby="glacier-picker-help"/></label>
    <p id="glacier-picker-help">Search 56,149 imported glaciers. Select a result to attach its RGI ID; leave it blank if you are unsure.</p>
    {chosen&&<div className="selected-inventory" role="status"><span><b>{chosen.name||'Unnamed glacier'}</b><br/>{chosen.id}</span><button type="button" onClick={()=>onChoose(null)}>Remove</button></div>}
    {busy&&<p role="status">Searching the inventory…</p>}{error&&<p role="alert">{error}</p>}
    {!busy&&query.trim().length>=2&&!error&&<div className="picker-results" aria-label="Inventory search results">{results.length?results.map(g=><button type="button" key={g.id} onClick={()=>{onChoose({id:g.id,name:g.name||'Unnamed glacier'});setQuery('');}}><span><b>{g.name||'Unnamed glacier'}</b><small>{g.id} · Region {g.region}</small></span><span aria-hidden="true">↗</span></button>):<p>No inventory match. You can describe the glacier below.</p>}</div>}
  </div>;
}
