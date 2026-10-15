// Official visible YouTube embed. No audio extraction or access to its media stream.
let apiPromise;
function loadAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
    const previous=window.onYouTubeIframeAPIReady;
    const timer=setTimeout(()=>fail(),15000);
    function fail(){clearTimeout(timer);script.remove();apiPromise=null;reject(Error('YouTube could not connect. Check your connection and press Play to retry.'));}
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve(window.YT);};script.onerror=fail;document.head.appendChild(script);
  });return apiPromise;
}
const messages={2:'This YouTube link is invalid. Edit the song and check its link.',5:'YouTube could not play this video in this browser. Try another video.',100:'This video is private, removed or unavailable. Choose another song.',101:'The video owner does not allow playback inside websites. Choose another upload or add a licensed audio file.',150:'The video owner does not allow playback inside websites. Choose another upload or add a licensed audio file.',153:'YouTube could not verify this website. Allow the site referrer in your browser and retry.'};
export class YouTubePlayer extends EventTarget{
  constructor(){super();this.player=null;this.active=false;this.state=-1;this.error=null;this.serial=0;this.volume=.7;this.panel=document.getElementById('youtube-panel');this.note=document.getElementById('youtube-status');}
  emit(name){this.dispatchEvent(new Event(name));}
  message(text){this.note.textContent=text;}
  get paused(){return this.state!==1;}
  get ended(){return this.state===0;}
  get readyState(){return this.state===1||this.state===2||this.state===5?4:0;}
  get duration(){return this.active?(this.player?.getDuration?.()||0):0;}
  get currentTime(){return this.active?(this.player?.getCurrentTime?.()||0):0;}
  set currentTime(value){if(!this.active||!this.player)return;const paused=this.paused;this.player.seekTo(Math.max(0,Math.min(this.duration||Infinity,value)),true);if(paused)this.player.pauseVideo();}
  async load(track){
    this.clear();const serial=this.serial;this.active=true;this.error=null;this.panel.hidden=false;document.getElementById('youtube-title').textContent=track.title;this.message('Connecting to YouTube…');
    try{
      const YT=await loadAPI();if(serial!==this.serial)return false;
      await new Promise((resolve,reject)=>{
        const mount=document.createElement('div');document.getElementById('youtube-mount').replaceChildren(mount);
        const timer=setTimeout(()=>reject(Error('YouTube took too long to load. Press Play to retry.')),15000);
        this.cancelLoad=()=>{clearTimeout(timer);resolve();};
        this.player=new YT.Player(mount,{width:'100%',height:'100%',videoId:track.videoId,host:'https://www.youtube-nocookie.com',playerVars:{playsinline:1,controls:1,rel:0,origin:location.origin},events:{
          onReady:()=>{if(serial!==this.serial)return;clearTimeout(timer);this.cancelLoad=null;this.player.setVolume(this.volume*100);this.message('Press Play on the deck or in the video.');resolve();},
          onStateChange:e=>{if(serial!==this.serial||!this.active)return;this.state=e.data;
            if(e.data===1){this.error=null;this.message('Playing here · YouTube');this.emit('playing');}
            else if(e.data===2){this.message('Paused');this.emit('pause');}
            else if(e.data===3){this.message('Buffering…');this.emit('waiting');}
            else if(e.data===0){this.message('Track finished');this.emit('ended');}
          },
          onError:e=>{if(serial!==this.serial)return;this.error=Error(messages[e.data]||'YouTube cannot play this video here. Choose another song.');this.state=2;this.message(this.error.message);clearTimeout(timer);reject(this.error);this.emit('error');},
          onAutoplayBlocked:()=>{if(serial!==this.serial)return;this.state=2;this.message('Tap Play inside the video to allow playback in this browser.');this.emit('blocked');}
        }});
      });return serial===this.serial;
    }catch(error){if(serial===this.serial){this.error=error;this.message(error.message);}throw error;}
  }
  async play(track){
    if(!this.player||this.error)await this.load(track);
    this.panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    if(!this.paused)return;
    return new Promise((resolve,reject)=>{
      const done=error=>{clearTimeout(timer);for(const [name,fn]of listeners)this.removeEventListener(name,fn);this.pendingPlay=null;error?reject(error):resolve();};
      const listeners=[['playing',()=>done(this.paused?Error('Close the cassette lid, then press Play.'):undefined)],['error',()=>done(this.error||Error('YouTube playback failed.'))],['blocked',()=>done(Error('Tap Play inside the video to start this song.'))]];
      const timer=setTimeout(()=>done(Error('Tap Play inside the video. If it is unavailable, choose another song.')),10000);
      this.pendingPlay=()=>done(Error('Playback was cancelled.'));for(const [name,fn]of listeners)this.addEventListener(name,fn);this.player.playVideo();
    });
  }
  pause(){this.player?.pauseVideo?.();if(this.state===1||this.state===3){this.state=2;this.emit('pause');}}
  setVolume(value){this.volume=value;this.player?.setVolume?.(value*100);}
  clear(){this.serial++;this.pendingPlay?.();this.cancelLoad?.();this.cancelLoad=null;this.active=false;this.state=-1;this.player?.destroy?.();this.player=null;this.panel.hidden=true;}
  dispose(){this.clear();}
}
