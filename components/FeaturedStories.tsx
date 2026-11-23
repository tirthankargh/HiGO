'use client';
import { useState } from 'react';
import Link from 'next/link';
export type FeaturedStory={name:string;eyebrow:string;title:string;description:string;cover:string;href:string;credit:string;date:string};
export default function FeaturedStories({stories}:{stories:FeaturedStory[]}) {
  const [index,setIndex]=useState(0);const story=stories[index];
  if(!story)return null;
  return <section className="featured-section shell"><div className="featured-heading"><span className="eyebrow">STORIES FROM THE FIELD</span><h2>Every image has<br/><em>a place in the record.</em></h2><p>Explore the photographs and stories beginning to take shape in our collection.</p></div><div className="featured-story"><Link href={story.href} className="featured-image"><img className="hero-story-photo" src={`/api/media/${story.cover}`} alt={`Photographic record of ${story.name}`} loading="lazy"/><span className="featured-story-tag">FEATURED RECORD / {String(index+1).padStart(2,'0')}</span><span className="featured-story-arrow" aria-hidden="true">↗</span></Link><div className="featured-copy"><div><span className="eyebrow">{story.eyebrow}</span><h2><Link href={story.href}>{story.title}</Link></h2><p>{story.description}</p><span className="featured-credit">{story.date} · {story.credit}</span></div><div className="featured-pager" aria-label="Featured stories">{stories.map((s,i)=><button key={s.href} onClick={()=>setIndex(i)} aria-label={`Show featured story: ${s.name}`} aria-pressed={i===index}>{String(i+1).padStart(2,'0')}</button>)}</div></div></div></section>;
}
