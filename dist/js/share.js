// Share-a-mix links: the selected tape's tracklist for one language, packed into
// the URL hash (#mix=…). Nothing is uploaded; the link itself carries the songs.
// Local files can't travel in a link, so they are left out and counted.
import {languageTabsConfig} from './config.js';

const MAX_TRACKS=60;
const toBase64Url=text=>btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromBase64Url=code=>new TextDecoder().decode(Uint8Array.from(atob(code.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));

function pack(track){
  const base={t:track.title,a:track.artist};if(track.duration)base.d=Math.round(track.duration);
  if(track.sourceType==='youtube')return {...base,y:track.videoId};
  if(track.sourceType==='generated')return {...base,g:track.generated};
  if(track.sourceType==='audio'&&track.src){const out={...base,s:track.src.startsWith(location.origin)?track.src.slice(location.origin.length).replace(/^\//,'./'):track.src};if(track.catalogId)out.c=track.catalogId;if(track.attribution)out.n=track.attribution;return out;}
  return null;
}
function unpack(item){
  if(!item||typeof item!=='object')return null;
  const base={title:String(item.t||'Untitled track'),artist:String(item.a||'Unknown artist')};if(Number(item.d)>0)base.duration=Number(item.d);
  if(item.y)return {...base,sourceType:'youtube',videoId:String(item.y)};
  if(item.g)return {...base,generated:String(item.g)};
  if(item.s)return {...base,sourceType:'audio',src:String(item.s),...(item.c?{catalogId:String(item.c)}:{}),...(item.n?{attribution:String(item.n)}:{})};
  return null;
}
const sameTrack=(a,b)=>(a.videoId&&a.videoId===b.videoId)||(a.catalogId&&a.catalogId===b.catalogId)||(a.src&&a.src===b.src)||(a.generated&&a.generated===b.generated);

export function createMixLink(store,tape,language){
  const group=store.group(tape,language),packed=group.map(pack).filter(Boolean).slice(0,MAX_TRACKS);
  const url=new URL(location.href);url.hash=`mix=${toBase64Url(JSON.stringify({v:1,tape,lang:language,tracks:packed}))}`;
  return {url:url.href,count:packed.length,skipped:group.length-packed.length};
}

export function readMixFromHash(tapes){
  const match=/^#mix=([A-Za-z0-9_-]+)$/.exec(location.hash);if(!match)return null;
  try{
    const data=JSON.parse(fromBase64Url(match[1]));
    const languages=languageTabsConfig.languages.map(l=>l.id);
    if(data?.v!==1||!tapes.includes(data.tape)||!languages.includes(data.lang)||!Array.isArray(data.tracks))throw Error();
    const tracks=data.tracks.slice(0,MAX_TRACKS).map(unpack).filter(Boolean);
    return tracks.length?{tape:data.tape,language:data.lang,tracks}:null;
  }catch{return {error:'This mix link is damaged or incomplete. Ask for the link again.'};}
}

// Adds the tracks that aren't already on the tape. Invalid entries are skipped.
export function importMix(store,mix){
  let added=0,skipped=0;const existing=store.group(mix.tape,mix.language);
  for(const track of mix.tracks){
    if(existing.some(old=>sameTrack(old,{...track,src:track.src}))){skipped++;continue;}
    try{existing.push(store.addTrackToCassette(mix.tape,mix.language,track));added++;}catch{skipped++;}
  }
  return {added,skipped};
}

export function clearMixHash(){history.replaceState(null,'',location.pathname+location.search);}
