import {languageTabsConfig,UI_CONFIG} from './config.js';
import {parseYouTubeLink,validateAudioURL,addSongFromYouTube,isPlayable} from './playlist-store.js';
const $=id=>document.getElementById(id);
const time=s=>s>0?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'—';
const icons={up:'M6 14l6-6 6 6',down:'M6 10l6 6 6-6',edit:'M4 16l-1 5 5-1L20 8l-4-4L4 16ZM14 6l4 4',remove:'M4 6h16M9 6V3h6v3M7 6l1 15h8l1-15M10 10v7M14 10v7'};
function iconButton(action,label){const b=document.createElement('button');b.type='button';b.className='track-tool';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[action]}"/></svg>`;return b;}
export function createPlaylistUI({store,audio,transport,displayName,onError}){
  let managing=false,signature='',editing=null,metadataController=null;
  const dialog=document.createElement('dialog');dialog.id='song-dialog';dialog.setAttribute('aria-labelledby','song-dialog-title');
  dialog.innerHTML=`<button class="dialog-close" id="close-song" aria-label="Close song editor">×</button><span class="eyebrow">MAKE THE MIX YOURS</span><h2 id="song-dialog-title">Add a song.</h2>
  <form id="song-form"><div class="form-pair"><label>Cassette<select id="song-cassette"></select></label><label>Language<select id="song-language"></select></label></div>
  <label>Source<select id="song-source"><option value="youtube">YouTube link</option><option value="audio">Licensed audio URL</option></select></label>
  <div id="song-link-fields"><label id="song-url-label">Song link<input id="song-url" type="url" placeholder="https://www.youtube.com/watch?v=…" maxlength="2048"></label><button type="button" id="song-metadata" class="text-button">Get title &amp; artist ↗</button></div>
  <p id="song-source-help" class="source-note">YouTube songs open on YouTube. Audio is never extracted.</p>
  <label>Song title<input id="song-title" required maxlength="180" placeholder="Song title"></label>
  <div class="form-pair"><label>Artist / channel<input id="song-artist" maxlength="120" placeholder="Artist or channel name"></label><label>Duration (optional)<input id="song-duration" placeholder="3:42" inputmode="numeric" maxlength="8"></label></div>
  <label id="song-credit-field" hidden>Credit / license (optional)<input id="song-credit" maxlength="500" placeholder="Artist · permission or license"></label>
  <p id="song-message" role="status" aria-live="polite"></p><button class="primary" id="save-song" type="submit"><span>Add to playlist</span><span>＋</span></button></form>`;
  document.body.appendChild(dialog);
  Object.keys(store.playlists).forEach(id=>{const o=new Option(displayName(id),id);$('song-cassette').add(o);});
  languageTabsConfig.languages.forEach(l=>$('song-language').add(new Option(l.label,l.id)));
  function sourceFields(){const type=$('song-source').value;const link=type==='youtube'||type==='audio';$('song-link-fields').hidden=!link;$('song-url').required=link;$('song-metadata').hidden=type!=='youtube';$('song-credit-field').hidden=type!=='audio';$('song-source-help').textContent=type==='youtube'?'Opens on YouTube in a new tab. No audio is extracted.':type==='audio'?'Use a direct, licensed audio-file URL. The host must allow browser audio access.':type==='local'?'This file stays in this browser. Re-add the file to replace its audio.':'Original TAPE//CLUB synth study.';}
  function cancelMetadata(){metadataController?.abort();metadataController=null;$('song-metadata').disabled=false;}
  function open(track=null){
    cancelMetadata();editing=track?{cassette:transport.selected,id:track.id}:null;$('song-form').reset();$('song-message').textContent='';
    $('song-source').querySelectorAll('[data-extra]').forEach(o=>o.remove());
    const type=track?.sourceType||'youtube';if(!['youtube','audio'].includes(type)){const o=new Option(type==='local'?'Local audio file':'Original synth study',type);o.dataset.extra='true';$('song-source').add(o);}
    $('song-source').value=type;$('song-source').disabled=!!track&&!['youtube','audio'].includes(type);
    $('song-cassette').value=transport.selected;$('song-language').value=track?.language||store.language(transport.selected);
    $('song-url').value=track?.url||track?.src||'';$('song-title').value=track?.title||'';$('song-artist').value=track?.artist||'';$('song-duration').value=track?.duration?time(track.duration):'';$('song-credit').value=track?.attribution||'';
    $('song-dialog-title').textContent=track?'Edit this song.':'Add a song.';$('save-song').firstElementChild.textContent=track?'Save changes':'Add to playlist';sourceFields();dialog.showModal();
  }
  $('add-song').onclick=()=>open();$('close-song').onclick=()=>dialog.close();dialog.addEventListener('close',cancelMetadata);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  $('song-source').onchange=()=>{cancelMetadata();sourceFields();};$('song-url').oninput=cancelMetadata;
  $('song-cassette').onchange=()=>{$('song-language').value=store.language($('song-cassette').value);};
  $('song-metadata').onclick=async()=>{
    cancelMetadata();let parsed;try{parsed=parseYouTubeLink($('song-url').value)}catch(e){$('song-message').textContent=e.message;return;}
    metadataController=new AbortController();const active=metadataController;const timer=setTimeout(()=>active.abort(),UI_CONFIG.metadataTimeout);$('song-metadata').disabled=true;$('song-message').textContent='Looking up the title and channel…';
    try{const info=await addSongFromYouTube(parsed.url,{signal:active.signal});if(active!==metadataController)return;$('song-title').value=info.title;$('song-artist').value=info.artist;$('song-message').textContent='Title and channel found. Duration can be entered manually.';}
    catch{if(active===metadataController)$('song-message').textContent='Details could not be fetched. Enter the title and artist manually; the link can still be saved.';}
    finally{clearTimeout(timer);if(active===metadataController){metadataController=null;$('song-metadata').disabled=false;}}
  };
  $('song-form').onsubmit=async e=>{
    e.preventDefault();if(transport.busy)return;cancelMetadata();$('song-message').textContent='';
    try{
      const id=$('song-cassette').value,language=$('song-language').value,sourceType=$('song-source').value;
      const title=$('song-title').value.trim();if(!title)throw Error('Enter a song title.');
      const data={title,artist:$('song-artist').value.trim()||'Unknown artist',sourceType};
      const duration=$('song-duration').value.trim();if(duration){if(!/^\d{1,3}:[0-5]\d$/.test(duration))throw Error('Enter duration as minutes:seconds, for example 3:42.');data.duration=duration.split(':').reduce((a,b)=>a*60+Number(b),0);}else data.duration=undefined;
      if(sourceType==='youtube')Object.assign(data,parseYouTubeLink($('song-url').value.trim()));
      if(sourceType==='audio'){data.src=validateAudioURL($('song-url').value.trim());data.attribution=$('song-credit').value.trim()||'Hosted audio · added by you';}
      const result=await transport.mutatePlaylist(()=>editing?store.update(editing.cassette,editing.id,id,language,data):store.addTrackToCassette(id,language,data));
      if(!result)throw Error('The song could not be saved. Please try again.');
      dialog.close();await transport.select(id);if(store.language(id)!==language)await transport.setLanguage(id,language);render();
    }catch(error){$('song-message').textContent=error.message;}
  };
  $('manage-tracks').onclick=()=>{managing=!managing;signature='';render();};
  function renderTrackCarousel(id,group,busy){
    const list=$('playlist');list.replaceChildren();
    if(!group.length){const empty=document.createElement('li');empty.className='playlist-empty';empty.textContent=`No ${languageTabsConfig.languages.find(l=>l.id===store.language(id)).label} songs yet. Add a song, upload audio, or choose a sampler below.`;list.appendChild(empty);return;}
    group.forEach((track,i)=>{
      const li=document.createElement('li');li.className='track-row';li.dataset.trackId=track.id;
      const external=track.sourceType==='youtube',button=document.createElement(external?'a':'button');button.className='track-play';
      if(external){button.href=track.url;button.target='_blank';button.rel='noopener noreferrer';button.setAttribute('aria-label',`Open ${track.title} on YouTube in a new tab`);button.onclick=()=>transport.pause();}
      else{button.type='button';button.disabled=busy||!isPlayable(track);button.classList.toggle('current',audio.playlists[id][audio.indices[id]||0]?.id===track.id);button.setAttribute('aria-pressed',String(button.classList.contains('current')));button.onclick=()=>transport.chooseTrack(id,audio.playlists[id].findIndex(t=>t.id===track.id));}
      const number=document.createElement('span');number.className='track-number';number.textContent=String(i+1).padStart(2,'0');
      if(external&&UI_CONFIG.showThumbnails){const img=document.createElement('img');img.src=track.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.hidden=true;number.textContent='';number.appendChild(img);}
      const text=document.createElement('span');text.className='track-copy';const name=document.createElement('span');name.className='track-name';name.textContent=track.title;const meta=document.createElement('small');meta.textContent=track.unavailable?'File missing · re-add audio':`${track.artist} · ${external?'YouTube ↗':track.local?'Local file':track.generated?'Synth study':'Audio'}`;text.append(name,meta);
      const duration=document.createElement('span');duration.className='track-time';duration.textContent=track.generated?'0:32':time(track.duration);button.append(number,text,duration);li.appendChild(button);
      const tools=document.createElement('div');tools.className='track-tools';tools.hidden=!managing;
      for(const [action,label,disabled,fn] of [
        ['up',`Move ${track.title} up`,i===0,()=>store.move(id,store.language(id),track.id,-1)],
        ['down',`Move ${track.title} down`,i===group.length-1,()=>store.move(id,store.language(id),track.id,1)],
        ['edit',`Edit ${track.title}`,false,null],['remove',`Remove ${track.title}`,false,()=>store.remove(id,track.id)]
      ]){const b=iconButton(action,label);b.disabled=busy||disabled;b.onclick=()=>action==='edit'?open(track):transport.mutatePlaylist(fn);tools.appendChild(b);}li.appendChild(tools);list.appendChild(li);
    });
  }
  function render(){
    const id=transport.selected,language=store.language(id),busy=transport.busy,group=store.group(id);
    const key=[id,language,busy,managing,store.revision,audio.indices[id],transport.loaded].join(':');if(key===signature)return;signature=key;
    $('add-song').disabled=busy;$('manage-tracks').disabled=busy;$('manage-tracks').textContent=managing?'Done':'Manage';$('manage-tracks').setAttribute('aria-pressed',String(managing));
    const tabs=$('language-tabs');tabs.replaceChildren();languageTabsConfig.languages.forEach((l,i)=>{const b=document.createElement('button');b.type='button';b.role='tab';b.id=`language-${l.id}`;b.dataset.language=l.id;b.textContent=l.label;b.disabled=busy;b.tabIndex=l.id===language?0:-1;b.setAttribute('aria-selected',String(l.id===language));b.setAttribute('aria-controls','playlist');b.onclick=()=>transport.setLanguage(id,l.id);b.onkeydown=async e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=languageTabsConfig.languages.length,j=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:-1)+n)%n;await transport.setLanguage(id,languageTabsConfig.languages[j].id);$(`language-${languageTabsConfig.languages[j].id}`)?.focus();};tabs.appendChild(b);});
    $('playlist').setAttribute('aria-labelledby',`language-${language}`);renderTrackCarousel(id,group,busy);
    $('source-note').textContent=store.warning||`${group.length} ${languageTabsConfig.languages.find(l=>l.id===language).label} tracks · Saved in this browser`;
  }
  return {render,open,destroy(){cancelMetadata();dialog.remove();}};
}
