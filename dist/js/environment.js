import * as THREE from 'three';
export function createStudioEnvironment(pmremGen) {
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color('#f8fafc');

      const planeGeom = new THREE.PlaneGeometry(1, 1);
      const whiteSoftbox = new THREE.MeshBasicMaterial({ color: new THREE.Color(6.5, 6.8, 7.2), side: THREE.DoubleSide });
      const graphiteContrast = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.15, 0.22), side: THREE.DoubleSide });
      const cyanStrip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 6.2, 8.8), side: THREE.DoubleSide });
      const violetStrip = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.8, 2.8, 8.2), side: THREE.DoubleSide });

      const topBox = new THREE.Mesh(planeGeom, whiteSoftbox);
      topBox.scale.set(22, 16, 1);
      topBox.position.set(0, 11, 2);
      topBox.rotation.x = Math.PI / 2;
      envScene.add(topBox);

      const leftDark = new THREE.Mesh(planeGeom, graphiteContrast);
      leftDark.scale.set(14, 14, 1);
      leftDark.position.set(-13, 2, 0);
      leftDark.rotation.y = Math.PI / 2;
      envScene.add(leftDark);

      const rightDark = new THREE.Mesh(planeGeom, graphiteContrast);
      rightDark.scale.set(14, 14, 1);
      rightDark.position.set(13, 2, 0);
      rightDark.rotation.y = -Math.PI / 2;
      envScene.add(rightDark);

      const leftCyan = new THREE.Mesh(planeGeom, cyanStrip);
      leftCyan.scale.set(4, 14, 1);
      leftCyan.position.set(-10, 3, 6);
      leftCyan.rotation.y = Math.PI / 2.5;
      envScene.add(leftCyan);

      const rightViolet = new THREE.Mesh(planeGeom, violetStrip);
      rightViolet.scale.set(4, 14, 1);
      rightViolet.position.set(10, 3, 6);
      rightViolet.rotation.y = -Math.PI / 2.5;
      envScene.add(rightViolet);

      const target=pmremGen.fromScene(envScene,0.035);
      planeGeom.dispose(); [whiteSoftbox,graphiteContrast,cyanStrip,violetStrip].forEach(m=>m.dispose());
      return target;
    }
export function createFloorShadowTexture() {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      const sg = ctx.createRadialGradient(256, 256, 30, 256, 256, 235);
      sg.addColorStop(0.0, 'rgba(15, 23, 42, 0.30)');
      sg.addColorStop(0.55, 'rgba(30, 41, 59, 0.14)');
      sg.addColorStop(0.82, 'rgba(56, 189, 248, 0.05)');
      sg.addColorStop(1.0, 'rgba(245, 246, 248, 0.0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, 512, 512);

      // Subtle front caustic glints under the acrylic front edge
      for (const cx of [120, 210, 310, 395]) {
        const cg = ctx.createRadialGradient(cx, 370, 2, cx, 370, 42);
        cg.addColorStop(0, 'rgba(56, 189, 248, 0.20)');
        cg.addColorStop(0.5, 'rgba(129, 140, 248, 0.10)');
        cg.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, 370, 42, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(c);
    }