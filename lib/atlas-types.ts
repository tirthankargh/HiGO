import type { PublicObservation } from './types';
export type AtlasGlacier = { id:string; name:string; region:string; longitude:number; latitude:number; area:number; source_date:string|null; min_elevation:number|null; max_elevation:number|null; west:number; south:number; east:number; north:number };
export type AtlasDetail = AtlasGlacier & { photos:PublicObservation[]; relatedJournal:null|{slug:string;name:string;count:number;cover:string|null;coverCredit:string;coverDate:string;provisional:boolean} };
export type AtlasSummary = { available:boolean; count:number; regions:{id:string;count:number}[]; bounds:[number,number,number,number]|null };
export const DRANG_RGI = 'RGI2000-v7.0-G-14-26914';
