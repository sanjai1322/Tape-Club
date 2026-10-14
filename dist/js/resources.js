import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import * as THREE from 'three';
// Include normals, UVs and indices: identical positions alone are insufficient.
export function shareIdenticalGeometry(root){
  const buckets=new Map();
  const arrays=g=>[...Object.keys(g.attributes).sort().map(k=>g.attributes[k].array),...(g.index?[g.index.array]:[])];
  root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,parts=arrays(g);let h=2166136261;
    for(const a of parts){const bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);for(const b of bytes){h^=b;h=Math.imul(h,16777619);}}
    const key=Object.keys(g.attributes).sort().join(',')+':'+h+':'+JSON.stringify(g.groups);
    const candidates=buckets.get(key)||[];
    const same=candidates.find(old=>{const others=arrays(old);return parts.length===others.length&&parts.every((a,i)=>a.constructor===others[i].constructor&&a.length===others[i].length&&a.every((n,j)=>n===others[i][j]));});
    if(same&&same!==g){g.dispose();o.geometry=same;}else if(!same){candidates.push(g);buckets.set(key,candidates);}
  });
}
export function batchStaticDetails(root,interactiveTargets=[]){
  const protectedMeshes=new Set(interactiveTargets);
  root.traverse(group=>{
    if(!group.isGroup)return;
    const byMaterial=new Map();
    for(const child of group.children){
      if(!child.isMesh||Array.isArray(child.material)||protectedMeshes.has(child)||child.userData.action)continue;
      let list=byMaterial.get(child.material);if(!list){list=[];byMaterial.set(child.material,list);}list.push(child);
    }
    for(const [material,meshes] of byMaterial){
      if(meshes.length<2)continue;
      const parts=meshes.map(mesh=>{mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return g.applyMatrix4(mesh.matrix);});
      const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)continue;
      const result=new THREE.Mesh(merged,material);result.name='Batched static details';group.add(result);
      meshes.forEach(mesh=>{group.remove(mesh);mesh.geometry.dispose();});
    }
  });
}
