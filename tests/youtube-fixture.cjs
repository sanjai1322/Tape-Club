// Deterministic official-API-shaped player for transport regression checks.
module.exports=async page=>page.route('https://www.youtube.com/iframe_api',route=>route.fulfill({contentType:'text/javascript',body:`
window.YT={Player:class {
 constructor(el,options){this.options=options;this.time=0;this.state=5;this.volume=70;this.videoId=options.videoId;this.frame=document.createElement('iframe');this.frame.title='YouTube video player';this.frame.src='about:blank';el.replaceWith(this.frame);window.testYT=this;this.tick=setInterval(()=>{if(this.state===1)this.time+=.1},100);setTimeout(()=>options.events.onReady({target:this}),20)}
 event(state){this.state=state;this.options.events.onStateChange({data:state,target:this})}
 playVideo(){if(window.blockYT){this.options.events.onAutoplayBlocked({target:this});return;}setTimeout(()=>this.event(1),20)}
 pauseVideo(){if(this.state===1||this.state===3)this.event(2)}
 getCurrentTime(){return this.time} getDuration(){return 180} getPlayerState(){return this.state}
 seekTo(t){this.time=t} setVolume(v){this.volume=v}
 destroy(){clearInterval(this.tick);this.frame.remove();this.destroyed=true}
 fail(code){this.options.events.onError({data:code,target:this})}
}};window.onYouTubeIframeAPIReady();` }));
