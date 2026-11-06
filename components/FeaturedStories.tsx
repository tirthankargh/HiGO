'use client';
import { useState } from 'react';
import Link from 'next/link';
export type FeaturedStory={name:string;eyebrow:string;title:string;description:string;cover:string;href:string;credit:string;date:string};
export default function FeaturedStories({stories}:{stories:FeaturedStory[]}) {
  const [index,setIndex]=useState(0);const story=stories[index];
  if(!story)return null;
  return <section className="atlas-intro shell"><div className="atlas-intro-copy"><span className="eyebrow"><span className="tiny-dot"/> A SHARED MEMORY OF THE WORLD’S GLACIERS</span><h1>A world of ice.<br/><em>A record we share.</em></h1><p>Find a glacier. Explore its story.<br/>Help remember what it looked like.</p><a className="text-link" href="#explore">Enter the atlas <span>↓</span></a></div><div className="featured-story"><Link href={story.href} className="featured-image"><img className="hero-story-photo" src={`/api/media/${story.cover}`} alt={`Photographic record of ${story.name}`} fetchPriority="high"/><span className="featured-story-tag">FEATURED RECORD / {String(index+1).padStart(2,'0')}</span><span className="featured-story-arrow" aria-hidden="true">↗</span></Link><div className="featured-copy"><div><span className="eyebrow">{story.eyebrow}</span><h2><Link href={story.href}>{story.title}</Link></h2><p>{story.description}</p><span className="featured-credit">{story.date} · {story.credit}</span></div><div className="featured-pager" aria-label="Featured stories">{stories.map((s,i)=><button key={s.href} onClick={()=>setIndex(i)} aria-label={`Show featured story: ${s.name}`} aria-pressed={i===index}>{String(i+1).padStart(2,'0')}</button>)}</div></div></div></section>;
}
