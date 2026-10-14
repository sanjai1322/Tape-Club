import * as THREE from 'three';
export function createRack(){
  const group=new THREE.Group();group.name='Five-slot acrylic rack';
  const glass=new THREE.MeshPhysicalMaterial({color:'#e4e9e8',transparent:true,opacity:.19,roughness:.08,metalness:.08,clearcoat:1,depthWrite:false});
  const edge=new THREE.LineBasicMaterial({color:'#aebfc2',transparent:true,opacity:.43});
  const slots=[];
  function box(w,h,d,x,y,z){const geometry=new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(geometry,glass);m.position.set(x,y,z);group.add(m);const lines=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),edge);lines.position.copy(m.position);group.add(lines);return m;}
  // The full-size tapes sit in staggered, separate U-shaped storage channels.
  for(let i=0;i<5;i++){
    const x=-13+i*2.15,z=1.5-i*2.35;
    box(10.9,.28,1.7,x,.27,z);
    box(.18,1.3,1.7,x-5.35,1.04,z);box(.18,1.3,1.7,x+5.35,1.04,z);
    box(10.9,.65,.14,x,.72,z-.76);box(10.9,.65,.14,x,.72,z+.76);
    slots.push({position:new THREE.Vector3(x,3.66,z),rotation:new THREE.Euler(0,0,0)});
  }
  box(20.5,.22,12.4,-8.7,.08,-3.2);
  return {group,slots};
}
