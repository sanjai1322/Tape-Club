// Optional network smoke check; availability depends on YouTube, the video and network.
const {chromium}=require('playwright'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(/youtube|googlevideo|ytimg/.test(r.url()))requests.push({url:r.url().slice(0,150),failure:r.failure()?.errorText})});
 let report;
 try{
  await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.tapeClub&&!tapeClub.transport.busy);await page.evaluate(()=>gsap.ticker.lagSmoothing(0));
  await page.evaluate(async()=>{const {transport:t,playlistStore:s}=tapeClub;await t.mutatePlaylist(()=>s.addTrackToCassette('cosmic','ta',{sourceType:'youtube',title:'YouTube API demonstration',url:'https://youtu.be/M7lc1UVf-VE'}));await t.setLanguage('cosmic','ta')});
  await page.getByRole('button',{name:'Play YouTube API demonstration',exact:true}).click();await page.waitForFunction(()=>!tapeClub.transport.busy,null,{timeout:50000});
  try{await page.waitForFunction(()=>tapeClub.audio.media.currentTime>1&&!tapeClub.audio.media.paused,null,{timeout:15000})}catch{}
  report=await page.evaluate(()=>({state:tapeClub.transport.state,actualPlayback:!tapeClub.audio.media.paused&&tapeClub.audio.media.currentTime>1,currentTime:tapeClub.audio.media.currentTime,playerMessage:document.querySelector('#youtube-status').textContent,iframe:document.querySelector('#youtube-mount iframe')?.src,iframeText:null}));
  const frame=page.frames().find(f=>/youtube.*embed/.test(f.url()));if(frame)report.iframeText=(await frame.locator('body').innerText().catch(()=>'' )).slice(0,1000);
  await page.locator('#youtube-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'tests/results/screenshots/youtube-live-preview.png'});
 }catch(e){report={failure:e.message}}
 finally{report={...report,errors,requests};fs.writeFileSync('tests/results/YOUTUBE-LIVE-RESULTS.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
