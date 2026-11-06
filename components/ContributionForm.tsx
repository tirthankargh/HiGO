'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import exifr from 'exifr';
import type { Glacier } from '@/lib/types';
import { MAX_BYTES, MAX_PIXELS } from '@/lib/validation';
export default function ContributionForm({ glaciers, initialGlacier, inventory }: { glaciers: Glacier[]; initialGlacier:string; inventory?:{id:string;name:string}|null }) {
  const router=useRouter(), input=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null), [preview,setPreview]=useState(''), [busy,setBusy]=useState(false), [reading,setReading]=useState(false), [error,setError]=useState('');
  const [date,setDate]=useState(''), [precision,setPrecision]=useState('unknown'), [credit,setCredit]=useState(''), [latitude,setLatitude]=useState(''), [longitude,setLongitude]=useState(''), [exifMessage,setExifMessage]=useState('');
  const generation=useRef(0);
  useEffect(()=>{ if(!file) { setPreview(''); return; } const url=URL.createObjectURL(file); setPreview(url); return ()=>URL.revokeObjectURL(url); },[file]);
  async function select(selected?: File) {
    const run=++generation.current; setError(''); setFile(null); setDate(''); setPrecision('unknown'); setCredit(''); setLatitude(''); setLongitude(''); setExifMessage('');
    if(!selected) { setReading(false); return; }
    if(selected.size>MAX_BYTES || !['image/jpeg','image/png','image/webp'].includes(selected.type)) { setError('Choose a JPEG, PNG, or WebP no larger than 20 MB.'); setReading(false); return; }
    setReading(true);
    try {
      const bitmap=await createImageBitmap(selected); const tooLarge=bitmap.width*bitmap.height>MAX_PIXELS; bitmap.close();
      if(tooLarge) throw new Error('Choose a photograph no larger than 40 megapixels.');
      const meta=await exifr.parse(selected).catch(()=>null);
      if(run!==generation.current) return;
      if(meta?.DateTimeOriginal instanceof Date && !isNaN(meta.DateTimeOriginal.valueOf())) { const d=meta.DateTimeOriginal; setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); setPrecision('day'); }
      if(typeof meta?.Artist==='string') setCredit(meta.Artist.trim());
      if(typeof meta?.latitude==='number' && typeof meta?.longitude==='number') { setLatitude(String(meta.latitude)); setLongitude(String(meta.longitude)); }
      setExifMessage(meta?.DateTimeOriginal ? 'We found a camera date. Please check it before sending.' : 'No capture date found. Add what you remember, or leave it unknown.');
      setFile(selected);
    } catch(e) { if(run===generation.current) setError(e instanceof Error?e.message:'This image could not be opened.'); }
    finally { if(run===generation.current) setReading(false); }
  }
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!file || busy) return; setBusy(true); setError('');
    const form=new FormData(e.currentTarget); form.set('photo',file);
    try { const response=await fetch('/api/observations',{ method:'POST',body:form }); const result=await response.json(); if(!response.ok) throw new Error(result.error); router.push(result.receiptUrl); }
    catch(e) { setError(e instanceof Error?e.message:'The upload did not finish. Please try again.'); setBusy(false); }
  }
  return <form className="contribution-form" onSubmit={submit}>
    {inventory&&<div className="info-note"><b>For {inventory.name||'an unnamed glacier'}</b><br/>{inventory.id}<p>This is the glacier selected in the atlas, not the camera’s location. The association will be reviewed.</p><input type="hidden" name="rgi_id" value={inventory.id}/></div>}
    <div className="form-section"><div className="form-step-heading"><span>01</span><div><h2>Choose your photograph</h2><p>A moment from the mountains, old or new.</p></div></div>
      <input ref={input} id="photo-file" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose photograph" onChange={e=>select(e.target.files?.[0])} disabled={busy}/>
      {file ? <div className="upload-preview"><img src={preview} alt="Your selected photograph"/><div><b>{file.name}</b><span>{(file.size/1024/1024).toFixed(1)} MB · Original preserved</span><button type="button" className="text-link" disabled={busy} onClick={()=>input.current?.click()}>Choose a different photo ↗</button></div></div> : <button type="button" className="dropzone" disabled={reading} onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); select(e.dataTransfer.files?.[0]);}}><span className="upload-symbol" aria-hidden="true">↑</span><b>{reading?'Reading your photograph…':'Drop a photograph here'}</b><span>or choose a file from your device</span><small>JPEG, PNG, or WebP · Up to 20 MB / 40 megapixels</small></button>}
    </div>
    {file && <><div className="form-section"><div className="form-step-heading"><span>02</span><div><h2>Add what you know</h2><p>Missing details are welcome. We’ll keep them unknown.</p></div></div><p className="info-note">{exifMessage}</p>
      <label>Which glacier?<select name="glacier_id" defaultValue={initialGlacier}><option value="">Not sure / another glacier</option>{glaciers.map(g=><option key={g.id} value={g.id}>{g.name} · {g.region}</option>)}</select></label>
      <div className="form-row"><label>How precisely do you know the date?<select name="date_precision" value={precision} onChange={e=>{const v=e.target.value;setPrecision(v);setDate(d=>v==='year'?d.slice(0,4):v==='month'?d.slice(0,7):v==='unknown'?'':d);}}><option value="unknown">I don’t know the date</option><option value="year">Year only</option><option value="month">Month and year</option><option value="day">Exact day</option></select></label><label>Capture date<input name="capture_date" type={precision==='day'?'date':precision==='month'?'month':'text'} inputMode={precision==='year'?'numeric':undefined} value={date} disabled={precision==='unknown'} required={precision!=='unknown'} placeholder={precision==='unknown'?'Date unknown':'YYYY'} onChange={e=>setDate(e.target.value)}/></label></div>
      {precision!=='unknown' && <label className="checkbox-label"><input type="checkbox" name="approximate" value="yes"/>This date is approximate</label>}
      <label>Photographer credit <span className="optional">Optional</span><input name="credit" maxLength={200} value={credit} onChange={e=>setCredit(e.target.value)} placeholder="Name to display with the photograph"/></label>
      <label>Source or collection <span className="optional">Optional</span><input name="source" maxLength={1000} placeholder="Your own photograph, family archive, or original source"/></label>
      <label>A note from this moment <span className="optional">Optional</span><textarea name="caption" maxLength={2000} rows={3} placeholder="What do you remember? What can you see?"/></label>
      <details className="location-details"><summary>Where was the camera? <span>Optional details</span></summary><p>This is the photographer’s position, which may be far from the glacier. Leave it blank if you’re unsure.</p><label>Describe the viewpoint<textarea name="location_description" rows={2} maxLength={1000} placeholder="A trail, landmark, or place you remember"/></label><div className="form-row"><label>Camera latitude<input name="latitude" inputMode="decimal" value={latitude} onChange={e=>setLatitude(e.target.value)} placeholder="e.g. 33.9"/></label><label>Camera longitude<input name="longitude" inputMode="decimal" value={longitude} onChange={e=>setLongitude(e.target.value)} placeholder="e.g. 76.3"/></label></div><small>Exact coordinates are kept private for curator review.</small></details>
    </div><div className="form-section"><div className="form-step-heading"><span>03</span><div><h2>Make it part of the record</h2><p>Every contribution is reviewed before it appears.</p></div></div><label>Contact email <span className="optional">Optional · kept private</span><input name="contact" type="email" maxLength={254} placeholder="So the curator can ask about missing context"/></label><label className="checkbox-label consent"><input type="checkbox" required name="consent" value="yes"/><span>I took this photograph or have permission to share it. I allow HiGO to store the original and display the photograph with its attribution after review. This does not grant others a reuse license.</span></label><p className="form-fineprint">Your original file and contact email remain private. Only reviewed display images and their observation details appear in the journal.</p></div></>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {file && <button className="button dark submit-button" type="submit" disabled={busy||reading}>{busy?'Saving your photograph…':'Send for review'} <span>↗</span></button>}
  </form>;
}
