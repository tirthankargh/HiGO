'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as LibreMap } from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import { DRANG_RGI, type AtlasGlacier } from '@/lib/atlas-types';

type Props={selected:AtlasGlacier|null;onSelect:(id:string)=>void;onBounds:(bounds:number[])=>void;showOutlines:boolean;showJournals:boolean;hasJournal:boolean;view:{bounds:[number,number,number,number];key:number};available:boolean};
export default function AtlasMap({selected,onSelect,onBounds,showOutlines,showJournals,hasJournal,view,available}:Props) {
  const container=useRef<HTMLDivElement>(null),mapRef=useRef<LibreMap|null>(null),callback=useRef({onSelect,onBounds});
  callback.current={onSelect,onBounds};
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[zoom,setZoom]=useState(4);
  const initialView=useRef(view);
  useEffect(()=>{
    let disposed=false;let map:LibreMap|undefined;let observer:ResizeObserver|undefined;
    async function create(){
      try{
        const gl=await import('maplibre-gl'); if(disposed||!container.current)return;
        gl.setWorkerUrl('/atlas/maplibre-gl-worker.mjs');
        const grid:FeatureCollection<LineString>={type:'FeatureCollection',features:[]};
        for(let lon=-180;lon<=180;lon+=10)grid.features.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[lon,-80],[lon,80]]}});
        for(let lat=-80;lat<=80;lat+=10)grid.features.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:73},(_,i)=>[-180+i*5,lat])}});
        map=new gl.Map({container:container.current,attributionControl:false,center:[82,32],zoom:4,minZoom:1,maxZoom:14,renderWorldCopies:false,pitchWithRotate:false,dragRotate:false,touchPitch:false,style:{version:8,sources:{land:{type:'geojson',data:'/atlas/land.json'},grid:{type:'geojson',data:grid},ice:{type:'vector',tiles:[`${location.origin}/api/atlas/tiles/{z}/{x}/{y}`],maxzoom:10,attribution:'<a href="https://doi.org/10.5067/F6JMOVY5NAVZ" target="_blank" rel="noopener">RGI 7.0 · CC BY 4.0</a> · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>'}},layers:[{id:'water',type:'background',paint:{'background-color':'#172b32'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':'#263e43'}},{id:'coast',type:'line',source:'land',paint:{'line-color':'#527078','line-width':.7}},{id:'grid',type:'line',source:'grid',paint:{'line-color':'#99c2c8','line-opacity':.09,'line-width':.7}},{id:'ice-fill',type:'fill',source:'ice','source-layer':'outlines',paint:{'fill-color':'#b6e5e7','fill-opacity':.66}},{id:'ice-line',type:'line',source:'ice','source-layer':'outlines',paint:{'line-color':'#c6f6f5','line-opacity':.9,'line-width':['interpolate',['linear'],['zoom'],4,.3,11,1.3]}},{id:'ice-centers',type:'circle',source:'ice','source-layer':'centers',maxzoom:6,paint:{'circle-radius':['interpolate',['linear'],['zoom'],2,1,5,2.3],'circle-color':'#b5e7e8','circle-opacity':.65}},{id:'selected',type:'line',source:'ice','source-layer':'outlines',filter:['==',['get','id'],''],paint:{'line-color':'#eac18b','line-width':2.7}}]}});
        mapRef.current=map;
        map.touchZoomRotate.disableRotation();
        map.addControl(new gl.NavigationControl({showCompass:false}),'bottom-right');
        map.addControl(new gl.ScaleControl({unit:'metric'}),'bottom-left');
        map.addControl(new gl.AttributionControl({compact:true}),'bottom-right');
        map.fitBounds(initialView.current.bounds,{padding:70,duration:0});
        const labels:[string,number,number,boolean?][]=[['H I M A L A Y A',85,29],['K A R A K O R A M',75.8,36.4],['T I B E T A N   P L A T E A U',88,34],['INDIAN OCEAN',78,13],['New Delhi',77.21,28.61,true],['Kathmandu',85.32,27.72,true],['Leh',77.58,34.15,true]];
        for(const [name,lon,lat,city] of labels){const label=document.createElement('span');label.className=city?'atlas-place city':'atlas-place';label.textContent=name;label.setAttribute('aria-hidden','true');new gl.Marker({element:label}).setLngLat([lon,lat]).addTo(map);}
        if(hasJournal){const pin=document.createElement('button');pin.className='atlas-journal-pin';pin.innerHTML='<span aria-hidden="true">◉</span> Drang Drung <small>PHOTO JOURNAL ↗</small>';pin.setAttribute('aria-label','Select Drang Drung glacier');pin.addEventListener('click',()=>callback.current.onSelect(DRANG_RGI));new gl.Marker({element:pin,anchor:'bottom',offset:[0,-8]}).setLngLat([76.2796652,33.753907]).addTo(map);}
        map.on('load',()=>{if(disposed)return;setReady(true);setZoom(map!.getZoom());emitBounds();});
        function emitBounds(){const b=map!.getBounds();callback.current.onBounds([Math.max(-180,b.getWest()),Math.max(-85,b.getSouth()),Math.min(180,b.getEast()),Math.min(85,b.getNorth())]);}
        map.on('moveend',()=>{setZoom(map!.getZoom());emitBounds();});
        map.on('click',e=>{const features=map!.queryRenderedFeatures([[e.point.x-5,e.point.y-5],[e.point.x+5,e.point.y+5]],{layers:['ice-fill','ice-centers']});const id=features[0]?.properties?.id;if(id)callback.current.onSelect(id);});
        map.on('mousemove',e=>{map!.getCanvas().style.cursor=map!.queryRenderedFeatures(e.point,{layers:['ice-fill','ice-centers']}).length?'pointer':'';});
        map.on('error',e=>{if(disposed)return;if(e.error?.message?.includes('WebGL'))setError('Your browser could not render the map. You can still search and open glacier records.');else setError('Some map data could not load. Search still works; reload to retry the map.');});
        map.getCanvas().setAttribute('aria-label','Glacier atlas. Use arrow keys to pan and plus or minus to zoom. Search provides an alternative to selecting outlines.');
        observer=new ResizeObserver(()=>map?.resize());observer.observe(container.current);
      }catch {if(!disposed)setError('This browser could not render the map. Search and glacier records are still available.');}
    }
    if(available)void create();
    return()=>{disposed=true;observer?.disconnect();map?.remove();mapRef.current=null;};
  },[available,hasJournal]);
  useEffect(()=>{const map=mapRef.current;if(!ready||!map)return;map.setFilter('selected',['==',['get','id'],selected?.id||'']);if(selected){const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;map.fitBounds([selected.west,selected.south,selected.east,selected.north],{padding:{top:100,bottom:80,left:60,right:innerWidth>1100?390:70},maxZoom:11,duration:reduce?0:1100});}},[selected,ready]);
  useEffect(()=>{const map=mapRef.current;if(!ready||!map)return;for(const id of ['ice-fill','ice-line','ice-centers'])map.setLayoutProperty(id,'visibility',showOutlines?'visible':'none');},[showOutlines,ready]);
  useEffect(()=>{container.current?.querySelectorAll<HTMLElement>('.atlas-journal-pin').forEach(pin=>{pin.style.display=showJournals?'':'none';});},[showJournals,ready]);
  useEffect(()=>{if(ready&&mapRef.current)mapRef.current.fitBounds(view.bounds,{padding:70,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:900});},[view]);
  return <div className="atlas-map-stage"><div ref={container} className="atlas-map" data-testid="atlas-map" data-ready={ready}/>{!available?<div className="atlas-map-notice">The atlas is being prepared. Glacier journals are still available below.</div>:error?<div className="atlas-map-notice" role="status">{error}</div>:!ready?<div className="atlas-map-notice" role="status">Opening the atlas…</div>:null}<div className="atlas-map-caption"><span>2D ATLAS</span><span>{zoom<6?'Glacier centres · zoom in for outlines':'RGI inventory outlines'}</span></div><div className="atlas-north" aria-hidden="true">N<span>↑</span></div></div>;
}
