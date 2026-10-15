import * as THREE from 'three';
import {CASSETTE_FINISH} from './config.js';

/** Add one shared finish to existing materials. Artwork maps are never changed. */
export function applyCassetteFinish(cassette,options={}){
  const theme=cassette.userData.state.themeKey;
  const config={...CASSETTE_FINISH.defaults,...CASSETTE_FINISH.themes[theme],...options};
  const uniforms={time:{value:0},boost:{value:1},pointer:{value:new THREE.Vector2()},activity:{value:0},
    colors:config.colorStops.map(c=>({value:new THREE.Color(c)}))};
  const materials=new Set();cassette.traverse(o=>{if(o.isMesh&&o.material.userData.finishRole)materials.add(o.material);});
  for(const material of materials){
    const role=material.userData.finishRole;
    if(material.isMeshPhysicalMaterial){
      material.roughness=config.roughness;material.clearcoat=1;material.clearcoatRoughness=.1;
      material.envMapIntensity=config.reflectionStrength;material.transmission=config.transmission;
      material.opacity=role==='rim'?Math.min(1,config.opacity+.1):config.opacity;
      material.iridescence=.08; // Palette-controlled foil supplies the dominant colors.
    }
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{uFinishTime:uniforms.time,uFinishBoost:uniforms.boost,uFinishPointer:uniforms.pointer,uFinishActivity:uniforms.activity,uFinishA:uniforms.colors[0],uFinishB:uniforms.colors[1],uFinishC:uniforms.colors[2]});
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFinishLocal; varying vec3 vFinishView; varying vec3 vFinishNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishLocal=position; vFinishView=-(modelViewMatrix*vec4(position,1.)).xyz; vFinishNormal=normalize(normalMatrix*normal);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFinishLocal; varying vec3 vFinishView; varying vec3 vFinishNormal; uniform float uFinishTime; uniform float uFinishBoost; uniform float uFinishActivity; uniform vec2 uFinishPointer; uniform vec3 uFinishA; uniform vec3 uFinishB; uniform vec3 uFinishC;').replace('#include <opaque_fragment>',`
        vec3 finishN=normalize(vFinishNormal),finishV=normalize(vFinishView);
        vec3 finishR=reflect(-finishV,finishN);
        float finishFacing=abs(dot(finishN,finishV));
        float finishEdge=pow(1.-finishFacing,2.2);
        float finishPhase=vFinishLocal.x*.095+vFinishLocal.y*.12+finishR.x*.24+finishR.y*.16+uFinishPointer.x*.16+uFinishPointer.y*.10+uFinishTime*${config.sheenSpeed.toFixed(4)};
        float finishCycle=.5+.5*sin(finishPhase*6.283185);
        vec3 finishColor=mix(mix(uFinishA,uFinishB,smoothstep(0.,.5,finishCycle)),uFinishC,smoothstep(.5,1.,finishCycle));
        float finishWave=abs(sin(finishPhase*3.141593));
        float finishBand=1.-smoothstep(.025,.28+min(fwidth(finishPhase)*2.,.15),finishWave);
        float finishLight=finishEdge*${config.fresnelStrength.toFixed(3)}+finishBand*${(config.reflectionStrength*.23).toFixed(3)};
        outgoingLight+=finishColor*(finishLight+finishBand*finishBand*${config.glowStrength.toFixed(3)})*${(config.sheenIntensity*(role==='label'?config.labelSheen:1)).toFixed(4)}*uFinishBoost*(1.+uFinishActivity*${config.playingPulse.toFixed(3)});
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey=()=>`cassette-finish-v2-${theme}-${role}-${JSON.stringify(config)}`;material.needsUpdate=true;
  }
  let motionTime=0;
  const api={config,uniforms,update(dt,time,state){
    const damp=1-Math.exp(-dt*7);const target=(state.inserted?config.insertedScale:1)+(state.selected&&!state.inserted?config.selectedBoost:0)+(state.hovered?config.hoverBoost:0);
    uniforms.boost.value+=(target-uniforms.boost.value)*damp;
    const interactive=state.hovered||state.selected||state.inspecting;
    uniforms.pointer.value.x+=((interactive?state.pointer.x:0)-uniforms.pointer.value.x)*damp;
    uniforms.pointer.value.y+=((interactive?state.pointer.y:0)-uniforms.pointer.value.y)*damp;
    uniforms.activity.value+=((state.playing?state.activity:0)-uniforms.activity.value)*damp;
    if(!state.reducedMotion)motionTime+=dt*((state.inserted?config.insertedSpeedScale:1)+(state.hovered?config.hoverSpeedBoost:0));
    uniforms.time.value=state.reducedMotion?0:motionTime;
  }};
  cassette.userData.finish=api;return api;
}
