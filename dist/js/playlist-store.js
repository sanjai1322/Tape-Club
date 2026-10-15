import {PLAYLISTS} from './playlists.js';
import {CASSETTE_THEMES} from './themes.js';
import {languageTabsConfig,UI_CONFIG} from './config.js';
const languages=languageTabsConfig.languages.map(l=>l.id);
const uid=()=>globalThis.crypto?.randomUUID?.()||`track-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function parseYouTubeLink(value){
  let url;try{url=new URL(value)}catch{throw Error('Paste a complete YouTube or youtu.be link.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Use a valid YouTube link.');
  const host=url.hostname.toLowerCase();let id;
  if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(host)){
    if(url.pathname==='/watch')id=url.searchParams.get('v');else id=url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  }
  if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))throw Error('Use a link to a single YouTube video, including watch, Shorts or youtu.be links.');
  return {videoId:id,url:`https://www.youtube.com/watch?v=${id}`,thumbnail:`https://i.ytimg.com/vi/${id}/mqdefault.jpg`};
}
export function validateAudioURL(value,relative=false){
  if(relative&&/^\.\/audio\/[A-Za-z0-9_.-]+$/.test(value))return value;
  let url;try{url=new URL(value)}catch{throw Error('Enter a complete HTTPS audio-file URL.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP or HTTPS audio-file URL without login credentials.');
  if(/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(url.hostname))throw Error('Choose YouTube link as the source type for this address.');
  return url.href;
}
export function isPlayable(track){return !!track&&!track.unavailable&&!!(track.sourceType==='youtube'?track.videoId:track.generated||track.src);}
export async function addSongFromYouTube(url,{signal}={}){
  const data=parseYouTubeLink(url);const timeout=AbortSignal.timeout(UI_CONFIG.metadataTimeout);
  const response=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(data.url)}&format=json`,{signal:signal||timeout});
  if(!response.ok)throw Error('Details are unavailable. Enter the title and artist below.');
  const meta=await response.json();return {...data,title:String(meta.title||'').slice(0,180),artist:String(meta.author_name||'').slice(0,120)};
}
function normalize(track,language=languageTabsConfig.defaultLanguage){
  const t={id:String(track.id||uid()),title:String(track.title||'Untitled track').slice(0,180),artist:String(track.artist||'Unknown artist').slice(0,120),language:languages.includes(track.language)?track.language:language,sourceType:track.sourceType||(track.generated?'generated':track.local?'local':'audio')};
  if(!['youtube','generated','local','audio'].includes(t.sourceType))throw Error('Unsupported song source.');
  if(Number.isFinite(Number(track.duration))&&Number(track.duration)>0)t.duration=Number(track.duration);
  if(t.sourceType==='youtube')Object.assign(t,parseYouTubeLink(track.url||`https://youtu.be/${track.videoId}`));
  else if(t.sourceType==='generated'){const [theme,variation,...extra]=String(track.generated).split(':');if(!CASSETTE_THEMES[theme]||(variation&&variation!=='alternate')||extra.length)throw Error('Unknown synth study');t.generated=track.generated;}
  else if(t.sourceType==='local'){t.local=true;t.src=track.src?.startsWith('blob:')?track.src:'';t.unavailable=!t.src;}
  else t.src=validateAudioURL(track.src,true);
  for(const key of ['catalogId','attribution','license','source'])if(typeof track[key]==='string')t[key]=track[key].slice(0,1000);
  return t;
}
export class PlaylistStore{
  constructor(storage){
    try{storage=storage??globalThis.localStorage}catch{storage=null;}
    this.storage=storage;this.listeners=new Set();this.revision=0;this.warning=storage?'':'Browser storage is disabled. Changes will last only in this tab.';this.urls=new Set();this.languages={};
    this.playlists=Object.fromEntries(Object.keys(CASSETTE_THEMES).map(id=>[id,(PLAYLISTS[id]||[]).map((t,i)=>normalize({...t,id:`seed-${id}-${i}`}))]));
    for(const id of Object.keys(this.playlists))this.languages[id]=languageTabsConfig.defaultLanguage;
    try{const saved=JSON.parse(storage?.getItem(UI_CONFIG.storageKey)||'null');if((saved?.version===1||saved?.version===2)&&saved.playlists){for(const id of Object.keys(this.playlists)){if(!Array.isArray(saved.playlists[id]))continue;const seeds=this.playlists[id];let list=saved.playlists[id].slice(0,UI_CONFIG.maxTracksPerCassette).flatMap(t=>{try{return [normalize({...t,src:t.sourceType==='local'?'':t.src})]}catch{return []}});
      // Version 1 lists predate the full-length default songs: add them once, in front.
      if(saved.version===1)list=[...seeds.filter(t=>t.catalogId&&!list.some(old=>old.catalogId===t.catalogId)),...list].slice(0,UI_CONFIG.maxTracksPerCassette);
      this.playlists[id]=list;}if(saved.version===1)this.persistPlaylistState();}}catch{this.warning='Saved playlists could not be read. Your default collection is available.';}
  }
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
  emit(){this.revision++;this.listeners.forEach(fn=>fn());}
  language(id){return this.languages[id]||languageTabsConfig.defaultLanguage;}
  group(id,language=this.language(id)){return this.playlists[id].filter(t=>t.language===language);}
  setLanguage(id,language){if(!languages.includes(language))throw Error('Unknown language');this.languages[id]=language;this.emit();}
  playableIndices(id,language=this.language(id)){return this.playlists[id].flatMap((t,i)=>t.language===language&&isPlayable(t)?[i]:[]);}
  persistPlaylistState(){
    const playlists=Object.fromEntries(Object.entries(this.playlists).map(([id,list])=>[id,list.map(t=>{const copy={...t};if(t.local){delete copy.src;delete copy.unavailable;}return copy;})]));
    try{this.storage?.setItem(UI_CONFIG.storageKey,JSON.stringify({version:2,playlists}));}catch{this.warning='Browser storage is full or disabled. Changes work in this tab but may not survive a reload.';}
    this.emit();
  }
  addTrackToCassette(id,language,track){
    if(!this.playlists[id]||!languages.includes(language))throw Error('Choose a cassette and language.');
    if(this.playlists[id].length>=UI_CONFIG.maxTracksPerCassette)throw Error('This cassette is full. Remove a track before adding another.');
    const t=normalize({...track,id:uid(),language});this.playlists[id].push(t);this.persistPlaylistState();return t;
  }
  update(id,trackId,destination,language,data){
    const list=this.playlists[id],index=list.findIndex(t=>t.id===trackId);if(index<0)throw Error('Track no longer exists.');
    if(id!==destination&&this.playlists[destination].length>=UI_CONFIG.maxTracksPerCassette)throw Error('The destination cassette is full.');
    const updated=normalize({...list[index],...data,id:trackId,language});
    if(id===destination)list[index]=updated;else{list.splice(index,1);this.playlists[destination].push(updated);}
    this.persistPlaylistState();return updated;
  }
  remove(id,trackId){const index=this.playlists[id].findIndex(t=>t.id===trackId);if(index<0)return;const [track]=this.playlists[id].splice(index,1);if(track.local){this.deleteFile(trackId).catch(()=>{});if(track.src){URL.revokeObjectURL(track.src);this.urls.delete(track.src);}}this.persistPlaylistState();}
  move(id,language,trackId,delta){const list=this.playlists[id],group=this.group(id,language),index=group.findIndex(t=>t.id===trackId),other=group[index+delta];if(!other)return;const a=list.findIndex(t=>t.id===trackId),b=list.indexOf(other);[list[a],list[b]]=[list[b],list[a]];this.persistPlaylistState();}
  async database(){if(!this.dbPromise)this.dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('tape-club-audio',1);req.onupgradeneeded=()=>req.result.createObjectStore('files');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return this.dbPromise;}
  async fileOperation(method,id,file){const db=await this.database();return new Promise((resolve,reject)=>{const tx=db.transaction('files',method==='get'?'readonly':'readwrite'),store=tx.objectStore('files');const req=method==='put'?store.put(file,id):store[method](id);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage was interrupted'));});}
  async saveFile(id,file){try{await this.fileOperation('put',id,file);return true}catch{this.warning='This audio file could not be saved in browser storage. It remains playable in this tab.';this.emit();return false;}}
  deleteFile(id){return this.fileOperation('delete',id);}
  async restoreFiles(){for(const list of Object.values(this.playlists))for(const t of list)if(t.local){try{const file=await this.fileOperation('get',t.id);if(file){t.src=URL.createObjectURL(file);this.urls.add(t.src);t.unavailable=false;}}catch{this.warning='Local audio storage is unavailable. Re-add missing files to restore playback.';}}this.emit();}
  dispose(){this.urls.forEach(url=>URL.revokeObjectURL(url));this.dbPromise?.then(db=>db.close()).catch(()=>{});}
}
