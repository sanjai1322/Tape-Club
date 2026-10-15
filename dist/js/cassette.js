import * as THREE from 'three';
import { CASSETTE_THEMES } from './themes.js';
    const textureCache = new Map();
    const referenceImages = new Map();
    export async function preloadReferenceArtwork() {
      await Promise.all(Object.keys(CASSETTE_THEMES).map(async id=>{
        const image=new Image();image.src=new URL(`../assets/${id}.png`,import.meta.url).href;
        // decode() can stall in background tabs; onload always fires, and decode is only a head start.
        try{await new Promise((resolve,reject)=>{if(image.complete&&image.naturalWidth)resolve();else{image.onload=resolve;image.onerror=reject;}});
          await Promise.race([image.decode().catch(()=>{}),new Promise(r=>setTimeout(r,1200))]);referenceImages.set(id,image);}
        catch{console.warn(`Using procedural artwork for ${id}`);}
      }));
    }

    function getCassetteTextures(themeKey = 'cosmic') {
      if (textureCache.has(themeKey)) return textureCache.get(themeKey);

      const width = 1600;
      const height = 696;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.fillStyle = 'rgb(30, 30, 30)';
      mCtx.fillRect(0, 0, width, height);

      function drawStar(cx, cy, r, color = '#ffffff') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = color;
        for (let i = 0; i < 2; i++) {
          ctx.save();
          ctx.rotate(i * Math.PI * 0.5);
          ctx.beginPath();
          ctx.moveTo(-r, 0);
          ctx.quadraticCurveTo(0, -r * 0.14, 0, -r * 0.14);
          ctx.lineTo(r, 0);
          ctx.quadraticCurveTo(0, r * 0.14, 0, r * 0.14);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        mCtx.fillStyle = 'rgb(255, 255, 180)';
        mCtx.beginPath();
        mCtx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        mCtx.fill();
      }

      if (themeKey === 'cosmic') {
        // COSMIC DREAMS: Nebula, Ringed Planet, Checkers, Cyan-Violet Holo Typography
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0.0, '#1e1b4b');
        bg.addColorStop(0.45, '#3b277a');
        bg.addColorStop(0.8, '#4c1d95');
        bg.addColorStop(1.0, '#2e1065');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Dreamy pastel clouds on left & right
        for (let i = 0; i < 28; i++) {
          const cx = i < 16 ? (i * 28) % 390 : 1220 + ((i * 43) % 360);
          const cy = 240 + ((i * 59) % 410);
          const r = 45 + (i % 5) * 18;
          const cg = ctx.createRadialGradient(cx, cy - r * 0.2, 4, cx, cy, r);
          cg.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
          cg.addColorStop(0.5, 'rgba(192, 132, 252, 0.52)');
          cg.addColorStop(1, 'rgba(76, 29, 149, 0)');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ringed Planet on top-right
        const px = 1325, py = 185, pr = 112;
        const pg = ctx.createRadialGradient(px - 35, py - 30, 12, px, py, pr);
        pg.addColorStop(0, '#fef9c3');
        pg.addColorStop(0.45, '#67e8f9');
        pg.addColorStop(0.8, '#6366f1');
        pg.addColorStop(1, '#312e81');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.38);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.88)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, pr * 1.75, pr * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Typography: COSMIC DREAMS
        ctx.save();
        const tg = ctx.createLinearGradient(200, 60, 950, 230);
        tg.addColorStop(0, '#e0f2fe');
        tg.addColorStop(0.35, '#67e8f9');
        tg.addColorStop(0.7, '#c4c9ff');
        tg.addColorStop(1, '#a5f3fc');
        ctx.fillStyle = tg;
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 8;
        ctx.font = 'italic 900 105px "Orbitron", sans-serif';
        ctx.strokeText('COSMIC', 240, 138);
        ctx.fillText('COSMIC', 240, 138);

        ctx.font = 'italic 800 76px "Exo 2", sans-serif';
        ctx.strokeText('DREAMS', 310, 215);
        ctx.fillText('DREAMS', 310, 215);
        ctx.restore();

        mCtx.fillStyle = 'rgb(255, 220, 255)';
        mCtx.fillRect(210, 45, 820, 190);

        drawStar(195, 455, 38);
        drawStar(1440, 250, 42);
        drawStar(1125, 165, 32);
      } else if (themeKey === 'midnight') {
        // MIDNIGHT DRIVE: Dark Cyberpunk Highway, Red Planet, Chrome-Red Typography
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#070609');
        bg.addColorStop(0.55, '#19080d');
        bg.addColorStop(1, '#090406');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Red planet on right
        const px = 1420, py = 225, pr = 148;
        const pg = ctx.createRadialGradient(px - 50, py - 20, 15, px, py, pr);
        pg.addColorStop(0, '#ef4444');
        pg.addColorStop(0.45, '#7f1d1d');
        pg.addColorStop(1, '#090406');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();

        // Neon red highway lines
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        for (let i = -5; i <= 5; i++) {
          ctx.beginPath();
          ctx.moveTo(800, 435);
          ctx.lineTo(800 + i * 220, height);
          ctx.stroke();
        }

        // Typography: MIDNIGHT DRIVE
        ctx.save();
        const cg = ctx.createLinearGradient(0, 45, 0, 145);
        cg.addColorStop(0, '#ffffff');
        cg.addColorStop(0.5, '#cbd5e1');
        cg.addColorStop(0.55, '#ef4444');
        cg.addColorStop(1, '#fecaca');
        ctx.fillStyle = cg;
        ctx.font = 'italic 900 94px "Orbitron", sans-serif';
        ctx.fillText('MIDNIGHT', 280, 134);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'italic 900 84px "Exo 2", sans-serif';
        ctx.fillText('DRIVE', 520, 215);
        ctx.restore();

        mCtx.fillStyle = 'rgb(255, 160, 160)';
        mCtx.fillRect(260, 45, 860, 185);
        drawStar(285, 118, 42, '#fecaca');
        drawStar(1415, 225, 44, '#fecaca');
      } else if (themeKey === 'aqua') {
        // AQUA MEMORY: Ocean Blue, Sunlit God Rays, Water Ribbons & Bubbles
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#0369a1');
        bg.addColorStop(0.5, '#0284c7');
        bg.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // God rays & bubbles
        for (let i = 0; i < 32; i++) {
          const bx = (i * 73) % width;
          const by = 80 + ((i * 53) % (height - 120));
          const br = 8 + (i % 5) * 7;
          ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.save();
        ctx.fillStyle = '#e0f2fe';
        ctx.shadowColor = '#0369a1';
        ctx.shadowBlur = 12;
        ctx.font = 'italic 900 106px "Playfair Display", Georgia, serif';
        ctx.fillText('AQUA', 330, 142);
        ctx.font = 'italic 800 68px "Playfair Display", Georgia, serif';
        ctx.fillText('MEMORY', 620, 214);
        ctx.restore();

        mCtx.fillStyle = 'rgb(180, 255, 255)';
        mCtx.fillRect(310, 45, 820, 185);
      } else if (themeKey === 'pixel') {
        // PIXEL RUSH: 8-Bit Arcade Blocks, Space Invaders, Pixel Star
        ctx.fillStyle = '#0c130e';
        ctx.fillRect(0, 0, width, height);

        const pal = ['#a3e635', '#facc15', '#fb923c', '#f43f5e', '#38bdf8'];
        for (let i = 0; i < 65; i++) {
          ctx.fillStyle = pal[i % pal.length];
          const px = i < 35 ? (i * 19) % 360 : 1220 + ((i * 23) % 350);
          const py = (i * 29) % height;
          ctx.fillRect(px, py, 20, 20);
        }

        ctx.save();
        ctx.fillStyle = '#ecfccb';
        ctx.font = 'italic 900 96px "Orbitron", sans-serif';
        ctx.fillText('PIXEL', 390, 132);
        const rg = ctx.createLinearGradient(450, 145, 950, 225);
        rg.addColorStop(0, '#facc15');
        rg.addColorStop(0.5, '#fb923c');
        rg.addColorStop(1, '#ec4899');
        ctx.fillStyle = rg;
        ctx.fillText('RUSH', 485, 216);
        ctx.restore();

        mCtx.fillStyle = 'rgb(220, 255, 140)';
        mCtx.fillRect(380, 45, 760, 185);
      } else {
        // GOLDEN HOUR: Sunset Sky, Golden Ocean Horizon & Calligraphic Gold Script
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0.0, '#2a183b');
        bg.addColorStop(0.38, '#9a3412');
        bg.addColorStop(0.68, '#f59e0b');
        bg.addColorStop(0.72, '#fef08a');
        bg.addColorStop(1.0, '#451a03');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Setting sun on left horizon
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(170, 435, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        const gg = ctx.createLinearGradient(0, 55, 0, 210);
        gg.addColorStop(0, '#fffbeb');
        gg.addColorStop(0.5, '#fbbf24');
        gg.addColorStop(1, '#d97706');
        ctx.fillStyle = gg;
        ctx.font = 'italic 900 112px "Playfair Display", Georgia, serif';
        ctx.fillText('GOLDEN HOUR', 225, 178);
        ctx.restore();

        mCtx.fillStyle = 'rgb(255, 220, 120)';
        mCtx.fillRect(210, 55, 1150, 150);
      }

      // Common "Side A" Oval Badge & "120 MIN" Typography on the right
      ctx.save();
      ctx.translate(1410, 395);
      ctx.rotate(-0.08);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 102, 42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(0.08);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 700 30px "Exo 2", sans-serif';
      ctx.fillText('Side', -80, 12);
      ctx.font = 'italic 900 58px "Exo 2", sans-serif';
      ctx.fillText('A', -2, 18);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'italic 800 48px "Exo 2", sans-serif';
      ctx.fillText('120', 1445, 575);
      ctx.font = 'italic 700 28px "Exo 2", sans-serif';
      ctx.fillText('MIN', 1445, 612);
      ctx.restore();

      // Use only the reference's printed label area. Reels, shell, fasteners,
      // hubs, and tape strips remain the original moving procedural geometry.
      const reference=referenceImages.get(themeKey);
      if(reference){
        ctx.clearRect(0,0,width,height);
        ctx.drawImage(reference,reference.width*.069,reference.height*.174,reference.width*.862,reference.height*.502,0,0,width,height);
      }
      // Genuinely Transparent Stadium Center Window Cutout
      const winCenterX = width * 0.5;
      const winCenterY = height * (0.5 + 0.45 / 3.96);
      const winRadius = height * (1.04 / 3.96);
      const winHalfSpan = width * (2.06 / 9.12);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(winCenterX - winHalfSpan, winCenterY, winRadius, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(winCenterX + winHalfSpan, winCenterY, winRadius, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const colorTexture = new THREE.CanvasTexture(canvas);
      colorTexture.colorSpace = THREE.SRGBColorSpace;
      colorTexture.anisotropy = 8;

      const holoMaskTexture = new THREE.CanvasTexture(maskCanvas);
      const bundle = { colorTexture, holoMaskTexture };
      textureCache.set(themeKey, bundle);
      return bundle;
    }

    // ============================================================================
    // 2. SHARED GEOMETRY HELPERS & REUSABLE `createCassette(config)` (100×63.5×9.5mm)
    // ============================================================================
    let sharedTapeTexture = null;
    function getTapePackTexture() {
      if (sharedTapeTexture) return sharedTapeTexture;
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const cx = size / 2, cy = size / 2;
      ctx.fillStyle = '#0e0d10';
      ctx.fillRect(0, 0, size, size);

      for (let r = 36; r < size * 0.5; r += 1.5) {
        const lum = 14 + Math.sin(r * 1.8) * 5;
        ctx.strokeStyle = `rgb(${lum}, ${lum}, ${lum + 3})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      const sheen = ctx.createLinearGradient(0, 0, size, size);
      sheen.addColorStop(0.0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0.26)');
      sheen.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, size, size);

      sharedTapeTexture = new THREE.CanvasTexture(canvas);
      sharedTapeTexture.colorSpace = THREE.SRGBColorSpace;
      return sharedTapeTexture;
    }

    function createRoundedRectShape(width, height, radius) {
      const shape = new THREE.Shape();
      const x = -width / 2;
      const y = -height / 2;
      shape.moveTo(x + radius, y);
      shape.lineTo(x + width - radius, y);
      shape.quadraticCurveTo(x + width, y, x + width, y + radius);
      shape.lineTo(x + width, y + height - radius);
      shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      shape.lineTo(x + radius, y + height);
      shape.quadraticCurveTo(x, y + height, x, y + height - radius);
      shape.lineTo(x, y + radius);
      shape.quadraticCurveTo(x, y, x + radius, y);
      return shape;
    }

    function createStadiumPath(cx, cy, halfSpan, radius) {
      const path = new THREE.Path();
      path.absarc(cx - halfSpan, cy, radius, Math.PI * 0.5, Math.PI * 1.5, false);
      path.absarc(cx + halfSpan, cy, radius, -Math.PI * 0.5, Math.PI * 0.5, false);
      path.closePath();
      return path;
    }

    function createLabelGeometry(width, height, radius, winHalfSpan, winRadius, winOffsetY) {
      const shape = createRoundedRectShape(width, height, radius);
      shape.holes.push(createStadiumPath(0, winOffsetY, winHalfSpan, winRadius));
      const geom = new THREE.ShapeGeometry(shape, 40);
      const pos = geom.attributes.position;
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uvs[i * 2] = (pos.getX(i) + width * 0.5) / width;
        uvs[i * 2 + 1] = (pos.getY(i) + height * 0.5) / height;
      }
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      return geom;
    }

    function createReelAssembly(initialTapeRadius, tapeTexture, mats) {
      const reelGroup = new THREE.Group();
      const reelThickness = 0.42;

      // White 6-tooth spline hub
      const innerRingShape = new THREE.Shape();
      innerRingShape.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
      const innerBore = new THREE.Path();
      innerBore.absarc(0, 0, 0.42, 0, Math.PI * 2, true);
      innerRingShape.holes.push(innerBore);

      const hubRingGeom = new THREE.ExtrudeGeometry(innerRingShape, {
        depth: reelThickness,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 2,
        curveSegments: 32
      });
      hubRingGeom.center();
      reelGroup.add(new THREE.Mesh(hubRingGeom, mats.whiteHubMat));

      const toothGeom = new THREE.BoxGeometry(0.095, 0.14, reelThickness * 0.95);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const tooth = new THREE.Mesh(toothGeom, mats.whiteHubMat);
        tooth.position.set(Math.cos(angle) * 0.365, Math.sin(angle) * 0.365, 0);
        tooth.rotation.z = angle + Math.PI * 0.5;
        reelGroup.add(tooth);
      }

      // Glossy black 6-slot outer wheel
      const blackWheelShape = new THREE.Shape();
      blackWheelShape.absarc(0, 0, 0.88, 0, Math.PI * 2, false);
      const wheelInnerHole = new THREE.Path();
      wheelInnerHole.absarc(0, 0, 0.54, 0, Math.PI * 2, true);
      blackWheelShape.holes.push(wheelInnerHole);

      for (let i = 0; i < 6; i++) {
        const aCenter = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const da = 0.28;
        const slot = new THREE.Path();
        slot.absarc(0, 0, 0.80, aCenter - da, aCenter + da, false);
        slot.absarc(0, 0, 0.61, aCenter + da, aCenter - da, true);
        slot.closePath();
        blackWheelShape.holes.push(slot);
      }

      const blackWheelGeom = new THREE.ExtrudeGeometry(blackWheelShape, {
        depth: reelThickness * 0.9,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 2,
        curveSegments: 32
      });
      blackWheelGeom.center();
      reelGroup.add(new THREE.Mesh(blackWheelGeom, mats.blackHubMat));

      // Wound magnetic tape pack
      function buildTapePackMesh(outerR) {
        const rClamped = Math.max(0.90, outerR);
        const packShape = new THREE.Shape();
        packShape.absarc(0, 0, rClamped, 0, Math.PI * 2, false);
        const packHole = new THREE.Path();
        packHole.absarc(0, 0, 0.87, 0, Math.PI * 2, true);
        packShape.holes.push(packHole);

        const geom = new THREE.ExtrudeGeometry(packShape, {
          depth: reelThickness * 0.85,
          bevelEnabled: false,
          curveSegments: 36
        });
        geom.center();
        const pos = geom.attributes.position;
        const uvs = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
          uvs[i * 2] = (pos.getX(i) + 1.6) / 3.2;
          uvs[i * 2 + 1] = (pos.getY(i) + 1.6) / 3.2;
        }
        geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        return geom;
      }

      const tapeMat = new THREE.MeshPhysicalMaterial({
        map: tapeTexture,
        color: new THREE.Color('#141216'),
        roughness: 0.22,
        metalness: 0.25,
        clearcoat: 0.75
      });

      const tapeMesh = new THREE.Mesh(buildTapePackMesh(initialTapeRadius), tapeMat);
      reelGroup.add(tapeMesh);

      reelGroup.userData = {
        currentRadius: initialTapeRadius,
        setTapeRadius(newRadius) {
          if (Math.abs(newRadius - this.currentRadius) < 0.005) return;
          this.currentRadius = newRadius;
          tapeMesh.scale.set(newRadius / initialTapeRadius, newRadius / initialTapeRadius, 1);
        }
      };

      return reelGroup;
    }

    /**
     * Reusable factory for all 5 TAPE//CLUB Cassettes.
     * Standard Dimensions: 100 × 63.5 × 9.5 mm (10.0 × 6.35 × 0.95 units).
     * Orientation: Front faces +Z, Top points +Y.
     */
    export function createCassette(config = {}) {
      const themeKey = config.theme || 'cosmic';
      const theme = CASSETTE_THEMES[themeKey] || CASSETTE_THEMES.cosmic;

      const options = {
        scale: config.scale ?? 1.0,
        playing: config.playing ?? false,
        tapeProgress: config.tapeProgress ?? 0.14,
        ...config
      };

      const cassetteGroup = new THREE.Group();
      cassetteGroup.name = `Cassette_${theme.id}`;
      cassetteGroup.scale.setScalar(options.scale);

      const W = 10.0;
      const H = 6.35;
      const D = 0.95;
      const cornerR = 0.36;
      const labelW = 9.12;
      const labelH = 3.96;
      const labelCenterY = 0.54;
      const winHalfSpan = 2.06;
      const winRadius = 1.04;
      const winCenterY = 0.09;

      const { colorTexture } = getCassetteTextures(themeKey);
      const tapeTexture = getTapePackTexture();

      const shellMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.shellColor),
        transparent: true,
        opacity: themeKey === 'midnight' ? 0.88 : 0.72,
        roughness: 0.12,
        metalness: 0.08,
        ior: 1.52,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        iridescence: themeKey === 'midnight' ? 0.22 : 0.66,
        iridescenceIOR: 1.38,
        iridescenceThicknessRange: theme.iridRange,
        envMapIntensity: 0.65,
        specularIntensity: 0.7,
        depthWrite: false
      });

      const rimMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.rimColor),
        transparent: true,
        opacity: 0.82,
        roughness: 0.12,
        metalness: 0.14,
        clearcoat: 1.0,
        iridescence: 0.94,
        iridescenceThicknessRange: theme.iridRange,
        envMapIntensity: 0.9,
        depthWrite: false
      });

      const labelMat = new THREE.MeshBasicMaterial({
        map: colorTexture,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });

      shellMat.userData.finishRole='shell';
      rimMat.userData.finishRole='rim';
      labelMat.userData.finishRole='label';
      const mats = {
        whiteHubMat: new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.18,
          metalness: 0.05
        }),
        blackHubMat: new THREE.MeshPhysicalMaterial({
          color: '#0b0b0e',
          roughness: 0.15,
          metalness: 0.25,
          clearcoat: 0.9
        }),
        chromeMat: new THREE.MeshStandardMaterial({
          color: '#e2e8f0',
          roughness: 0.1,
          metalness: 0.95
        })
      };

      const bottomHoles = [
        { x: -2.18, y: -2.58, r: 0.28 },
        { x: -1.14, y: -2.44, r: 0.23 },
        { x:  1.14, y: -2.44, r: 0.23 },
        { x:  2.18, y: -2.58, r: 0.28 }
      ];

      function buildHalf(isFront) {
        const g = new THREE.Group();
        const zSign = isFront ? 1 : -1;

        const plateShape = createRoundedRectShape(W, H, cornerR);
        plateShape.holes.push(createStadiumPath(0, winCenterY, winHalfSpan, winRadius));
        for (const bh of bottomHoles) {
          const hp = new THREE.Path();
          hp.absarc(bh.x, bh.y, bh.r, 0, Math.PI * 2, true);
          plateShape.holes.push(hp);
        }

        const plateGeom = new THREE.ExtrudeGeometry(plateShape, {
          depth: 0.06,
          bevelEnabled: true,
          bevelThickness: 0.018,
          bevelSize: 0.018,
          bevelSegments: 2,
          curveSegments: 36
        });
        plateGeom.center();
        const plateMesh = new THREE.Mesh(plateGeom, shellMat);
        plateMesh.position.z = zSign * (D * 0.5 - 0.04);
        g.add(plateMesh);

        // Perimeter frame wall
        const rimShape = createRoundedRectShape(W, H, cornerR);
        rimShape.holes.push(createRoundedRectShape(W - 0.22, H - 0.22, cornerR * 0.72));
        const wallGeom = new THREE.ExtrudeGeometry(rimShape, {
          depth: D * 0.46,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.02,
          bevelSegments: 2,
          curveSegments: 32
        });
        wallGeom.center();
        const wallMesh = new THREE.Mesh(wallGeom, rimMat);
        wallMesh.position.z = zSign * (D * 0.24);
        g.add(wallMesh);

        // Raised trapezoid bridge
        const trapShape = new THREE.Shape();
        trapShape.moveTo(-3.32, -3.15);
        trapShape.lineTo(3.32, -3.15);
        trapShape.lineTo(2.96, -1.56);
        trapShape.lineTo(-2.96, -1.56);
        trapShape.closePath();
        for (const bh of bottomHoles) {
          const hp = new THREE.Path();
          hp.absarc(bh.x, bh.y, bh.r, 0, Math.PI * 2, true);
          trapShape.holes.push(hp);
        }
        const trapGeom = new THREE.ExtrudeGeometry(trapShape, {
          depth: 0.14,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.02,
          bevelSegments: 2
        });
        trapGeom.translate(0, 0, -0.07);
        const trapMesh = new THREE.Mesh(trapGeom, shellMat);
        trapMesh.position.z = zSign * (D * 0.5 + 0.045);
        g.add(trapMesh);

        return g;
      }

      cassetteGroup.add(buildHalf(true), buildHalf(false));

      // Corner screws
      for (const [sx, sy] of [[-4.62, 2.8], [4.62, 2.8], [-4.62, -2.8], [4.62, -2.8]]) {
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, D + 0.02, 16).rotateX(Math.PI / 2), mats.chromeMat);
        screw.position.set(sx, sy, 0);
        cassetteGroup.add(screw);
      }

      // Labels (Front +Z and Back -Z)
      const labelGeom = createLabelGeometry(labelW, labelH, 0.22, winHalfSpan, winRadius, winCenterY - labelCenterY);
      const frontLabel = new THREE.Mesh(labelGeom, labelMat);
      // The bevel reaches z=.483. The old .483 label was coplanar and flickered.
      frontLabel.position.set(0, labelCenterY, D * 0.5 + 0.035);
      const backLabel = new THREE.Mesh(labelGeom, labelMat);
      backLabel.rotation.y = Math.PI;
      backLabel.position.set(0, labelCenterY, -(D * 0.5 + 0.035));
      cassetteGroup.add(frontLabel, backLabel);

      // Reels
      const minPackR = 0.90;
      const maxPackR = 1.50;
      const maxArea = maxPackR * maxPackR - minPackR * minPackR;

      function computeReelRadii(progress) {
        const p = THREE.MathUtils.clamp(progress, 0.02, 0.98);
        return {
          rLeft: Math.sqrt(minPackR * minPackR + (1 - p) * maxArea),
          rRight: Math.sqrt(minPackR * minPackR + p * maxArea)
        };
      }

      const radii = computeReelRadii(options.tapeProgress);
      const leftReel = createReelAssembly(radii.rLeft, tapeTexture, mats);
      leftReel.name = 'leftReel';
      leftReel.position.set(-winHalfSpan, winCenterY, 0);

      const rightReel = createReelAssembly(radii.rRight, tapeTexture, mats);
      rightReel.name = 'rightReel';
      rightReel.position.set(winHalfSpan, winCenterY, 0);

      cassetteGroup.add(leftReel, rightReel);

      // Exposed magnetic tape strip along the bottom (-Y) edge + copper pressure pad
      const tapeStrip = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.02, 0.38),
        new THREE.MeshStandardMaterial({ color: '#171316', roughness: 0.25, metalness: 0.4 })
      );
      tapeStrip.position.set(0, -2.92, 0);
      const feltPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.16, 0.36),
        new THREE.MeshStandardMaterial({ color: '#5c2d16', roughness: 0.85 })
      );
      feltPad.position.set(0, -2.82, 0);
      cassetteGroup.add(tapeStrip, feltPad);

      const state = {
        themeKey,
        title: theme.title,
        isPlaying: options.playing,
        speedMultiplier: 1.0,
        tapeProgress: options.tapeProgress,
        leftRPM: 0,
        rightRPM: 0
      };

      cassetteGroup.userData = {
        state,
        theme,
        leftReel,
        rightReel,
        setPlaying(p) {
          state.isPlaying = Boolean(p);
        },
        setSpeedMultiplier(m) {
          state.speedMultiplier = m;
        },
        setTapeProgress(prog) {
          state.tapeProgress = THREE.MathUtils.clamp(prog, 0.02, 0.98);
          const { rLeft, rRight } = computeReelRadii(state.tapeProgress);
          leftReel.userData.setTapeRadius(rLeft);
          rightReel.userData.setTapeRadius(rRight);
        },
        stepReels(deltaTime, speedMult = 1.0) {
          const { rLeft, rRight } = computeReelRadii(state.tapeProgress);
          const linearSpeed = 4.25 * speedMult;
          const omegaLeft = linearSpeed / rLeft;
          const omegaRight = linearSpeed / rRight;
          leftReel.rotation.z -= omegaLeft * deltaTime;
          rightReel.rotation.z -= omegaRight * deltaTime;
          state.leftRPM = Math.abs((omegaLeft * 60) / (Math.PI * 2));
          state.rightRPM = Math.abs((omegaRight * 60) / (Math.PI * 2));
          return { omegaLeft, omegaRight };
        }
      };

      return cassetteGroup;
    }


export { createRoundedRectShape, textureCache };
