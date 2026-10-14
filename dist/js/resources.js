import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import * as THREE from 'three';
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
