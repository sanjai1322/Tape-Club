const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const mock=require('./youtube-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),reports=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));await mock(page);
 const idle=()=>page.waitForFunction(()=>window.tapeClub&&!tapeClub.transport.busy,null,{timeout:40000});
 const check=async(name,fn)=>{await fn();reports.push({name,result:'passed'});console.log('PASS',name)};
 try{
 await page.goto('http://127.0.0.1:4173');await idle();await page.evaluate(()=>gsap.ticker.lagSmoothing(0));
 await check('YouTube track plays in this page, inserts cassette and leaves artwork intact',async()=>{
  await page.evaluate(async()=>{const {transport:t,playlistStore:s}=tapeClub;await t.mutatePlaylist(()=>s.addTrackToCassette('cosmic','ta',{sourceType:'youtube',title:'Embedded song',url:'https://youtu.be/M7lc1UVf-VE'}));await t.setLanguage('cosmic','ta')});
  await page.getByRole('button',{name:'Play Embedded song',exact:true}).click();await idle();
  assert.equal(await page.evaluate(()=>tapeClub.transport.state),'playing');assert.equal(await page.locator('#youtube-panel').isVisible(),true);assert.equal(await page.locator('#playlist a').count(),0);assert.equal(page.context().pages().length,1);
  assert.equal(await page.evaluate(()=>tapeClub.audio.audioEl.hasAttribute('src')),false);await page.waitForFunction(()=>tapeClub.audio.media.currentTime>.1);
 });
 await check('pause, resume, seek, skip and volume control the embedded source',async()=>{
  await page.click('#play');await idle();assert.equal(await page.evaluate(()=>testYT.state),2);
  await page.evaluate(()=>{tapeClub.transport.seek(.5);tapeClub.transport.volume(.32)});assert.equal(await page.evaluate(()=>testYT.time),90);assert.equal(await page.evaluate(()=>testYT.volume),32);
  await page.click('#forward');await idle();assert.equal(await page.evaluate(()=>testYT.time),100);
  await page.click('#rewind');await idle();assert.equal(await page.evaluate(()=>testYT.time),90);
  await page.click('#play');await idle();assert.equal(await page.evaluate(()=>testYT.state),1);
 });
 await check('actual video state governs reels; no fabricated frequency analysis',async()=>{
  assert.equal(await page.evaluate(()=>tapeClub.transport.update(.01,1)),1);
  assert.deepEqual(await page.evaluate(()=>tapeClub.audio.getLevelSegments(4,true)),[0,0,0,0]);
  await page.evaluate(()=>testYT.event(3));assert.equal(await page.evaluate(()=>tapeClub.transport.update(.01,1)),0);
  await page.evaluate(()=>testYT.event(2));assert.equal(await page.evaluate(()=>tapeClub.transport.state),'paused');
  await page.evaluate(()=>testYT.event(1));assert.equal(await page.evaluate(()=>tapeClub.transport.state),'playing');
 });
 await check('mixed queue switches between real local audio and YouTube with no overlap',async()=>{
  await page.evaluate(async()=>{const {transport:t,playlistStore:s}=tapeClub;await t.mutatePlaylist(()=>s.addTrackToCassette('cosmic','ta',{sourceType:'generated',generated:'cosmic',title:'Local synth'}));await t.track(1)});await idle();
  assert.equal(await page.locator('#youtube-panel').isVisible(),false);await page.waitForFunction(()=>tapeClub.audio.audioEl.currentTime>.1);
  await page.click('#next');await idle();assert.equal(await page.evaluate(()=>tapeClub.audio.sourceType),'youtube');assert.equal(await page.evaluate(()=>tapeClub.audio.audioEl.paused),true);
  await page.evaluate(()=>testYT.event(0));await idle();assert.equal(await page.evaluate(()=>tapeClub.audio.track.title),'Local synth');
 });
 await check('editing a YouTube URL reloads source while reorder retains identity',async()=>{
  await page.click('#next');await idle();await page.evaluate(()=>tapeClub.transport.mutatePlaylist(()=>{const s=tapeClub.playlistStore,t=s.group('cosmic','ta')[0];s.update('cosmic',t.id,'cosmic','ta',{url:'https://youtu.be/aqz-KE-bpKQ'})}));await idle();assert.equal(await page.evaluate(()=>testYT.videoId),'aqz-KE-bpKQ');
  const before=await page.evaluate(()=>tapeClub.audio.track.id);await page.evaluate(()=>tapeClub.transport.mutatePlaylist(()=>tapeClub.playlistStore.move('cosmic','ta',tapeClub.audio.track.id,1)));await idle();assert.equal(await page.evaluate(()=>tapeClub.audio.track.id),before);
 });
 await check('embedding restriction is visible and recovers by choosing another track',async()=>{
  await page.evaluate(()=>testYT.fail(150));assert.match(await page.locator('#youtube-status').innerText(),/does not allow/);assert.equal(await page.evaluate(()=>tapeClub.transport.state),'paused');await page.click('#next');await idle();await page.click('#play');await idle();assert.equal(await page.evaluate(()=>tapeClub.audio.sourceType),'generated');
 });
 await check('autoplay block leaves manual embedded controls usable',async()=>{
  await page.evaluate(()=>{window.blockYT=true});await page.click('#next');await idle();assert.equal(await page.evaluate(()=>tapeClub.transport.state),'paused');assert.match(await page.locator('#youtube-status').innerText(),/Tap Play/);
  await page.evaluate(()=>{window.blockYT=false;testYT.event(1)});assert.equal(await page.evaluate(()=>tapeClub.transport.state),'playing');
 });
 await check('mobile player meets minimum viewport size with no horizontal overflow',async()=>{
  await page.setViewportSize({width:390,height:844});await page.locator('#youtube-panel').scrollIntoViewIfNeeded();const box=await page.locator('#youtube-mount iframe').boundingBox();assert.ok(box.width>=200&&box.height>=200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'youtube-mobile-preview.png'});
 });
 await check('video controls cannot bypass the open-lid safety state',async()=>{await page.evaluate(()=>tapeClub.transport.lid(true));await idle();await page.evaluate(()=>testYT.event(1));assert.equal(await page.evaluate(()=>testYT.state),2);assert.equal(await page.evaluate(()=>tapeClub.transport.state),'paused');await page.evaluate(()=>tapeClub.transport.lid(false));await idle();await page.click('#play');await idle()});
 await check('eject destroys embedded playback and hides its panel',async()=>{await page.click('#eject');await idle();assert.equal(await page.locator('#youtube-panel').isVisible(),false);assert.equal(await page.evaluate(()=>tapeClub.audio.youtube.player),null);assert.equal(await page.evaluate(()=>tapeClub.transport.state),'empty')});
 assert.deepEqual(errors,[]);
 }finally{fs.writeFileSync('YOUTUBE-RESULTS.json',JSON.stringify({reports,errors,note:'Transport tests use a deterministic IFrame API fixture. Live network check is recorded separately.'},null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
