import * as THREE from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {CASSETTE_THEMES} from './themes.js';
import {createCassette,textureCache,preloadReferenceArtwork} from './cassette.js';
import {applyCassetteFinish} from './cassette-finish.js';
import {PlaylistStore,isPlayable} from './playlist-store.js';
import {createPlaylistUI} from './playlist-ui.js';
import {createPlayer} from './player.js';
import {createRack} from './rack.js';
import {createStudioEnvironment,createFloorShadowTexture} from './environment.js';
import {AudioEngine} from './audio.js';
import {Transport} from './transport.js';
import {batchStaticDetails,shareIdenticalGeometry} from './resources.js';
import {ALBUMS} from './library.js';
import {createMixLink,readMixFromHash,importMix,clearMixHash} from './share.js';
import {languageTabsConfig} from './config.js';
const $=id=>document.getElementById(id),gsap=window.gsap;
const keys=Object.keys(CASSETTE_THEMES);
const descriptions={cosmic:['Dream synth','Soft-focus melodies for somewhere beyond the everyday.'],midnight:['Night drive','Crimson lights. Empty roads. A soundtrack for the way home.'],aqua:['Ocean ambient','Crystal-clear tones from a little below the surface.'],pixel:['Arcade electronica','A pocket of bright, playful energy. One more level.'],golden:['Sunset downtempo','Warm melodies for the part of the day you wish would last.']};
const displayName=id=>CASSETTE_THEMES[id].title.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const progress=(p,text)=>window.tapeLoad?.(p,text);progress(40,'Unpacking the cassettes');
const playlistStore=new PlaylistStore();await playlistStore.restoreFiles();
const audio=new AudioEngine(playlistStore);const finishPointer=new THREE.Vector2();
const finishState={pointer:finishPointer,selected:false,hovered:false,inserted:false,playing:false,inspecting:false,reducedMotion:false,activity:0};
const container=$('canvas-container'),stage=$('stage');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){$('loading').hidden=true;$('error-banner').hidden=false;$('error-banner').textContent='This browser cannot start the 3D room. Enable WebGL or open the site in a current Chrome, Edge, Safari, or Firefox browser.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1.3:1.6));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#f2f3f0',1);container.appendChild(renderer.domElement);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,.3,200);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=16;controls.maxDistance=100;controls.maxPolarAngle=Math.PI*.47;controls.enablePan=false;
const pmrem=new THREE.PMREMGenerator(renderer);const environment=createStudioEnvironment(pmrem);scene.environment=environment.texture;pmrem.dispose();
progress(52,'Lighting the studio');scene.add(new THREE.AmbientLight('#ffffff',1.2));
const keyLight=new THREE.DirectionalLight('#ffffff',2.8);keyLight.position.set(-12,28,16);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-35,right:35,top:25,bottom:-25,near:1,far:90});keyLight.shadow.bias=-.0004;keyLight.shadow.normalBias=.035;keyLight.shadow.radius=4;scene.add(keyLight);
const fill=new THREE.DirectionalLight('#c8dcf7',1.5);fill.position.set(17,12,-9);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshBasicMaterial({color:'#f2f3f0',toneMapped:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.12;scene.add(floor);
const floorShadow=new THREE.Mesh(floor.geometry,new THREE.ShadowMaterial({opacity:.18}));floorShadow.rotation.copy(floor.rotation);floorShadow.position.y=-.11;floorShadow.receiveShadow=true;scene.add(floorShadow);
const contactTexture=createFloorShadowTexture();const contactMaterial=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false,opacity:.6});for(const [x,z,w,d] of [[6.2,5,17,12],[-8.7,-3.2,23,15]]){const contact=new THREE.Mesh(new THREE.PlaneGeometry(w,d),contactMaterial);contact.rotation.x=-Math.PI/2;contact.position.set(x,-.08,z);scene.add(contact);}
const player=createPlayer();player.position.set(6.2,0,5);scene.add(player);
const rack=createRack();scene.add(rack.group);
progress(62,'Printing the labels');await preloadReferenceArtwork();progress(78,'Building the rack');
const tapes={},slots={};keys.forEach((id,i)=>{const tape=createCassette({theme:id,tapeProgress:0});tape.userData.id=id;applyCassetteFinish(tape);tape.position.copy(rack.slots[i].position);tapes[id]=tape;slots[id]=rack.slots[i];scene.add(tape);});
// Deduplicate identical procedural buffer geometries once, including all five
// sets of screws, reels, shell halves and repeated deck fittings.
Object.values(tapes).forEach(t=>batchStaticDetails(t));batchStaticDetails(player,[...player.interactiveTargets,...player.animatedMeshes]);
shareIdenticalGeometry(scene);progress(88,'Warming up the deck');
scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=!o.material.transparent;}});
function applyMode(mode){
  const dark=mode==='dark';document.documentElement.dataset.mode=mode;
  const background=dark?'#14181e':'#f2f3f0';
  floor.material.color.set(background);renderer.setClearColor(background,1);
  keyLight.intensity=dark?2.1:2.8;fill.intensity=dark?1.8:1.5;
  floorShadow.material.opacity=dark?.35:.18;contactMaterial.opacity=dark?.8:.6;
  $('mode-toggle').setAttribute('aria-pressed',String(dark));
  $('mode-toggle').querySelector('span').textContent=dark?'Light mode':'Dark mode';
  document.querySelector('meta[name="theme-color"]').content=background;
}
applyMode(document.documentElement.dataset.mode||'light');
$('mode-toggle').onclick=()=>{const mode=document.documentElement.dataset.mode==='dark'?'light':'dark';applyMode(mode);try{localStorage.setItem('tape-club-mode',mode)}catch{}};
let deckView=false,inspectionView=false,roomPose;
floor.castShadow=false;floor.receiveShadow=false;floorShadow.castShadow=false;floorShadow.receiveShadow=true;
function cameraMove(pos,target,duration=.65){if(matchMedia('(prefers-reduced-motion: reduce)').matches)duration=.08;gsap.to(camera.position,{x:pos.x,y:pos.y,z:pos.z,duration,ease:'power2.inOut',overwrite:true});gsap.to(controls.target,{x:target.x,y:target.y,z:target.z,duration,ease:'power2.inOut',overwrite:true});}
function fitRoom(animate=true){
  // Offset the objects toward the lower half so the introductory type has air.
  const mobile=container.clientWidth<600;
  const target=new THREE.Vector3(-3,3,-.5);const dist=mobile?87:50;
  const pos=target.clone().add(new THREE.Vector3(-.36,.49,.8).normalize().multiplyScalar(dist));roomPose={pos,target};
  if(animate)cameraMove(pos,target);else{camera.position.copy(pos);controls.target.copy(target);controls.update();}
}
function changeView(inspect){inspectionView=inspect;controls.enabled=!inspect;stage.classList.toggle('inspecting',inspect);$('gesture-hint').textContent=inspect?'DRAG TO TURN THE TAPE · ESC TO RETURN':'DRAG TO ORBIT · SCROLL TO ZOOM';if(inspect)cameraMove(new THREE.Vector3(-2,10,38),new THREE.Vector3(-2,8,15));else{deckView=false;fitRoom();}renderUI();}
function showError(message){$('error-banner').textContent=message;$('error-banner').hidden=false;clearTimeout(showError.timer);showError.timer=setTimeout(()=>$('error-banner').hidden=true,10000);}
const transport=new Transport({scene,player,tapes,slots,audio,onChange:()=>renderUI(),onError:showError,resetView:changeView});
const playlistUI=createPlaylistUI({store:playlistStore,audio,transport,displayName,onError:showError});
playlistStore.subscribe(()=>renderUI());
// Lock-screen, notification and headphone controls.
const session=navigator.mediaSession;let sessionTrack=null;
function seekBy(seconds){const d=audio.media.duration;if(d>0)transport.seek(Math.min(1,Math.max(0,audio.getNormalizedProgress()+seconds/d)));}
if(session){const actions={play:()=>transport.play(),pause:()=>transport.pause(),stop:()=>transport.pause(),previoustrack:()=>transport.track(-1),nexttrack:()=>transport.track(1),seekbackward:e=>seekBy(-(e.seekOffset||10)),seekforward:e=>seekBy(e.seekOffset||10),seekto:e=>{const d=audio.media.duration;if(d>0)transport.seek(e.seekTime/d);}};for(const [name,fn] of Object.entries(actions)){try{session.setActionHandler(name,fn);}catch{}}}
function updateMediaSession(state){
  if(!session)return;const track=transport.loaded&&audio.theme===transport.loaded?audio.track:null;
  session.playbackState=state==='playing'?'playing':track?'paused':'none';
  if(track===sessionTrack)return;sessionTrack=track;
  if(!track){session.metadata=null;return;}
  const art=track.sourceType==='youtube'?[{src:track.thumbnail,sizes:'320x180',type:'image/jpeg'}]:[{src:new URL(`../assets/${transport.loaded}.png`,import.meta.url).href,sizes:'1448x1086',type:'image/png'}];
  session.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:`TAPE//CLUB · ${displayName(transport.loaded)}`,artwork:art});
}
function updatePositionState(){const d=audio.media.duration,t=audio.media.currentTime;if(!session?.setPositionState||!transport.loaded||!(d>0)||!Number.isFinite(d))return;try{session.setPositionState({duration:d,position:Math.min(Math.max(0,t||0),d),playbackRate:1});}catch{}}
let renderedPlaylist='',renderedSelection='';const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;function animateSelection(){if(reducedMotion)return;gsap.fromTo(['#selected-art','#selected-title','#selected-genre','#selected-description'],{y:9,opacity:0},{y:0,opacity:1,duration:.5,stagger:.055,ease:'power3.out',overwrite:true});}
const statusNames={empty:'Choose your soundtrack',inserting:'Inserting cassette',ready:'Ready when you are',starting:'Starting audio',playing:'Now playing',paused:'Paused',rewind:'Rewinding',forward:'Fast forwarding',ejecting:'Returning to the shelf',lid:'Moving the lid',track:'Loading track'};
keys.forEach((id,i)=>{const b=document.createElement('button');b.type='button';b.className='cassette-card';b.dataset.tape=id;b.style.setProperty('--accent',CASSETTE_THEMES[id].shellColor);b.innerHTML=`<span class="tape-swatch" aria-hidden="true"><img src="./assets/${id}.png" alt="" draggable="false"></span><span><span class="card-name">${displayName(id)}</span><span class="card-meta">${String(i+1).padStart(2,'0')} / ${descriptions[id][0].toUpperCase()}</span></span>`;b.onclick=()=>transport.select(id);$('cassette-list').appendChild(b);});
document.querySelectorAll('.cassette-card').forEach(card=>{
  card.addEventListener('pointerenter',()=>transport.hover(card.dataset.tape));
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1;finishPointer.set(x,-y);card.style.setProperty('--tilt-x',`${-y*5}deg`);card.style.setProperty('--tilt-y',`${x*7}deg`);});
  card.addEventListener('pointerleave',()=>{transport.hover(null);finishPointer.set(0,0);card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
});
function renderUI(){
  const selected=transport.selected,loaded=transport.loaded,busy=transport.busy,state=transport.state;
  document.querySelectorAll('.cassette-card').forEach(b=>{b.classList.toggle('selected',b.dataset.tape===selected);b.setAttribute('aria-pressed',String(b.dataset.tape===selected));b.disabled=busy;});
  if(renderedSelection!==selected){renderedSelection=selected;$('selected-title').textContent=displayName(selected);$('selected-genre').textContent=`${descriptions[selected][0].toUpperCase()} / ${CASSETTE_THEMES[selected].bpm} BPM`;$('selected-description').textContent=descriptions[selected][1];$('tape-number').textContent=`0${keys.indexOf(selected)+1} / 05`;$('selected-art').style.setProperty('--tape',CASSETTE_THEMES[selected].shellColor);$('selected-label').src=new URL(`../assets/${selected}.png`,import.meta.url).href;$('selected-label').alt=`${displayName(selected)} reference cassette artwork`;document.documentElement.style.setProperty('--selection-accent',CASSETTE_THEMES[selected].shellColor);animateSelection();}
  playlistUI.render();
  $('insert-button').disabled=busy||!!loaded;$('insert-button').firstElementChild.textContent=busy?statusNames[state]:(loaded?(loaded===selected?'Cassette in the deck':'Eject to switch tapes'):'Insert cassette');
  $('inspect-button').disabled=busy||selected===loaded;$('inspect-button').textContent=transport.inspecting?'Return to shelf ↙':'Inspect tape ↗';
  $('status').textContent=statusNames[state];$('play').disabled=busy||!loaded||!isPlayable(audio.track);$('play').classList.toggle('is-playing',state==='playing');$('play').setAttribute('aria-label',state==='playing'?'Pause':'Play');$('playing-dot').classList.toggle('active',state==='playing');updateMediaSession(state);
  ['previous','next','rewind','forward','seek'].forEach(id=>$(id).disabled=busy||!loaded||!isPlayable(audio.track));$('eject').disabled=busy||!loaded;$('lid').disabled=busy||transport.inspecting;$('lid').textContent=transport.lidOpen?'Lid ↓':'Lid ↑';$('rewind').classList.toggle('active',state==='rewind');$('forward').classList.toggle('active',state==='forward');
  document.querySelectorAll('.album-add').forEach(b=>b.disabled=busy);$('upload-button').disabled=busy;$('volume').value=Math.round(audio.volume*100);$('volume-value').textContent=Math.round(audio.volume*100);
  if(loaded&&audio.theme===loaded&&audio.track){$('track-title').textContent=audio.track.title;$('track-artist').textContent=`${displayName(loaded)} · ${audio.track.artist}`;$('attribution').textContent=audio.track.sourceType==='youtube'?'YouTube · embedded playback':audio.track.attribution||'Owner-provided audio';}
  else{$('track-title').textContent=loaded?'No audio in this language.':'The room is yours.';$('track-artist').textContent=loaded?'Add audio or open a YouTube song':'Insert a cassette to begin';$('attribution').textContent='Your local audio stays on your device.';}
}
function formatTime(s){if(!Number.isFinite(s)||s<0)return '0:00';return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
ALBUMS.forEach(album=>{
  const card=document.createElement('article');card.className='album-card';
  card.innerHTML=`<div class="album-cover cover-${album.id}" style="--cover:${album.color}" aria-hidden="true"><span class="cover-kicker">TAPE//CLUB SELECTS</span><div class="cover-graphic"></div><strong>${album.name}</strong><span class="cover-genre">${album.genre.toUpperCase()} / VOL. 01</span></div><div class="album-info"><span class="eyebrow">${album.genre} · ${album.tracks.length} TRACKS</span><h3>${album.name}</h3><p>${album.tracks.map(t=>t.title).join(' / ')}</p></div><button class="album-add" data-album="${album.id}">Add to tape <span aria-hidden="true">＋</span></button>`;
  card.querySelector('button').onclick=()=>transport.mutatePlaylist(()=>{
    const id=transport.selected,language=playlistStore.language(id),list=playlistStore.group(id,language);
    const fresh=album.tracks.filter(t=>!list.some(old=>old.catalogId===t.catalogId));
    if(!fresh.length){$('library-status').textContent=`${album.name} is already in this language group on ${displayName(id)}.`;return;}
    fresh.forEach(t=>playlistStore.addTrackToCassette(id,language,{...t,sourceType:'audio'}));
    $('library-status').textContent=`Added ${fresh.length} tracks from ${album.name} to ${displayName(id)}. Select a track above, insert the cassette and press Play.`;
  });
  $('album-grid').appendChild(card);
});
$('insert-button').onclick=()=>transport.insert();$('eject').onclick=()=>transport.eject();$('play').onclick=()=>transport.state==='playing'?transport.pause():transport.play();$('rewind').onclick=()=>transport.wind('rewind');$('forward').onclick=()=>transport.wind('forward');$('previous').onclick=()=>transport.track(-1);$('next').onclick=()=>transport.track(1);$('lid').onclick=()=>transport.lid(!transport.lidOpen);$('inspect-button').onclick=()=>transport.inspect();
$('seek').oninput=e=>transport.seek(Number(e.target.value)/1000);$('volume').oninput=e=>transport.volume(Number(e.target.value)/100);
$('view-room').onclick=async()=>{if(transport.busy)return;if(transport.inspecting)await transport.inspect(false);deckView=false;fitRoom();$('view-room').classList.add('active');$('view-deck').classList.remove('active');};
$('view-deck').onclick=async()=>{if(transport.busy)return;if(transport.inspecting)await transport.inspect(false);deckView=true;cameraMove(new THREE.Vector3(1,17,24),new THREE.Vector3(6,2,5));$('view-deck').classList.add('active');$('view-room').classList.remove('active');};
function toast(message){const t=$('toast');t.textContent=message;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,4500);}
const languageName=id=>languageTabsConfig.languages.find(l=>l.id===id)?.label||id;
$('share-mix').onclick=async()=>{
  const tape=transport.selected,language=playlistStore.language(tape),{url,count,skipped}=createMixLink(playlistStore,tape,language);
  if(!count){toast('Nothing to share yet: uploaded files stay on your device. Add a YouTube song or a record-store sampler first.');return;}
  const note=skipped?` (${skipped} uploaded file${skipped>1?'s':''} left out)`:'';
  const title=`${displayName(tape)} · ${languageName(language)} mix`;
  try{if(navigator.share&&matchMedia('(pointer: coarse)').matches){await navigator.share({title:`TAPE//CLUB — ${title}`,text:`Listen to my ${title} on TAPE//CLUB`,url});return;}await navigator.clipboard.writeText(url);toast(`Link copied: ${count} song${count>1?'s':''}${note}. Paste it anywhere to share.`);}
  catch(e){if(e?.name==='AbortError')return;window.prompt('Copy this link to share your mix:',url);}
};
const sharedMix=readMixFromHash(keys);
if(sharedMix?.error){showError(sharedMix.error);clearMixHash();}
else if(sharedMix){
  $('mix-invite-title').textContent=`${displayName(sharedMix.tape)} · ${languageName(sharedMix.language)}`;
  $('mix-invite-text').textContent=`${sharedMix.tracks.length} song${sharedMix.tracks.length>1?'s':''}: ${sharedMix.tracks.slice(0,3).map(t=>t.title).join(', ')}${sharedMix.tracks.length>3?'…':''}`;
  $('mix-invite').hidden=false;
  $('mix-dismiss').onclick=()=>{$('mix-invite').hidden=true;clearMixHash();};
  $('mix-accept').onclick=async()=>{
    $('mix-invite').hidden=true;clearMixHash();
    if(transport.loaded&&transport.loaded!==sharedMix.tape)await transport.eject();
    await transport.select(sharedMix.tape);await transport.setLanguage(sharedMix.tape,sharedMix.language);
    let result={added:0,skipped:0};await transport.mutatePlaylist(()=>{result=importMix(playlistStore,sharedMix);});
    toast(result.added?`Added ${result.added} song${result.added>1?'s':''} to ${displayName(sharedMix.tape)}. Press Insert cassette, then Play.`:'You already have every song in this mix.');
  };
}
$('help-button').onclick=()=>$('help').showModal();
// First visit: open the guide once and pulse the Insert button until the first insert.
const firstVisit=(()=>{try{if(localStorage.getItem('tape-club-visited'))return false;localStorage.setItem('tape-club-visited','1');return true;}catch{return false;}})();
if(firstVisit&&!navigator.webdriver){$('insert-button').classList.add('nudge');setTimeout(()=>{if(!document.querySelector('dialog[open]'))$('help').showModal();},1200);}
$('insert-button').addEventListener('click',()=>$('insert-button').classList.remove('nudge'));$('close-help').onclick=()=>$('help').close();$('help').addEventListener('click',e=>{if(e.target===$('help'))$('help').close();});
$('upload-button').onclick=()=>$('audio-upload').click();$('audio-upload').onchange=async e=>{
  const files=Array.from(e.target.files||[]);if(!files.length)return;const theme=transport.selected;
  await transport.run(async()=>{const result=await audio.addFiles(theme,files);if(result.added){audio.indices[theme]=result.start;renderedPlaylist='';if(transport.loaded===theme){audio.pause();player.engage(false);transport.machine.set('track');await audio.load(theme,result.start);transport.machine.set('ready');}renderUI();}if(result.errors.length)showError(result.errors.join(' · '));});e.target.value='';
};
document.addEventListener('keydown',e=>{if($('help').open||$('song-dialog').open||['INPUT','BUTTON','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.key==='Escape'&&transport.inspecting){transport.inspect(false);return;}if(e.code==='Space'){e.preventDefault();transport.state==='playing'?transport.pause():transport.play();}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const d=audio.media.duration;if(d>0)transport.seek(audio.getNormalizedProgress()+(e.key==='ArrowLeft'?-5:5)/d);}});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let drag=null;
function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...Object.values(tapes),...player.interactiveTargets],true);for(const h of hits){let o=h.object;while(o){if(o.userData.action)return {action:o.userData.action};if(o.userData.id)return {id:o.userData.id};o=o.parent;}}return null;}
renderer.domElement.addEventListener('pointermove',e=>{const r=renderer.domElement.getBoundingClientRect();finishPointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);});
renderer.domElement.addEventListener('pointerdown',e=>{if(transport.busy)return;const h=hit(e);drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,hit:h,moved:false,mode:transport.inspecting?'inspect':h?.action==='volumeKnob'?'volume':h?.id===transport.selected&&h.id!==transport.loaded?'tape':'orbit',volume:audio.volume};if(drag.mode!=='orbit')controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);},true);
renderer.domElement.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id){const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(drag.mode==='tape'&&drag.moved&&!transport.busy){drag.mode='pending';const activeDrag=drag;transport.inspect(true).then(()=>{if(drag===activeDrag)drag.mode='inspect';});}if(drag.mode==='inspect'&&!transport.busy){const tape=tapes[transport.selected];tape.rotation.y+=dx*.012;tape.rotation.x+=dy*.012;}if(drag.mode==='volume')transport.volume(THREE.MathUtils.clamp(drag.volume+(drag.y-e.clientY)/140,0,1));drag.lastX=e.clientX;drag.lastY=e.clientY;return;}if(!transport.busy&&!transport.inspecting){const h=hit(e);transport.hover(h?.id||null);container.style.cursor=h?'pointer':'grab';}});
function release(e){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;controls.enabled=!transport.inspecting;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(e.type==='pointercancel'||d.moved||transport.busy)return;const h=d.hit;if(h?.id&&h.id!==transport.loaded)transport.select(h.id);const actions={play:()=>transport.state==='playing'?transport.pause():transport.play(),pause:()=>transport.pause(),rew:()=>transport.wind('rewind'),ff:()=>transport.wind('forward'),eject:()=>transport.eject()};actions[h?.action]?.();}
renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);renderer.domElement.addEventListener('lostpointercapture',()=>{drag=null;controls.enabled=!transport.inspecting;});renderer.domElement.addEventListener('pointerleave',()=>{if(!drag)transport.hover(null);});
const resizeObserver=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(!inspectionView&&!deckView)fitRoom(false);});resizeObserver.observe(container);
const vc=$('visualizer').getContext('2d');let raf=0,last=0,elapsed=0,lastUI=0;
function frame(now){raf=requestAnimationFrame(frame);if(document.hidden){last=now;return;}const dt=Math.min((now-last)/1000||0,.05);last=now;elapsed+=dt;const speed=transport.update(dt,elapsed);controls.update();
  finishState.reducedMotion=reducedMotion;finishState.activity=(audio.freqData[1]+audio.freqData[2]+audio.freqData[3])/765;
  for(const id of keys){finishState.selected=id===transport.selected;finishState.hovered=id===transport.hovered;finishState.inserted=id===transport.loaded;finishState.playing=finishState.inserted&&speed===1;finishState.inspecting=finishState.selected&&transport.inspecting;tapes[id].userData.finish.update(dt,elapsed,finishState);}
  renderer.render(scene,camera);
  if(now-lastUI>80){lastUI=now;const media=audio.media;$('elapsed').textContent=transport.loaded?formatTime(media.currentTime):'0:00';$('duration').textContent=transport.loaded?formatTime(media.duration):'0:00';if(now-(updatePositionState.last||0)>1000){updatePositionState.last=now;updatePositionState();}if(document.activeElement!==$('seek'))$('seek').value=transport.loaded?Math.round(audio.getNormalizedProgress()*1000):0;
    vc.clearRect(0,0,220,34);const levels=audio.getLevelSegments(25,speed===1);vc.fillStyle=speed===1?'#8d82b0':'#c9cfc3';for(let i=0;i<25;i++){const h=speed===1?2+levels[i%levels.length]*30:2;vc.fillRect(i*9,34-h,3,h);}
  }
}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();audio.pause();cancelAnimationFrame(raf);showError('The graphics session was interrupted. Reload the page to restore the room.');});
// Audio files keep playing in the background (lock screen, other tabs) so the Media Session
// controls work; YouTube embeds and tape winding still pause while hidden.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(['rewind','forward'].includes(transport.state)||(transport.state==='playing'&&audio.sourceType==='youtube')))transport.pause();last=performance.now();});
fitRoom(false);transport.select('cosmic');transport.volume(.7);renderUI();renderer.compile(scene,camera);progress(100,'Ready');$('loading').classList.add('done');setTimeout(()=>$('loading')?.remove(),reducedMotion?0:450);if(!reducedMotion){gsap.fromTo('.stage-heading > *',{y:14,opacity:0},{y:0,opacity:1,duration:.85,stagger:.09,ease:'power3.out'});gsap.fromTo('.cassette-card',{y:12,opacity:0},{y:0,opacity:1,duration:.6,stagger:.065,delay:.15,ease:'power3.out'});}raf=requestAnimationFrame(frame);
let disposed=false;function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();controls.dispose();audio.dispose();playlistStore.dispose();playlistUI.destroy();gsap.globalTimeline.clear();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{materials.add(m);Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});});});textureCache.forEach(t=>Object.values(t).forEach(v=>textures.add(v)));geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();}
window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();});
// Diagnostics for the included browser regression tests and debugging.
window.tapeClub={transport,audio,playlistStore,playlistUI,scene,player,tapes,slots,camera,renderer,controls,dispose,snapshot:()=>({state:transport.state,busy:transport.busy,loaded:transport.loaded,selected:transport.selected,lidOpen:transport.lidOpen,inspecting:transport.inspecting,tapeCount:Object.keys(tapes).length,geometryCount:renderer.info.memory.geometries,textures:renderer.info.memory.textures,calls:renderer.info.render.calls})};
