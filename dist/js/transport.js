import * as THREE from 'three';
import {TransportState} from './state.js';
import {isPlayable} from './playlist-store.js';
const gsap=window.gsap;
export class Transport {
  constructor({scene,player,tapes,slots,audio,onChange,onError,resetView}) {
    Object.assign(this,{scene,player,tapes,slots,audio,onChange,onError,resetView});
    this.machine=new TransportState(state=>{const tape=this.tape;if(tape){tape.userData.setPlaying(state==='playing');if(!['playing','rewind','forward'].includes(state)){tape.userData.state.leftRPM=0;tape.userData.state.rightRPM=0;}}onChange?.();});this.loaded=null;this.selected='cosmic';this.lidOpen=false;this.inspecting=false;this.hovered=null;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.audioReady=false;
    audio.audioEl.addEventListener('waiting',()=>this.audioReady=false);
    audio.audioEl.addEventListener('playing',()=>this.audioReady=true);
    audio.audioEl.addEventListener('pause',()=>{this.audioReady=false;if(!this.busy&&this.state==='playing'){this.machine.set('paused');player.engage(false);}});
    audio.audioEl.addEventListener('error',()=>{this.audioReady=false;if(!this.busy&&this.loaded){this.audio.pause();this.machine.set('paused');this.onError('This track could not play. Choose another track or add a supported audio file.');}});
    audio.audioEl.addEventListener('ended',()=>{this.audioReady=false;if(!this.busy)this.track(1,true);});
  }
  get state(){return this.machine.value;} get busy(){return this.machine.busy;}
  get tape(){return this.loaded?this.tapes[this.loaded]:null;}
  async run(fn){try{return await this.machine.run(fn);}catch(e){this.audio.pause();this.player.engage(false);if(this.state==='starting'||this.state==='track')this.machine.set('paused');this.onError(e.message);return false;}}
  tween(target,vars){return new Promise(resolve=>gsap.to(target,{...vars,duration:this.reduced?.08:(vars.duration||.6),overwrite:true,onComplete:resolve}));}
  async lid(open){if(this.busy||this.inspecting)return false;return this.run(async()=>{this.audio.pause();this.player.engage(false);this.machine.set('lid');await this.setLid(open);this.machine.set(this.loaded?'paused':'empty');});}
  async setLid(open){if(this.lidOpen===open)return;await this.tween(this.player.lidPivotGroup.rotation,{x:open?this.player.OPEN_LID_ANGLE:0,duration:.65,ease:'power2.inOut'});this.lidOpen=open;this.audio.playMechanicalClick(150);}
  rest(id){const slot=this.slots[id];return {x:slot.position.x,y:slot.position.y+(id===this.selected?.65:0),z:slot.position.z};}
  async select(id){if(this.busy)return false;if(this.inspecting)await this.inspect(false);if(this.busy)return false;this.selected=id;this.hovered=null;Object.entries(this.tapes).forEach(([key,t])=>{if(key!==this.loaded)this.tween(t.position,{...this.rest(key),duration:.3,ease:'power2.out'});});this.onChange();return true;}
  hover(id){if(this.busy||this.inspecting||(id&&id===this.loaded))return;if(id===this.hovered)return;this.hovered=id;Object.entries(this.tapes).forEach(([key,t])=>{if(key!==this.loaded)gsap.to(t.position,{y:this.slots[key].position.y+(key===this.selected ? .65:0)+(key===id ? .45:0),duration:this.reduced ? .08:.25,overwrite:true});});}
  async inspect(open=!this.inspecting){if(this.busy||this.selected===this.loaded)return false;return this.run(()=>this.setInspection(open));}
  async setInspection(open){
    if(open===this.inspecting)return;const tape=this.tapes[this.selected];gsap.killTweensOf(tape.position);gsap.killTweensOf(tape.rotation);
    if(open){await this.tween(tape.position,{y:16,duration:.4,ease:'power2.inOut'});await this.tween(tape.position,{x:-2,y:8,z:15,duration:.55,ease:'power2.inOut'});this.inspecting=true;}
    else{await Promise.all([this.tween(tape.position,{y:16,duration:.3}),this.tween(tape.rotation,{x:0,y:0,z:0,duration:.3})]);await this.tween(tape.position,{x:this.slots[this.selected].position.x,z:this.slots[this.selected].position.z,duration:.55,ease:'power2.inOut'});await this.tween(tape.position,{...this.rest(this.selected),duration:.35,ease:'power2.inOut'});this.inspecting=false;}
    this.onChange();this.resetView(open);
  }
  async insert(){if(this.busy||this.loaded)return false;return this.run(async()=>{
    await this.setInspection(false);this.machine.set('inserting');this.hovered=null;
    const id=this.selected,tape=this.tapes[id];gsap.killTweensOf(tape.position);gsap.killTweensOf(tape.rotation);
    this.audio.ensureContext().catch(()=>{});await this.setLid(true);
    // Lift clear of all storage walls, travel through the empty front corridor,
    // flatten above the lid's full swept envelope, then descend inside the bay.
    await this.tween(tape.position,{y:16,duration:.5,ease:'power2.inOut'});
    await this.tween(tape.position,{x:this.player.position.x,z:15,duration:.7,ease:'power2.inOut'});
    await this.tween(tape.rotation,{x:-Math.PI/2,y:0,z:0,duration:.4,ease:'power2.inOut'});
    const seat=this.player.localToWorld(this.player.insertion.position.clone());
    await this.tween(tape.position,{x:seat.x,z:seat.z,duration:.65,ease:'power2.inOut'});
    await this.tween(tape.position,{y:seat.y,duration:.55,ease:'power2.inOut'});
    this.loaded=id;this.player.attach(tape);await this.setLid(false);this.audio.playMechanicalClick(135);
    this.machine.set('ready');const queue=this.audio.store?.playableIndices(id)||this.audio.playlists[id].map((_,i)=>i);const chosen=queue.includes(this.audio.indices[id])?this.audio.indices[id]:queue[0];if(chosen===undefined)this.audio.clear(id);else await this.audio.load(id,chosen);this.onChange();return true;
  });}
  async eject(){if(this.busy||!this.loaded)return false;return this.run(async()=>{
    this.audio.pause();this.player.engage(false);this.machine.set('ejecting');await this.setInspection(false);await this.setLid(true);
    const id=this.loaded,tape=this.tape;this.scene.attach(tape);
    await this.tween(tape.position,{y:16,duration:.5,ease:'power2.inOut'});
    await this.tween(tape.position,{z:15,duration:.55,ease:'power2.inOut'});
    await this.tween(tape.rotation,{x:0,y:0,z:0,duration:.4,ease:'power2.inOut'});
    await this.tween(tape.position,{x:this.slots[id].position.x,z:this.slots[id].position.z,duration:.75,ease:'power2.inOut'});
    this.loaded=null;await this.tween(tape.position,{...this.rest(id),duration:.5,ease:'power2.inOut'});
    await this.setLid(false);this.machine.set('empty');return true;
  });}
  async play(){if(this.busy||!this.loaded||!isPlayable(this.audio.track))return false;return this.run(async()=>{
    // Unlock audio during the user gesture, before waiting for mechanical motion.
    await this.audio.ensureContext();await this.setInspection(false);await this.setLid(false);this.machine.set('starting');
    try{await this.audio.play();this.audioReady=true;this.machine.set('playing');this.player.engage(true);return true;}
    catch(e){this.machine.set('paused');throw Error(e.name==='NotAllowedError'?'Press Play again to allow audio in this browser.':'This audio could not play. Select another track or add a supported audio file.');}
  });}
  pause(){if(this.busy||!this.loaded)return false;this.audio.pause();this.machine.set('paused');this.player.engage(false);return true;}
  async wind(direction){if(this.busy||!this.loaded||!isPlayable(this.audio.track))return false;if(this.state===direction)return this.pause();return this.run(async()=>{this.audio.pause();await this.setLid(false);this.machine.set(direction);this.player.engage(false);return true;});}
  seek(p){if(this.busy||!this.loaded)return;this.audio.seekNormalized(p);this.tape.userData.setTapeProgress(p);}
  volume(v){this.audio.setVolume(v);this.player.volumeKnobGroup.rotation.z=THREE.MathUtils.degToRad(135-v*270);this.onChange();}
  async track(delta,fromEnd=false){if(this.busy||!this.loaded)return false;const queue=this.audio.store?.playableIndices(this.loaded)||this.audio.list.flatMap((t,i)=>isPlayable(t)?[i]:[]);if(!queue.length)return false;const position=queue.indexOf(this.audio.index);const i=queue[(Math.max(0,position)+delta+queue.length)%queue.length];return this.chooseTrack(this.loaded,i,fromEnd||this.state==='playing');}
  async chooseTrack(theme,index,autoplay=false){
    if(this.busy||!isPlayable(this.audio.playlists[theme]?.[index]))return false;this.audio.ensureContext().catch(()=>{});
    if(!this.loaded){this.audio.indices[theme]=index;this.onChange();return true;}
    if(theme!==this.loaded){this.audio.indices[theme]=index;this.onChange();return true;}
    return this.run(async()=>{const resume=autoplay||this.state==='playing';this.audio.pause();this.player.engage(false);this.machine.set('track');await this.audio.load(theme,index);this.machine.set('ready');if(resume){this.machine.set('starting');await this.audio.play();this.audioReady=true;this.machine.set('playing');this.player.engage(true);}return true;});
  }
  async setLanguage(id,language){
    if(this.busy)return false;return this.run(async()=>{
      this.audio.store.setLanguage(id,language);const queue=this.audio.store.playableIndices(id);const index=queue[0];
      if(this.loaded===id){this.audio.pause();this.player.engage(false);this.machine.set('track');if(index===undefined)this.audio.clear(id);else await this.audio.load(id,index);this.machine.set('ready');}
      else this.audio.indices[id]=index??-1;
    });
  }
  // All edits keep transport identity by track ID, never by a stale array index.
  async mutatePlaylist(operation){if(this.busy)return false;return this.run(async()=>{
    const audio=this.audio,old=audio.track?{...audio.track}:null;
    const chosen=Object.fromEntries(Object.entries(audio.playlists).map(([id,list])=>[id,list[audio.indices[id]||0]?.id]));
    const result=await operation();
    for(const id of Object.keys(audio.playlists)){const found=audio.playlists[id].findIndex(t=>t.id===chosen[id]);audio.indices[id]=found>=0?found:(audio.store.playableIndices(id)[0]??-1);}
    if(this.loaded&&(!old||!audio.track||audio.track.id!==old.id||audio.track.src!==old.src||audio.track.generated!==old.generated||audio.track.language!==audio.store.language(this.loaded)||!isPlayable(audio.track))){
      audio.pause();this.player.engage(false);this.machine.set('track');const index=audio.store.playableIndices(this.loaded)[0];if(index===undefined)audio.clear(this.loaded);else await audio.load(this.loaded,index);this.machine.set('ready');
    }
    this.onChange();return result;
  });}
  update(dt,time){
    let speed=0;const media=this.audio.audioEl;
    if(this.loaded){
      if(this.state==='playing'&&!media.paused&&!media.ended&&media.readyState>=3&&this.audioReady&&this.audio.ctx?.state==='running')speed=1;
      if(this.state==='rewind'||this.state==='forward'){
        const dir=this.state==='rewind'?-1:1;speed=dir*6.5;
        if(Number.isFinite(media.duration)){media.currentTime=Math.max(0,Math.min(media.duration,media.currentTime+dir*dt*8));if(media.currentTime<=0||media.currentTime>=media.duration)this.pause();}
      }
      this.tape.userData.setTapeProgress(this.audio.getNormalizedProgress());
    }
    this.player.update(dt,time,this.tape,speed,this.audio.getLevelSegments(10,speed===1));
    ['play','rew','ff'].forEach((key,i)=>{const active=[speed===1,this.state==='rewind',this.state==='forward'][i];if(this.player.userData[key]!==active){this.player.key(key,active);this.player.userData[key]=active;}});
    return speed;
  }
}
