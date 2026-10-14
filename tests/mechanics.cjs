const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});
 try{
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.tapeClub);
  const result=await page.evaluate(async()=>{
   const THREE=await import('/vendor/three.module.js');const {OBB}=await import('/vendor/OBB.js');
   const {transport:t,scene,player,tapes}=tapeClub;
   const cassetteBounds=new THREE.Box3(new THREE.Vector3(-5,-3.175,-.63),new THREE.Vector3(5,3.175,.63));
   const lidMeshes=[];player.lidPivotGroup.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();lidMeshes.push(o);}});
   let samples=0;const collisions=[];
   const movingBox=()=>new OBB().fromBox3(cassetteBounds).applyMatrix4(tapes[t.loaded||t.selected].matrixWorld);
   function check(){scene.updateMatrixWorld(true);const tape=tapes[t.loaded||t.selected];const box=movingBox();
    for(const mesh of lidMeshes){const lid=new OBB().fromBox3(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);if(box.intersectsOBB(lid,1e-6))collisions.push({tape:tape.userData.id,object:'lid',position:tape.position.toArray()});}
    for(const other of Object.values(tapes)){if(other===tape)continue;const o=new OBB().fromBox3(cassetteBounds).applyMatrix4(other.matrixWorld);if(box.intersectsOBB(o,1e-6))collisions.push({tape:tape.userData.id,object:other.userData.id});}samples++;
   }
   t.tween=async(target,vars)=>{
    const properties=['x','y','z'].filter(k=>Number.isFinite(vars[k]));const start=Object.fromEntries(properties.map(k=>[k,target[k]]));
    for(let i=0;i<=100;i++){for(const k of properties)target[k]=start[k]+(vars[k]-start[k])*i/100;check();}
   };
   // Stop any selection hover tweens before deterministic path sampling.
   window.gsap.globalTimeline.clear();
   for(const id of Object.keys(tapes)){t.selected=id;await t.insert();await t.eject();}
   return {samples,collisions:collisions.slice(0,20),collisionCount:collisions.length};
  });
  fs.writeFileSync('MECHANICS-RESULTS.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.collisionCount)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
