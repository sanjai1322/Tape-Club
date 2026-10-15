// Regenerates the README cover images in docs/. Start the server first, then:
//   node scripts/cover-shots.cjs        (TEST_URL selects another origin)
const {chromium}=require('playwright');
const path=require('node:path');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
const out=name=>path.resolve('docs',name);

(async()=>{
  const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
  const shoot=async({mode,width,height,mobile=false},steps)=>{
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,colorScheme:mode});
    // Skip the first-visit guide and keep the chosen colour mode.
    await context.addInitScript(m=>{localStorage.setItem('tape-club-visited','1');localStorage.setItem('tape-club-mode',m);},mode);
    const page=await context.newPage();await page.goto(base);
    await page.waitForFunction(()=>window.tapeClub&&!document.getElementById('loading'),{},{timeout:60000});
    await page.evaluate(()=>window.gsap.ticker.lagSmoothing(0));await page.waitForTimeout(3500);await steps(page);await context.close();
  };
  const idle=page=>page.waitForFunction(()=>!tapeClub.transport.busy,{},{timeout:30000});

  await shoot({mode:'dark',width:1440,height:900},async page=>{await page.screenshot({path:out('cover-desktop-dark.jpg'),quality:86});});
  await shoot({mode:'dark',width:1440,height:900},async page=>{
    await page.evaluate(async()=>{await tapeClub.transport.insert();await tapeClub.transport.play();});
    console.log('state',await page.evaluate(()=>tapeClub.transport.state));
    await page.waitForFunction(()=>tapeClub.audio.audioEl.currentTime>1,{},{timeout:60000});await page.waitForTimeout(800);
    await page.locator('.transport').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollTo(0,140));
    await page.screenshot({path:out('cover-playing.jpg'),quality:86});await page.evaluate(()=>tapeClub.transport.pause());
  });
  await shoot({mode:'light',width:1440,height:900},async page=>{
    await page.click('[data-tape="golden"]');await idle(page);await page.mouse.move(5,5);await page.waitForTimeout(3000);
    await page.screenshot({path:out('cover-desktop-light.jpg'),quality:86});
    await page.locator('.music-library').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    await page.screenshot({path:out('cover-record-store.jpg'),quality:86});
  });
  await shoot({mode:'dark',width:390,height:844,mobile:true},async page=>{await page.screenshot({path:out('cover-mobile.jpg'),quality:86});});
  await shoot({mode:'dark',width:1440,height:900},async page=>{await page.click('#help-button');await page.waitForTimeout(400);await page.screenshot({path:out('cover-guide.jpg'),quality:86});});
  await browser.close();console.log('Saved cover images to docs/');
})().catch(e=>{console.error(e);process.exit(1);});
