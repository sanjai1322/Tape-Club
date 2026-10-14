const {chromium}=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});const results=[];
try{
 const p=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await p.waitForFunction(()=>window.tapeClub);await p.evaluate(()=>window.gsap.ticker.lagSmoothing(0));
 await p.click('#insert-button');await p.waitForFunction(()=>!tapeClub.transport.busy);
 async function point(action){return p.evaluate(action=>{const o=tapeClub.player.interactiveTargets.find(o=>o.userData.action===action),v=o.position.clone();o.getWorldPosition(v);v.project(tapeClub.camera);const r=tapeClub.renderer.domElement.getBoundingClientRect();return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2};},action);}
 let a=await point('play');await p.mouse.click(a.x,a.y);await p.waitForFunction(()=>tapeClub.transport.state==='playing');results.push('3D PLAY key starts actual audio');
 a=await point('pause');await p.mouse.click(a.x,a.y);await p.waitForFunction(()=>tapeClub.transport.state==='paused');results.push('3D PAUSE key stops actual audio');
 a=await point('volumeKnob');await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(a.x,a.y-35,{steps:6});await p.mouse.up();assert.ok(await p.evaluate(()=>tapeClub.audio.volume)>.85);results.push('3D volume knob drag updates audio gain');
 a=await point('eject');await p.mouse.click(a.x,a.y);await p.waitForFunction(()=>!tapeClub.transport.busy&&tapeClub.transport.loaded===null);results.push('3D EJECT key returns tape');
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),m=await c.newPage();
 await m.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await m.waitForFunction(()=>window.tapeClub);await m.evaluate(()=>window.gsap.ticker.lagSmoothing(0));await m.locator('#inspect-button').tap();await m.waitForFunction(()=>tapeClub.transport.inspecting&&!tapeClub.transport.busy);
 const r=await m.locator('#canvas-container').boundingBox();const start={x:r.x+r.width*.4,y:r.y+r.height*.6};const before=await m.evaluate(()=>tapeClub.tapes.cosmic.rotation.y);const client=await c.newCDPSession(m);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+i*12,y:start.y+i*2,id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(Math.abs(await m.evaluate(()=>tapeClub.tapes.cosmic.rotation.y)-before)>.8);results.push('Actual touch drag rotates the inspected cassette');
 await m.screenshot({path:'inspection-preview.png',fullPage:true});assert.deepEqual(errors,[]);fs.writeFileSync('CONTROLS-RESULTS.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
