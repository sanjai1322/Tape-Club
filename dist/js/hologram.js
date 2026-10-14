// Shared time uniform: no extra passes, render targets, or geometry allocations.
export const hologramTime={value:0};
export function holographicSheen(material,strength=1){
  material.onBeforeCompile=shader=>{
    shader.uniforms.uHoloTime=hologramTime;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vHoloLocal;\nvarying vec3 vHoloView;\nvarying vec3 vHoloNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHoloLocal = position;\nvHoloView = -(modelViewMatrix * vec4(position,1.0)).xyz;\nvHoloNormal = normalize(normalMatrix * normal);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vHoloLocal;\nvarying vec3 vHoloView;\nvarying vec3 vHoloNormal;\nuniform float uHoloTime;').replace('#include <opaque_fragment>',`
      float holoFacing = abs(dot(normalize(vHoloNormal),normalize(vHoloView)));
      float holoEdge = pow(1.0-holoFacing,2.2);
      float holoPhase = vHoloLocal.x*.105 + vHoloLocal.y*.14 + (1.0-holoFacing)*1.4 + normalize(vHoloView).x*.6 + uHoloTime*.055;
      vec3 holoSpectrum = .5 + .5*cos(6.283185*(holoPhase+vec3(.0,.33,.67)));
      float holoBand = pow(max(0.0,sin(holoPhase*6.283185)),28.0);
      float foilGrain = fract(sin(dot(floor(vHoloLocal.xy*125.0),vec2(127.1,311.7)))*43758.5453);
      float foilGlint = pow(foilGrain,65.0)*holoBand;
      outgoingLight += (holoSpectrum*(holoEdge*.42+holoBand*.28)+vec3(foilGlint*.9))*${strength.toFixed(2)};
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>`tape-holo-${strength}`;
}
