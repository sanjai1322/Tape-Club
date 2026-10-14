import * as THREE from 'three';
import {createRoundedRectShape} from './cassette.js';
const gsap=window.gsap;
    export function createPlayer(config = {}) {
      const playerGroup = new THREE.Group();
      playerGroup.name = 'TapeClubPlayer';

      // Chassis dimensions (in cm: 13.4 x 3.25 x 9.2 -> 134 x 32.5 x 92 mm)
      const pW = 13.4;
      const pH = 3.25;
      const pD = 9.2;

      // Compartment bay center & seated cassette coordinates
      // Well sized 10.42 x 6.68 units so the 10.0 x 6.35 x 0.95 cassette seats with realistic clearance
      const wellW = 10.44;
      const wellD = 6.70;
      const wellCenterZ = -0.35;
      const deckFloorY = 1.72;
      const seatedCassetteY = 2.26; // Exact height where cassette hubs coaxially engage spindles

      // In cassette local space (+Z front, +Y top), hubs are at (x = ±2.06, y = +0.09, z = 0).
      // When cassette is rotated by rotation.x = -Math.PI / 2 to lie flat in the bay:
      // Local (x, y, z) -> Player (x, z, -y).
      // So hubs sit at Player (x = ±2.06, y = seatedCassetteY, z = wellCenterZ - 0.09).
      const spindleX = 2.06;
      const spindleZ = wellCenterZ - 0.09; // -0.44

      // Rear lid hinge axis (positioned at rear-top so opening 0°..54° never intersects the cassette)
      const hingeY = pH + 0.04; // 3.29
      const hingeZ = -4.18;

      const shaderUniforms = {
        uTime: { value: 0 }
      };

      // Custom GLSL prism edge shader: Smoky Graphite Acrylic with Cyan, Sapphire & Violet Iridescent Highlights (NO dominant pink)
      function injectGraphitePrismShader(material, intensity = 0.34) {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = shaderUniforms.uTime;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
             varying vec3 vLocalPos;
             varying vec3 vWorldNorm;
             varying vec3 vWorldPosition;`
          );
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             vLocalPos = position;
             vWorldNorm = normalize(mat3(modelMatrix) * objectNormal);
             vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;`
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             uniform float uTime;
             varying vec3 vLocalPos;
             varying vec3 vWorldNorm;
             varying vec3 vWorldPosition;`
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vWorldNorm))), 2.2);
            float wave1 = sin(vLocalPos.x * 1.45 + vLocalPos.z * 1.35 + viewDir.x * 4.0 + uTime * 0.45) * 0.5 + 0.5;
            float wave2 = cos(vLocalPos.x * 2.10 - vLocalPos.y * 1.85 - viewDir.y * 4.0) * 0.5 + 0.5;
            // Cool-white, icy-cyan, electric sapphire, and soft violet prism spectrum (zero dominant pink)
            vec3 icyCyan = vec3(0.22, 0.86, 1.00);
            vec3 coolViolet = vec3(0.48, 0.44, 0.98);
            vec3 prismWhite = vec3(0.92, 0.97, 1.00);
            vec3 iridColor = mix(icyCyan, coolViolet, wave1);
            iridColor = mix(iridColor, prismWhite, pow(wave2, 3.0) * 0.65);
            gl_FragColor.rgb += iridColor * (0.28 + 0.72 * fresnel) * ${intensity.toFixed(3)};
            #include <dithering_fragment>
            `
          );
        };
      }

      // ----------------------------------------------------------------------
      // MATERIALS FOR THE "TAPE//CLUB" PLAYER
      // ----------------------------------------------------------------------
      const graphiteAcrylicMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#353a40'),
        transparent: true,
        opacity: 0.52,
        roughness: 0.035,
        metalness: 0.08,
        ior: 1.51,
        reflectivity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.025,
        iridescence: 0.13,
        iridescenceIOR: 1.38,
        iridescenceThicknessRange: [190, 410], // Cyan-blue-violet spectrum
        specularColor: new THREE.Color('#bae6fd'),
        specularIntensity: 1.9,
        envMapIntensity: 1.2,
        depthWrite: false
      });
      injectGraphitePrismShader(graphiteAcrylicMat, 0.065);

      const graphiteBevelRimMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#31363b'),
        transparent: true,
        opacity: 0.68,
        roughness: 0.04,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        iridescence: 0.18,
        iridescenceIOR: 1.40,
        iridescenceThicknessRange: [185, 420],
        specularColor: new THREE.Color('#7dd3fc'),
        specularIntensity: 2.2,
        envMapIntensity: 1.3,
        depthWrite: false
      });
      injectGraphitePrismShader(graphiteBevelRimMat, 0.08);

      // Brushed Aluminum / Stainless Deck Plate Texture
      function createBrushedMetalTexture() {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 256;
        const ctx = c.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 512, 256);
        g.addColorStop(0, '#94a3b8');
        g.addColorStop(0.5, '#cbd5e1');
        g.addColorStop(1, '#64748b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 256);
        for (let y = 0; y < 256; y++) {
          const alpha = (Math.random() * 0.08);
          ctx.fillStyle = y % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(15,23,42,${alpha})`;
          ctx.fillRect(0, y, 512, 1);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      const brushedMetalDeckMat = new THREE.MeshStandardMaterial({
        map: createBrushedMetalTexture(),
        color: new THREE.Color('#cbd5e1'),
        roughness: 0.24,
        metalness: 0.88,
        envMapIntensity: 1.8
      });

      const polishedChromeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f1f5f9'),
        roughness: 0.07,
        metalness: 0.96,
        envMapIntensity: 2.4
      });

      const gunmetalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e293b'),
        roughness: 0.25,
        metalness: 0.85
      });

      const tactileKeyMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#14171f'),
        roughness: 0.28,
        metalness: 0.18,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22
      });

      const darkGlassPanelMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#090d16'),
        roughness: 0.08,
        metalness: 0.2,
        clearcoat: 1.0,
        reflectivity: 0.95
      });

      const coolWhiteLedMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#e0f2fe')
      });

      const cyanAccentStripMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#7dd3fc'),
        transparent: true,
        opacity: 0.62,
        depthWrite: false
      });

      // ----------------------------------------------------------------------
      // A. MAIN TRANSPARENT SMOKY GRAPHITE CHASSIS BODY & RECESSED BAY WALLS
      // ----------------------------------------------------------------------
      const chassisGroup = new THREE.Group();
      chassisGroup.name = 'chassisGroup';
      playerGroup.add(chassisGroup);

      // 1. Lower Chassis Base Block (y = 0 to deckFloorY = 1.72)
      const baseShape = createRoundedRectShape(pW, pD, 0.52);
      const baseGeom = new THREE.ExtrudeGeometry(baseShape, {
        depth: deckFloorY,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 3,
        curveSegments: 36
      });
      baseGeom.rotateX(Math.PI / 2);
      baseGeom.translate(0, deckFloorY, 0);
      const baseMesh = new THREE.Mesh(baseGeom, graphiteAcrylicMat);
      chassisGroup.add(baseMesh);

      // 2. Upper Chassis Perimeter Frame around the Recessed Cassette Compartment (y = deckFloorY to pH = 3.25)
      const upperFrameHeight = pH - deckFloorY;
      const upperFrameShape = createRoundedRectShape(pW, pD, 0.52);
      const wellHolePath = createRoundedRectShape(wellW, wellD, 0.28);
      // Note: because rotateX(Math.PI/2) maps shape Y -> world +Z, we offset the hole by wellCenterZ
      const shiftedWellHole = new THREE.Path();
      const hw = wellW / 2, hd = wellD / 2, wr = 0.28, wz = wellCenterZ;
      shiftedWellHole.moveTo(-hw + wr, wz - hd);
      shiftedWellHole.lineTo(hw - wr, wz - hd);
      shiftedWellHole.quadraticCurveTo(hw, wz - hd, hw, wz - hd + wr);
      shiftedWellHole.lineTo(hw, wz + hd - wr);
      shiftedWellHole.quadraticCurveTo(hw, wz + hd, hw - wr, wz + hd);
      shiftedWellHole.lineTo(-hw + wr, wz + hd);
      shiftedWellHole.quadraticCurveTo(-hw, wz + hd, -hw, wz + hd - wr);
      shiftedWellHole.lineTo(-hw, wz - hd + wr);
      shiftedWellHole.quadraticCurveTo(-hw, wz - hd, -hw + wr, wz - hd);
      upperFrameShape.holes.push(shiftedWellHole);

      const upperFrameGeom = new THREE.ExtrudeGeometry(upperFrameShape, {
        depth: upperFrameHeight,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3,
        curveSegments: 36
      });
      upperFrameGeom.rotateX(Math.PI / 2);
      upperFrameGeom.translate(0, pH, 0);
      const upperFrameMesh = new THREE.Mesh(upperFrameGeom, graphiteBevelRimMat);
      chassisGroup.add(upperFrameMesh);

      // 3. Internal Cyan-Violet Edge Refraction Light Pipes along the Acrylic Chassis Edges
      const edgePipes = [
        { pos: [0, pH - 0.04, pD * 0.5 - 0.14], size: [pW - 1.2, 0.04, 0.04] },
        { pos: [0, 1.72, pD * 0.5 - 0.10], size: [pW - 1.0, 0.045, 0.045] },
        { pos: [-pW * 0.5 + 0.12, pH - 0.06, 0], size: [0.04, 0.04, pD - 1.2] },
        { pos: [ pW * 0.5 - 0.12, pH - 0.06, 0], size: [0.04, 0.04, pD - 1.2] }
      ];
      for (const ep of edgePipes) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...ep.size), cyanAccentStripMat);
        m.position.set(...ep.pos);
        chassisGroup.add(m);
      }

      // 4. Brushed Metal Compartment Floor Plate & Molded Side Cassette Guides
      const floorPlateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(wellW - 0.12, 0.06, wellD - 0.12),
        brushedMetalDeckMat
      );
      floorPlateMesh.position.set(0, deckFloorY + 0.03, wellCenterZ);
      chassisGroup.add(floorPlateMesh);

      // Left and Right Brushed Metal Lateral Guide Blocks in Acrylic Housings (matching image_79125a.jpg)
      for (const sideSign of [-1, 1]) {
        const guideHousing = new THREE.Mesh(
          new THREE.BoxGeometry(0.88, 0.65, 2.35),
          graphiteBevelRimMat
        );
        guideHousing.position.set(sideSign * (wellW * 0.5 + 0.48), deckFloorY + 0.55, wellCenterZ + 0.55);
        chassisGroup.add(guideHousing);

        const metalPad = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.52, 1.95),
          brushedMetalDeckMat
        );
        metalPad.position.set(sideSign * (wellW * 0.5 + 0.48), deckFloorY + 0.62, wellCenterZ + 0.55);
        chassisGroup.add(metalPad);
      }

      // Top Deck Corner Phillips Screws (4 corners on top rim)
      function createPhillipsScrew(radius = 0.22) {
        const sg = new THREE.Group();
        const boss = new THREE.Mesh(
          new THREE.CylinderGeometry(radius * 1.45, radius * 1.45, 0.22, 24),
          graphiteBevelRimMat
        );
        boss.position.y = -0.08;
        sg.add(boss);

        const head = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, 0.06, 24),
          polishedChromeMat
        );
        sg.add(head);

        const slot1 = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.25, 0.03, 0.045), gunmetalMat);
        slot1.position.y = 0.025;
        const slot2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, radius * 1.25), gunmetalMat);
        slot2.position.y = 0.025;
        sg.add(slot1, slot2);
        return sg;
      }

      const topDeckScrewPositions = [
        [-6.12, pH + 0.03,  3.95],
        [ 6.12, pH + 0.03,  3.95],
        [-6.12, pH + 0.03, -3.95],
        [ 6.12, pH + 0.03, -3.95]
      ];
      for (const [sx, sy, sz] of topDeckScrewPositions) {
        const sc = createPhillipsScrew(0.22);
        sc.position.set(sx, sy, sz);
        chassisGroup.add(sc);
      }

      // ----------------------------------------------------------------------
      // B. INTERIOR REEL SPINDLES, TAPE HEAD, PRESSURE MECHANISM & ROLLERS
      // ----------------------------------------------------------------------
      function createDeckSpindle() {
        const spGroup = new THREE.Group();

        // Recessed circular collar in deck floor
        const wellCollar = new THREE.Mesh(
          new THREE.RingGeometry(0.92, 1.08, 36).rotateX(-Math.PI / 2),
          gunmetalMat
        );
        wellCollar.position.y = 0.04;
        spGroup.add(wellCollar);

        // Rotating Turntable & 6-Spline Drive Shaft
        const rotorGroup = new THREE.Group();
        spGroup.add(rotorGroup);

        // Glossy black sculpted turntable wheel
        const baseDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.86, 0.92, 0.22, 32),
          tactileKeyMat
        );
        baseDisc.position.y = 0.14;
        rotorGroup.add(baseDisc);

        // 6 radial ribs on the black turntable wheel
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.36), tactileKeyMat);
          rib.position.set(Math.cos(a) * 0.62, 0.16, Math.sin(a) * 0.62);
          rib.rotation.y = -a;
          rotorGroup.add(rib);
        }

        // Polished Chrome 6-Spline Drive Hub (meshes directly into cassette 6-tooth hub)
        const chromePost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.35, 0.72, 24),
          polishedChromeMat
        );
        chromePost.position.y = 0.42;
        rotorGroup.add(chromePost);

        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.56, 0.14), polishedChromeMat);
          fin.position.set(Math.cos(a) * 0.35, 0.38, Math.sin(a) * 0.35);
          fin.rotation.y = -a;
          rotorGroup.add(fin);
        }

        // Top centering cap
        const topCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.28, 0.14, 20),
          polishedChromeMat
        );
        topCap.position.y = 0.82;
        rotorGroup.add(topCap);

        spGroup.userData = { rotorGroup };
        return spGroup;
      }

      const leftSpindle = createDeckSpindle();
      leftSpindle.name = 'leftSpindle';
      leftSpindle.position.set(-spindleX, deckFloorY, spindleZ);

      const rightSpindle = createDeckSpindle();
      rightSpindle.name = 'rightSpindle';
      rightSpindle.position.set(spindleX, deckFloorY, spindleZ);

      chassisGroup.add(leftSpindle, rightSpindle);

      // Front Magnetic Tape Head, Pinch Rollers, Capstans & Engagement Carriage
      const headCarriageGroup = new THREE.Group();
      headCarriageGroup.name = 'headCarriageGroup';
      const headRestZ = 2.48;
      const headEngagedZ = 2.24; // Slides into the cassette's front-facing trapezoid when playing
      headCarriageGroup.position.set(0, deckFloorY + 0.38, headRestZ);
      chassisGroup.add(headCarriageGroup);

      // Center Brushed Chrome Stereo Magnetic Tape Head Block (matching image_79125a.jpg)
      const mainHeadBlock = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.68, 0.64),
        polishedChromeMat
      );
      headCarriageGroup.add(mainHeadBlock);

      const headFaceCore = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.36, 0.68),
        tactileKeyMat
      );
      headFaceCore.position.y = -0.06;
      headCarriageGroup.add(headFaceCore);

      // Left & Right Secondary Guide/Erase Head Blocks
      for (const sideX of [-1.05, 1.05]) {
        const sideBlock = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.52, 0.56),
          brushedMetalDeckMat
        );
        sideBlock.position.set(sideX, -0.05, 0.04);
        headCarriageGroup.add(sideBlock);
      }

      // Dual Capstan Pins & Rubber Pinch Rollers (align with cassette bottom capstan holes)
      const pinchRollers = [];
      for (const sideSign of [-1, 1]) {
        const capstanPin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.85, 16),
          polishedChromeMat
        );
        capstanPin.position.set(sideSign * 1.14, deckFloorY + 0.45, 2.00);
        chassisGroup.add(capstanPin);

        const guidePost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.78, 16),
          polishedChromeMat
        );
        guidePost.position.set(sideSign * 2.18, deckFloorY + 0.42, 2.14);
        chassisGroup.add(guidePost);

        // Pinch roller wheel on the moving carriage
        const rollerWheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.42, 24),
          tactileKeyMat
        );
        rollerWheel.position.set(sideSign * 2.18, -0.06, 0.05);
        const rollerAxle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.48, 16),
          polishedChromeMat
        );
        rollerAxle.position.copy(rollerWheel.position);
        headCarriageGroup.add(rollerWheel, rollerAxle);
        pinchRollers.push(rollerWheel);
      }

      // Molded Transparent Acrylic Internal Supports along front & rear of compartment
      for (const rx of [-3.4, -1.8, 0, 1.8, 3.4]) {
        const frontSupport = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.58, 0.45),
          graphiteBevelRimMat
        );
        frontSupport.position.set(rx, deckFloorY + 0.32, 2.72);
        chassisGroup.add(frontSupport);

        const rearSupport = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.68, 0.36),
          graphiteBevelRimMat
        );
        rearSupport.position.set(rx, deckFloorY + 0.38, -3.52);
        chassisGroup.add(rearSupport);
      }

      // ----------------------------------------------------------------------
      // C. ARTICULATED TRANSPARENT LID & REAR MECHANICAL HINGES
      // ----------------------------------------------------------------------
      // Stationary rear hinge base knuckles on the chassis
      for (const hx of [-4.55, 4.55]) {
        const baseBracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.55, 0.52),
          polishedChromeMat
        );
        baseBracket.position.set(hx, hingeY - 0.18, hingeZ);
        chassisGroup.add(baseBracket);

        const hingePin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.78, 16).rotateZ(Math.PI / 2),
          gunmetalMat
        );
        hingePin.position.set(hx, hingeY, hingeZ);
        chassisGroup.add(hingePin);
      }

      // Pivoting Lid Group (origin is right on the rear hinge axis: y = hingeY, z = hingeZ)
      const lidPivotGroup = new THREE.Group();
      lidPivotGroup.name = 'lidPivotGroup';
      lidPivotGroup.position.set(0, hingeY, hingeZ);
      // Start in open position (52 degrees, matching reference image_79125a.jpg)
      const OPEN_LID_ANGLE = -THREE.MathUtils.degToRad(105);
      const CLOSED_LID_ANGLE = 0;
      lidPivotGroup.rotation.x = 0;
      playerGroup.add(lidPivotGroup);

      // Offset from hinge axis to lid center
      const lidW = 12.95;
      const lidD = 7.85;
      const lidThick = 0.54;
      const lidCenterOffsetZ = -hingeZ - 0.42; // Centers lid over compartment bay (z ≈ -0.42 in world when closed)
      const lidCenterOffsetY = 0.28; // Clearance above seated cassette trapezoid

      const lidMeshGroup = new THREE.Group();
      lidMeshGroup.position.set(0, lidCenterOffsetY, lidCenterOffsetZ);
      lidPivotGroup.add(lidMeshGroup);

      // 1. Main Transparent Smoky Graphite Lid Plate with Stadium Window Cutout
      const lidOuterShape = createRoundedRectShape(lidW, lidD, 0.44);
      const lidWinW = 8.8;
      const lidWinD = 2.45;
      const lidWinPath = createRoundedRectShape(lidWinW, lidWinD, 0.36);
      lidOuterShape.holes.push(lidWinPath);

      const lidPlateGeom = new THREE.ExtrudeGeometry(lidOuterShape, {
        depth: lidThick * 0.55,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.045,
        bevelSegments: 3,
        curveSegments: 36
      });
      lidPlateGeom.rotateX(Math.PI / 2);
      lidPlateGeom.translate(0, lidThick * 0.5, 0);
      const lidPlateMesh = new THREE.Mesh(lidPlateGeom, graphiteAcrylicMat);
      lidMeshGroup.add(lidPlateMesh);

      // 2. Lid Skirt / Perimeter Lip
      const lidSkirtShape = createRoundedRectShape(lidW, lidD, 0.44);
      lidSkirtShape.holes.push(createRoundedRectShape(lidW - 0.32, lidD - 0.32, 0.32));
      const lidSkirtGeom = new THREE.ExtrudeGeometry(lidSkirtShape, {
        depth: lidThick,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
        curveSegments: 32
      });
      lidSkirtGeom.rotateX(Math.PI / 2);
      lidSkirtGeom.translate(0, lidThick * 0.5, 0);
      const lidSkirtMesh = new THREE.Mesh(lidSkirtGeom, graphiteBevelRimMat);
      lidMeshGroup.add(lidSkirtMesh);

      // 3. Ribbed Translucent Frosted Window Insert with Center 4-Pointed Star Emblem (`✦`, matching image_79125a.jpg)
      function createLidWindowTexture() {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 256;
        const ctx = c.getContext('2d');

        ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
        ctx.fillRect(0, 0, 1024, 256);

        // Horizontal ribbed micro-louvers
        for (let y = 10; y < 246; y += 6) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
          ctx.fillRect(16, y, 992, 2.2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
          ctx.fillRect(16, y + 2.2, 992, 1.5);
        }

        // Crisp white border ring
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)';
        ctx.lineWidth = 8;
        ctx.strokeRect(6, 6, 1012, 244);

        // Center 4-Pointed Star Emblem (`✦`)
        ctx.save();
        ctx.translate(512, 128);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.moveTo(0, -54);
        ctx.quadraticCurveTo(10, -10, 68, 0);
        ctx.quadraticCurveTo(10, 10, 0, 54);
        ctx.quadraticCurveTo(-10, 10, -68, 0);
        ctx.quadraticCurveTo(-10, -10, 0, -54);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      const lidWindowPane = new THREE.Mesh(
        new THREE.PlaneGeometry(lidWinW + 0.06, lidWinD + 0.06).rotateX(-Math.PI / 2),
        new THREE.MeshPhysicalMaterial({
          map: createLidWindowTexture(),
          transparent: true,
          opacity: 0.62,
          roughness: 0.15,
          metalness: 0.05,
          clearcoat: 1.0,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      lidWindowPane.position.set(0, lidThick * 0.42, 0);
      lidMeshGroup.add(lidWindowPane);

      // 4. Two Front-Corner Phillips Screws & Molded Latch Tabs on the Lid (matching image_79125a.jpg)
      for (const sx of [-4.45, 4.45]) {
        const lidScrew = createPhillipsScrew(0.21);
        lidScrew.position.set(sx, lidThick * 0.56, lidD * 0.5 - 0.42);
        lidMeshGroup.add(lidScrew);

        // Moving upper hinge arm connecting lid back to rear hinge axis
        const upperHingeArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.65, 0.75),
          polishedChromeMat
        );
        upperHingeArm.position.set(sx, -0.05, -lidD * 0.5 + 0.35);
        lidMeshGroup.add(upperHingeArm);
      }

      // ----------------------------------------------------------------------
      // D. FRONT PANEL (+Z FACE): HEADPHONE JACK, 3D TRANSPORT KEYS, LED METER & VOLUME DIAL
      // ----------------------------------------------------------------------
      const frontZ = pD * 0.5; // +4.60
      const interactiveTargets = [];

      // 1. Left Section: 3.5mm Headphone Jack, Headphone Icon, LED Dot & Corner Screws
      const hpX = -5.25;
      const hpY = 0.88;

      const hpBackplate = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 1.85, 0.12),
        darkGlassPanelMat
      );
      hpBackplate.position.set(hpX, 1.02, frontZ - 0.08);
      chassisGroup.add(hpBackplate);

      const hpOuterRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.055, 16, 32),
        polishedChromeMat
      );
      hpOuterRing.position.set(hpX, hpY, frontZ + 0.03);
      chassisGroup.add(hpOuterRing);

      const hpHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.35, 24).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#020408' })
      );
      hpHole.position.set(hpX, hpY, frontZ - 0.08);
      chassisGroup.add(hpHole);

      // Headphone Symbol Canvas Decal above the 3.5mm Jack
      function createHeadphoneIconPlane() {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext('2d');
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(64, 68, 34, Math.PI, 0, false);
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(24, 64, 14, 28);
        ctx.fillRect(90, 64, 14, 28);
        const tex = new THREE.CanvasTexture(c);
        return new THREE.Mesh(
          new THREE.PlaneGeometry(0.38, 0.38),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        );
      }
      const hpIcon = createHeadphoneIconPlane();
      hpIcon.position.set(hpX, hpY + 0.52, frontZ + 0.01);
      chassisGroup.add(hpIcon);

      // Cool-white LED indicator dot next to headphone section
      const hpLedDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), coolWhiteLedMat);
      hpLedDot.position.set(hpX + 0.52, hpY + 0.52, frontZ + 0.01);
      chassisGroup.add(hpLedDot);

      // Front panel left & right corner Phillips screws
      for (const [fx, fy] of [[-5.88, 0.42], [6.12, 0.82]]) {
        const fScrew = createPhillipsScrew(0.19);
        fScrew.rotation.x = Math.PI / 2;
        fScrew.position.set(fx, fy, frontZ + 0.02);
        chassisGroup.add(fScrew);
      }

      // 2. Center-Left Section: Sculpted 3D Mechanical Transport Controls
      // Includes the 3 wide signature front piano keys (REW, PLAY, FF) matching image_79125a.jpg
      // plus 2 tactile companion keys (PAUSE/STOP and EJECT) right beside/above so all 5 controls are physical 3D meshes!
      const transportRecess = new THREE.Mesh(
        new THREE.BoxGeometry(5.35, 1.38, 0.25),
        darkGlassPanelMat
      );
      transportRecess.position.set(-1.55, 1.02, frontZ - 0.08);
      chassisGroup.add(transportRecess);

      function createButtonSymbolTexture(symbolType) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 160;
        const ctx = c.getContext('2d');
        ctx.strokeStyle = '#e2e8f0';
        ctx.fillStyle = '#e2e8f0';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';

        const cx = 128, cy = 84;
        if (symbolType === 'rew') {
          for (const ox of [-18, 18]) {
            ctx.beginPath();
            ctx.moveTo(cx + ox + 14, cy - 20);
            ctx.lineTo(cx + ox - 14, cy);
            ctx.lineTo(cx + ox + 14, cy + 20);
            ctx.closePath();
            ctx.stroke();
          }
        } else if (symbolType === 'play') {
          ctx.beginPath();
          ctx.moveTo(cx - 16, cy - 22);
          ctx.lineTo(cx + 22, cy);
          ctx.lineTo(cx - 16, cy + 22);
          ctx.closePath();
          ctx.stroke();
        } else if (symbolType === 'ff') {
          for (const ox of [-18, 18]) {
            ctx.beginPath();
            ctx.moveTo(cx + ox - 14, cy - 20);
            ctx.lineTo(cx + ox + 14, cy);
            ctx.lineTo(cx + ox - 14, cy + 20);
            ctx.closePath();
            ctx.stroke();
          }
        } else if (symbolType === 'pause') {
          ctx.strokeRect(cx - 20, cy - 18, 12, 36);
          ctx.strokeRect(cx + 8, cy - 18, 12, 36);
        } else if (symbolType === 'eject') {
          ctx.beginPath();
          ctx.moveTo(cx, cy - 22);
          ctx.lineTo(cx - 20, cy + 2);
          ctx.lineTo(cx + 20, cy + 2);
          ctx.closePath();
          ctx.stroke();
          ctx.fillRect(cx - 20, cy + 12, 40, 6);
        }
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      const buttonMeshes = {};

      function createMechanicalKey(actionName, xPos, yPos, zPos, width, height, depth, isTopMount = false) {
        const keyGroup = new THREE.Group();
        keyGroup.position.set(xPos, yPos, zPos);

        const shape = createRoundedRectShape(width, height, 0.09);
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelThickness: 0.035,
          bevelSize: 0.035,
          bevelSegments: 3
        });
        if (isTopMount) {
          geom.rotateX(-Math.PI / 2);
        }
        const keyMesh = new THREE.Mesh(geom, tactileKeyMat);
        keyMesh.userData = { action: actionName, parentKey: keyGroup };
        keyGroup.add(keyMesh);
        interactiveTargets.push(keyMesh);

        // Cool-white LED light bar on top edge of key
        const ledBarMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e0f2fe') });
        const ledBar = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.48, 0.045, 0.045),
          ledBarMat
        );
        if (isTopMount) {
          ledBar.position.set(0, depth + 0.04, -height * 0.34);
        } else {
          ledBar.position.set(0, height * 0.38, depth + 0.032);
        }
        keyGroup.add(ledBar);

        // Crisp geometric symbol plane
        const symPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.72, height * 0.68),
          new THREE.MeshBasicMaterial({
            map: createButtonSymbolTexture(actionName),
            transparent: true
          })
        );
        if (isTopMount) {
          symPlane.rotation.x = -Math.PI / 2;
          symPlane.position.set(0, depth + 0.038, 0.04);
        } else {
          symPlane.position.set(0, -0.03, depth + 0.038);
        }
        keyGroup.add(symPlane);

        keyGroup.userData = {
          restZ: zPos,
          restY: yPos,
          isTopMount,
          ledBarMat
        };

        buttonMeshes[actionName] = keyGroup;
        chassisGroup.add(keyGroup);
        return keyGroup;
      }

      // The 3 iconic front transport keys (<< REW, > PLAY, >> FF) matching image_79125a.jpg
      createMechanicalKey('rew',  -3.28, 1.00, frontZ - 0.04, 1.56, 1.08, 0.24, false);
      createMechanicalKey('play', -1.55, 1.00, frontZ - 0.04, 1.56, 1.08, 0.24, false);
      createMechanicalKey('ff',    0.18, 1.00, frontZ - 0.04, 1.56, 1.08, 0.24, false);

      // Tactile 3D STOP/PAUSE and EJECT mechanical buttons mounted on the front-left & front-right deck rim
      createMechanicalKey('pause', -5.62, pH + 0.01, 2.75, 0.78, 0.92, 0.14, true);
      createMechanicalKey('eject',  5.62, pH + 0.01, 2.75, 0.78, 0.92, 0.14, true);

      // 3. Center-Right Section: Illuminated 10-Segment Audio Level Meter (matching image_79125a.jpg)
      const meterCenterX = 2.48;
      const meterCenterY = 1.04;
      const meterGlass = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 1.16, 0.12),
        darkGlassPanelMat
      );
      meterGlass.position.set(meterCenterX, meterCenterY, frontZ - 0.04);
      chassisGroup.add(meterGlass);

      // Subtle horizontal guide bar above the LED segments
      const meterTopRule = new THREE.Mesh(
        new THREE.BoxGeometry(1.78, 0.035, 0.02),
        brushedMetalDeckMat
      );
      meterTopRule.position.set(meterCenterX, meterCenterY + 0.28, frontZ + 0.025);
      chassisGroup.add(meterTopRule);

      // 10 Graduated Cool-White / Ice-Cyan LED Bars
      const ledSegments = [];
      for (let i = 0; i < 10; i++) {
        const segX = meterCenterX - 0.86 + i * 0.19;
        const maxH = 0.09 + (i / 9) * 0.26;
        const segMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#e0f2fe')
        });
        const segMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, maxH, 0.03),
          segMat
        );
        segMesh.position.set(segX, meterCenterY - 0.10, frontZ + 0.028);
        chassisGroup.add(segMesh);
        ledSegments.push({ mesh: segMesh, mat: segMat, maxH });
      }

      // 4. Far-Right Section: Brushed-Metal Volume Knob with Cool-White LED Halo Ring
      const knobX = 4.92;
      const knobY = 1.00;

      // Illuminated Cool-White / Cyan Crescent Halo Ring behind knob
      const knobHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.035, 16, 48),
        coolWhiteLedMat
      );
      knobHalo.position.set(knobX, knobY, frontZ + 0.01);
      chassisGroup.add(knobHalo);

      const volumeKnobGroup = new THREE.Group();
      volumeKnobGroup.name = 'volumeKnobGroup';
      volumeKnobGroup.position.set(knobX, knobY, frontZ + 0.04);
      chassisGroup.add(volumeKnobGroup);

      // Knurled dark cylinder barrel
      const knurlBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.64, 0.56, 48).rotateX(Math.PI / 2),
        tactileKeyMat
      );
      knurlBarrel.position.z = 0.24;
      knurlBarrel.userData = { action: 'volumeKnob' };
      volumeKnobGroup.add(knurlBarrel);
      interactiveTargets.push(knurlBarrel);

      // Fine knurling ridges around the volume dial perimeter
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.025, 0.48),
          gunmetalMat
        );
        ridge.position.set(Math.cos(a) * 0.63, Math.sin(a) * 0.63, 0.24);
        ridge.rotation.z = a;
        volumeKnobGroup.add(ridge);
      }

      // Polished chrome front chamfer ring
      const knobChamfer = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.035, 16, 48),
        polishedChromeMat
      );
      knobChamfer.position.z = 0.51;
      volumeKnobGroup.add(knobChamfer);

      // Spun-metal radial anisotropic front cap + position indicator line
      function createSpunMetalCapTexture() {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d');
        const cx = 128, cy = 128;
        for (let i = 0; i < 360; i++) {
          const rad = (i * Math.PI) / 180;
          const v = Math.floor(110 + 95 * Math.pow(Math.sin(rad * 2 + 0.6), 2));
          ctx.strokeStyle = `rgb(${v}, ${v + 4}, ${v + 10})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(rad) * 128, cy + Math.sin(rad) * 128);
          ctx.stroke();
        }
        // Subtle indicator notch at top
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(124, 14, 8, 34);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }

      const knobFrontCap = new THREE.Mesh(
        new THREE.CircleGeometry(0.57, 48),
        new THREE.MeshStandardMaterial({
          map: createSpunMetalCapTexture(),
          roughness: 0.22,
          metalness: 0.88
        })
      );
      knobFrontCap.position.z = 0.535;
      knobFrontCap.userData = { action: 'volumeKnob' };
      volumeKnobGroup.add(knobFrontCap);
      interactiveTargets.push(knobFrontCap);

      // ----------------------------------------------------------------------

      function key(action, active) {
        const g=buttonMeshes[action]; if(!g) return;
        const u=g.userData;
        gsap.to(g.position, { [u.isTopMount?'y':'z']: (u.isTopMount?u.restY:u.restZ)-(active?0.065:0), duration:.12, overwrite:true });
        u.ledBarMat.color.set(active?'#b3f0ff':'#e0f2fe');
      }
      function engage(active) { gsap.to(headCarriageGroup.position,{z:active?headEngagedZ:headRestZ,duration:.25,overwrite:true}); }
      function update(dt,time,tape,speed,levels) {
        shaderUniforms.uTime.value=time;
        if(tape && speed) {
          const {omegaLeft,omegaRight}=tape.userData.stepReels(dt,speed);
          leftSpindle.userData.rotorGroup.rotation.y-=omegaLeft*dt;
          rightSpindle.userData.rotorGroup.rotation.y-=omegaRight*dt;
          pinchRollers.forEach(p=>p.rotation.y-=speed*dt*8);
        } else if(tape) { tape.userData.state.leftRPM=0; tape.userData.state.rightRPM=0; }
        ledSegments.forEach((s,i)=>{ const v=levels?.[i]||0; s.mesh.scale.y=.35+v; s.mat.color.setRGB(.58+v*.42,.72+v*.28,.82+v*.18); });
      }
      return Object.assign(playerGroup,{lidPivotGroup,OPEN_LID_ANGLE,interactiveTargets,animatedMeshes:pinchRollers,volumeKnobGroup,key,engage,update,
        insertion:{position:new THREE.Vector3(0,seatedCassetteY,wellCenterZ),rotation:new THREE.Euler(-Math.PI/2,0,0)},
        spindles:[leftSpindle,rightSpindle]});
    }
