import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { PlacedPanel, Obstruction, Point2D, RoofType, SeasonType, StructureProfile, InverterPlacement } from './types';
import { RotateCw, Sun, ZoomIn, ZoomOut, Compass, Eye, Play, Pause } from 'lucide-react';

export interface Solar3DViewportHandle {
  captureSnapshot: () => string;
  setTimeAndSeason: (hour: number, season: SeasonType) => void;
  resetView: () => void;
  setTopView: () => void;
}

interface Solar3DViewportProps {
  polygon: Point2D[];
  roofType: RoofType;
  heightMeters: number;
  parapetHeightMeters: number;
  obstructions: Obstruction[];
  panels: PlacedPanel[];
  azimuth: number;
  tilt: number;
  structureProfile: StructureProfile;
  structureHeightM: number;
  inverterPosition?: InverterPlacement;
  onInverterPlace?: (pos: InverterPlacement) => void;
  allowInverterPlacement?: boolean;
  latitude?: number;
  timeOfDay?: number; // 8.0 to 18.0
  season?: SeasonType;
  showShadows?: boolean;
  onShadingUpdate?: (shadedPanelCount: number, shadePercentage: number) => void;
  className?: string;
  isInteractive?: boolean;
}

export const Solar3DViewport = forwardRef<Solar3DViewportHandle, Solar3DViewportProps>(
  (
    {
      polygon,
      roofType,
      heightMeters,
      parapetHeightMeters,
      obstructions,
      panels,
      azimuth,
      tilt,
      structureProfile,
      structureHeightM,
      inverterPosition,
      onInverterPlace,
      allowInverterPlacement = false,
      latitude = 20.0,
      timeOfDay: initialTime = 12.0,
      season: initialSeason = 'equinox',
      showShadows = true,
      onShadingUpdate,
      className = '',
      isInteractive = true,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState<number>(initialTime);
    const [currentSeason, setCurrentSeason] = useState<SeasonType>(initialSeason);
    const [isPlaying, setIsPlaying] = useState(false);
    const [shadingMetric, setShadingMetric] = useState<{ shaded: number; total: number; pct: number }>({
      shaded: 0,
      total: panels.length,
      pct: 0,
    });

    // Three.js internal references
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
    const sunMeshRef = useRef<THREE.Mesh | null>(null);
    const panelMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const buildingGroupRef = useRef<THREE.Group | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Camera orbit controls state
    const isDraggingRef = useRef(false);
    const isPanningRef = useRef(false);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const sphericalRef = useRef({ radius: 35, theta: Math.PI / 4, phi: Math.PI / 3.5 });
    const targetRef = useRef(new THREE.Vector3(0, 0, 0));

    // Calculate Sun Vector based on latitude, season & time of day
    const calculateSunVector = useCallback(
      (hour: number, seasonType: SeasonType, latDeg: number): { altitude: number; azimuth: number; vector: THREE.Vector3 } => {
        // Solar declination (approximate in radians)
        const declinationMap: Record<SeasonType, number> = {
          summer: (23.45 * Math.PI) / 180, // June 21
          equinox: 0, // March 21 / Sept 21
          winter: (-23.45 * Math.PI) / 180, // Dec 21
        };
        const delta = declinationMap[seasonType];
        const phi = (latDeg * Math.PI) / 180;
        // Hour angle (15 deg per hour from solar noon 12:00)
        const H = ((hour - 12) * 15 * Math.PI) / 180;

        // Solar altitude (elevation angle above horizon)
        const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
        const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

        // Solar azimuth (from True North, clockwise)
        const cosAz = (Math.sin(delta) - Math.sin(phi) * sinAlt) / (Math.cos(phi) * Math.cos(altitude) + 1e-6);
        let solarAzimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
        if (H > 0) {
          solarAzimuth = 2 * Math.PI - solarAzimuth;
        }

        // Convert to Cartesian (Y up, -Z North, +X East)
        const distance = 80;
        const x = distance * Math.cos(altitude) * Math.sin(solarAzimuth);
        const y = Math.max(1, distance * Math.sin(altitude)); // Keep slightly above horizon
        const z = -distance * Math.cos(altitude) * Math.cos(solarAzimuth);

        return {
          altitude: (altitude * 180) / Math.PI,
          azimuth: (solarAzimuth * 180) / Math.PI,
          vector: new THREE.Vector3(x, y, z),
        };
      },
      [],
    );

    // Update Sun Light and Sun indicator position
    const updateSunPosition = useCallback(
      (hour: number, seasonType: SeasonType) => {
        if (!sunLightRef.current || !sunMeshRef.current || !sceneRef.current) return;
        const sunData = calculateSunVector(hour, seasonType, latitude);
        sunLightRef.current.position.copy(sunData.vector);

        // Adjust light intensity based on altitude (dawn/dusk dimmer, midday bright)
        const altRad = (sunData.altitude * Math.PI) / 180;
        const intensityFactor = Math.max(0.1, Math.sin(altRad));
        sunLightRef.current.intensity = 1.6 * intensityFactor;

        // Warm light color morning/evening, crisp white noon
        if (hour < 9 || hour > 16.5) {
          sunLightRef.current.color.setHex(0xffaa55); // Golden hour
        } else {
          sunLightRef.current.color.setHex(0xffffff); // Daytime
        }

        sunMeshRef.current.position.copy(sunData.vector);

        // Calculate simple ray-based shadow occlusion estimate for panels
        let shadedCount = 0;
        const raycaster = new THREE.Raycaster();
        const sunDir = sunData.vector.clone().normalize();

        panelMeshesRef.current.forEach((panelGroup) => {
          const worldPos = new THREE.Vector3();
          panelGroup.getWorldPosition(worldPos);
          worldPos.y += 0.2; // Slightly above panel face

          raycaster.set(worldPos, sunDir);
          if (buildingGroupRef.current) {
            const hits = raycaster.intersectObjects(buildingGroupRef.current.children, true);
            // If hits an obstruction higher than panel, flag as shaded
            const isBlocked = hits.some((hit) => hit.distance > 0.3 && hit.distance < 40);
            if (isBlocked) {
              shadedCount++;
              // Tint panel slightly darker to visualize shade
              panelGroup.traverse((child) => {
                if (child instanceof THREE.Mesh && child.name === 'panel_face') {
                  child.material.color.setHex(0x1a2636);
                }
              });
            } else {
              panelGroup.traverse((child) => {
                if (child instanceof THREE.Mesh && child.name === 'panel_face') {
                  child.material.color.setHex(0x133863);
                }
              });
            }
          }
        });

        const totalPanels = panels.length || 1;
        const shadePct = Math.round((shadedCount / totalPanels) * 100);
        setShadingMetric({ shaded: shadedCount, total: panels.length, pct: shadePct });
        onShadingUpdate?.(shadedCount, shadePct);
      },
      [calculateSunVector, latitude, onShadingUpdate, panels.length],
    );

    // Initial Scene Setup
    useEffect(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 450;

      // 1. Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9); // Slate-100 neutral clean backdrop
      sceneRef.current = scene;

      // 2. Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
      cameraRef.current = camera;

      // 3. Renderer with lightweight shadow map
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = showShadows;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 4. Ambient and Hemisphere Lighting
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.65);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
      scene.add(ambientLight);

      // 5. Directional Sun Light
      const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.4);
      sunLight.castShadow = showShadows;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 150;
      const shadowBound = 25;
      sunLight.shadow.camera.left = -shadowBound;
      sunLight.shadow.camera.right = shadowBound;
      sunLight.shadow.camera.top = shadowBound;
      sunLight.shadow.camera.bottom = -shadowBound;
      sunLight.shadow.bias = -0.0005;
      scene.add(sunLight);
      sunLightRef.current = sunLight;

      // Sun Sphere visualizer
      const sunGeo = new THREE.SphereGeometry(1.8, 16, 16);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      scene.add(sunMesh);
      sunMeshRef.current = sunMesh;

      // Ground plane with subtle grid
      const groundGeo = new THREE.PlaneGeometry(120, 120);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.9,
        metalness: 0.1,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      ground.receiveShadow = true;
      scene.add(ground);

      const gridHelper = new THREE.GridHelper(100, 50, 0x94a3b8, 0xcbd5e1);
      gridHelper.position.y = 0.01;
      scene.add(gridHelper);

      // Animation & Render Loop
      const renderScene = () => {
        if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
        const cam = cameraRef.current;
        const sph = sphericalRef.current;
        const tgt = targetRef.current;

        // Spherical to Cartesian position
        cam.position.x = tgt.x + sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
        cam.position.y = tgt.y + sph.radius * Math.cos(sph.phi);
        cam.position.z = tgt.z + sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
        cam.lookAt(tgt);

        rendererRef.current.render(sceneRef.current, cam);
        animFrameRef.current = requestAnimationFrame(renderScene);
      };
      renderScene();

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const newW = containerRef.current.clientWidth;
        const newH = containerRef.current.clientHeight;
        cameraRef.current.aspect = newW / newH;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newW, newH);
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        renderer.dispose();
      };
    }, [showShadows]);

    // Build or Re-build 3D Meshes when inputs change
    useEffect(() => {
      if (!sceneRef.current) return;
      const scene = sceneRef.current;

      // Remove previous building group
      if (buildingGroupRef.current) {
        scene.remove(buildingGroupRef.current);
        buildingGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      }

      const buildingGroup = new THREE.Group();
      buildingGroupRef.current = buildingGroup;
      panelMeshesRef.current.clear();

      // Normalize polygon vertices around centroid
      if (polygon.length >= 3) {
        let cx = 0;
        let cy = 0;
        polygon.forEach((p) => {
          cx += p.x;
          cy += p.y;
        });
        cx /= polygon.length;
        cy /= polygon.length;

        // Convert 2D Polygon to Three.js Shape
        const roofShape = new THREE.Shape();
        polygon.forEach((pt, idx) => {
          const x = pt.x - cx;
          const z = pt.y - cy;
          if (idx === 0) roofShape.moveTo(x, -z);
          else roofShape.lineTo(x, -z);
        });
        roofShape.closePath();

        // Extrude main building block
        const bldgHeight = Math.max(2.5, heightMeters);
        const extrudeSettings = {
          steps: 1,
          depth: bldgHeight,
          bevelEnabled: false,
        };
        const bldgGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
        bldgGeo.rotateX(Math.PI / 2); // Orient so depth is vertical
        bldgGeo.translate(0, bldgHeight, 0);

        // Building wall & roof materials
        const roofColor =
          roofType === 'metal_shed' ? 0x64748b : roofType === 'tile' ? 0xb45309 : 0xd1d5db;
        const bldgMat = new THREE.MeshStandardMaterial({
          color: roofColor,
          roughness: 0.85,
          metalness: roofType === 'metal_shed' ? 0.4 : 0.05,
        });
        const buildingMesh = new THREE.Mesh(bldgGeo, bldgMat);
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;
        buildingGroup.add(buildingMesh);

        // Parapet walls around roof perimeter
        if (parapetHeightMeters > 0.1 && roofType === 'rcc_flat') {
          const parapetMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
          for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            const dx = p2.x - p1.x;
            const dz = p2.y - p1.y;
            const wallLength = Math.sqrt(dx * dx + dz * dz);
            const wallAngle = Math.atan2(dz, dx);

            const wallGeo = new THREE.BoxGeometry(wallLength, parapetHeightMeters, 0.25);
            const wallMesh = new THREE.Mesh(wallGeo, parapetMat);
            wallMesh.position.set(
              (p1.x + p2.x) / 2 - cx,
              bldgHeight + parapetHeightMeters / 2,
              (p1.y + p2.y) / 2 - cy,
            );
            wallMesh.rotation.y = -wallAngle;
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            buildingGroup.add(wallMesh);
          }
        }

        // 3D Obstructions
        obstructions.forEach((obs) => {
          const obsX = obs.x - cx;
          const obsZ = obs.y - cy;
          const obsHeight = Math.max(0.6, obs.heightMeters || 1.5);
          const obsElevation = bldgHeight + obsHeight / 2;

          let obsMesh: THREE.Mesh | THREE.Group;

          if (obs.type === 'water_tank') {
            // Water Tank: Cylindrical Polyethylene / Sintex tank with black or blue body
            const tankGroup = new THREE.Group();
            const tankRadius = Math.max(0.6, obs.radius || 0.8);
            const tankGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, obsHeight, 20);
            const tankMat = new THREE.MeshStandardMaterial({
              color: 0x0284c7, // Sintex blue
              roughness: 0.3,
              metalness: 0.1,
            });
            const tankBody = new THREE.Mesh(tankGeo, tankMat);
            tankBody.castShadow = true;
            tankBody.receiveShadow = true;
            tankGroup.add(tankBody);

            // Tank lid cap
            const lidGeo = new THREE.CylinderGeometry(tankRadius * 0.5, tankRadius * 0.6, 0.2, 16);
            const lidMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
            const lid = new THREE.Mesh(lidGeo, lidMat);
            lid.position.y = obsHeight / 2 + 0.1;
            tankGroup.add(lid);

            tankGroup.position.set(obsX, obsElevation, obsZ);
            obsMesh = tankGroup;
          } else if (obs.type === 'ac_unit') {
            // AC Outdoor Unit: Box with vent grille
            const acGeo = new THREE.BoxGeometry(obs.width || 1.0, obsHeight, obs.length || 0.6);
            const acMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.5 });
            obsMesh = new THREE.Mesh(acGeo, acMat);
            obsMesh.position.set(obsX, obsElevation, obsZ);
            obsMesh.castShadow = true;
            obsMesh.receiveShadow = true;
          } else if (obs.type === 'tree') {
            // Tree: Trunk + foliage
            const treeGroup = new THREE.Group();
            const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, obsHeight * 0.6, 8);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = -obsHeight * 0.2;
            trunk.castShadow = true;
            treeGroup.add(trunk);

            const foliageGeo = new THREE.ConeGeometry(Math.max(1.5, obs.radius || 2), obsHeight * 0.8, 10);
            const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.y = obsHeight * 0.3;
            foliage.castShadow = true;
            treeGroup.add(foliage);

            treeGroup.position.set(obsX, obsElevation, obsZ);
            obsMesh = treeGroup;
          } else {
            // Staircase Mumty or Box Obstruction
            const boxGeo = new THREE.BoxGeometry(obs.width || 2.5, obsHeight, obs.length || 2.5);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
            obsMesh = new THREE.Mesh(boxGeo, boxMat);
            obsMesh.position.set(obsX, obsElevation, obsZ);
            obsMesh.castShadow = true;
            obsMesh.receiveShadow = true;
          }

          buildingGroup.add(obsMesh);
        });

        // 3D Solar Panels
        const panelWidth = 1.134; // meters
        const panelLength = 2.278; // meters
        const radTilt = (tilt * Math.PI) / 180;
        const radAzimuth = ((azimuth - 180) * Math.PI) / 180; // 180 = True South

        const structureElev = structureProfile === 'c_channel_elevated' ? structureHeightM || 1.8 : 0.2;

        panels.forEach((p, idx) => {
          const panelGroup = new THREE.Group();
          const px = p.x - cx;
          const pz = p.y - cy;
          const py = bldgHeight + structureElev;

          // Panel Glass Face (Deep solar blue)
          const faceGeo = new THREE.BoxGeometry(panelWidth, 0.04, panelLength);
          const faceMat = new THREE.MeshStandardMaterial({
            color: 0x133863,
            roughness: 0.15,
            metalness: 0.8,
            envMapIntensity: 1.2,
          });
          const faceMesh = new THREE.Mesh(faceGeo, faceMat);
          faceMesh.name = 'panel_face';
          faceMesh.castShadow = true;
          faceMesh.receiveShadow = true;
          panelGroup.add(faceMesh);

          // Aluminum Frame Edges (Silver grey)
          const edges = new THREE.EdgesGeometry(faceGeo);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xd1d5db, linewidth: 2 });
          const wireframe = new THREE.LineSegments(edges, lineMat);
          panelGroup.add(wireframe);

          // Elevated Structure Legs (C-channel steel stanchions)
          if (structureElev > 0.4) {
            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, structureElev, 6);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 });

            const leg1 = new THREE.Mesh(legGeo, legMat);
            leg1.position.set(panelWidth / 3, -structureElev / 2, panelLength / 3);
            leg1.castShadow = true;
            panelGroup.add(leg1);

            const leg2 = new THREE.Mesh(legGeo, legMat);
            leg2.position.set(-panelWidth / 3, -structureElev / 2, -panelLength / 3);
            leg2.castShadow = true;
            panelGroup.add(leg2);
          }

          // Orient panel tilt and azimuth
          panelGroup.position.set(px, py, pz);
          panelGroup.rotation.y = -radAzimuth;
          panelGroup.rotation.x = radTilt;

          buildingGroup.add(panelGroup);
          panelMeshesRef.current.set(p.id || `panel_${idx}`, panelGroup);
        });

        // 3D Inverter Unit
        if (inverterPosition) {
          const invGroup = new THREE.Group();
          const invGeo = new THREE.BoxGeometry(0.6, 0.8, 0.25);
          const invMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });
          const invBody = new THREE.Mesh(invGeo, invMat);
          invBody.castShadow = true;
          invGroup.add(invBody);

          // Inverter Status Display Screen
          const screenGeo = new THREE.PlaneGeometry(0.25, 0.15);
          const screenMat = new THREE.MeshBasicMaterial({ color: 0x059669 });
          const screen = new THREE.Mesh(screenGeo, screenMat);
          screen.position.set(0, 0.15, 0.13);
          invGroup.add(screen);

          invGroup.position.set(inverterPosition.x - cx, inverterPosition.y || bldgHeight + 0.5, inverterPosition.z - cy);
          buildingGroup.add(invGroup);
        }

        scene.add(buildingGroup);
        targetRef.current.set(0, bldgHeight / 2, 0);
      }

      updateSunPosition(currentTime, currentSeason);
    }, [
      polygon,
      roofType,
      heightMeters,
      parapetHeightMeters,
      obstructions,
      panels,
      azimuth,
      tilt,
      structureProfile,
      structureHeightM,
      inverterPosition,
      currentTime,
      currentSeason,
      updateSunPosition,
    ]);

    // Handle Time Play/Pause Sweep Animation
    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentTime((prev) => {
            const next = prev >= 18.0 ? 8.0 : Math.round((prev + 0.2) * 10) / 10;
            updateSunPosition(next, currentSeason);
            return next;
          });
        }, 150);
      }
      return () => clearInterval(interval);
    }, [isPlaying, currentSeason, updateSunPosition]);

    // Mouse & Touch Controls
    const handleMouseDown = (e: React.MouseEvent) => {
      if (!isInteractive) return;
      if (allowInverterPlacement && onInverterPlace && rendererRef.current && cameraRef.current && sceneRef.current) {
        // Raycast to place inverter on building wall
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        if (buildingGroupRef.current) {
          const intersects = raycaster.intersectObjects(buildingGroupRef.current.children, true);
          if (intersects.length > 0) {
            const hit = intersects[0];
            onInverterPlace({
              x: hit.point.x,
              y: hit.point.y,
              z: hit.point.z,
              mountedSide: 'south',
              wallMounted: true,
            });
            return;
          }
        }
      }

      isDraggingRef.current = e.button === 0;
      isPanningRef.current = e.button === 2;
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingRef.current && !isPanningRef.current) return;
      const dx = e.clientX - mousePosRef.current.x;
      const dy = e.clientY - mousePosRef.current.y;
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      if (isDraggingRef.current) {
        // Orbit rotation
        sphericalRef.current.theta -= dx * 0.008;
        sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - dy * 0.008));
      } else if (isPanningRef.current) {
        // Pan
        targetRef.current.x -= dx * 0.04;
        targetRef.current.z -= dy * 0.04;
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
      if (!isInteractive) return;
      e.preventDefault();
      sphericalRef.current.radius = Math.max(10, Math.min(80, sphericalRef.current.radius + e.deltaY * 0.04));
    };

    // Public Imperative Handle
    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return '';
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        return rendererRef.current.domElement.toDataURL('image/png');
      },
      setTimeAndSeason: (hour: number, season: SeasonType) => {
        setCurrentTime(hour);
        setCurrentSeason(season);
        updateSunPosition(hour, season);
      },
      resetView: () => {
        sphericalRef.current = { radius: 35, theta: Math.PI / 4, phi: Math.PI / 3.5 };
        targetRef.current.set(0, heightMeters / 2, 0);
      },
      setTopView: () => {
        sphericalRef.current = { radius: 38, theta: 0, phi: 0.05 };
        targetRef.current.set(0, heightMeters / 2, 0);
      },
    }));

    return (
      <div className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 ${className}`}>
        {/* WebGL Canvas Container */}
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Top Controls Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white text-xs flex items-center gap-2 shadow-lg">
            <Compass className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Azimuth:</span>
            <span className="font-mono text-amber-300 font-bold">{azimuth}°</span>
            <span className="text-slate-400 text-[10px]">({azimuth === 180 ? 'True South' : `${azimuth}°`})</span>
          </div>

          <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-white text-xs flex items-center gap-2 shadow-lg">
            <span className="font-semibold text-slate-200">Tilt:</span>
            <span className="font-mono text-emerald-400 font-bold">{tilt}°</span>
          </div>

          {/* Real-time Shading Badge */}
          <div
            className={`backdrop-blur-md px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 shadow-lg ${
              shadingMetric.pct === 0
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : shadingMetric.pct < 15
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full animate-ping bg-current" />
            <span className="font-semibold">Shading:</span>
            <span className="font-mono font-bold">{shadingMetric.pct}%</span>
            <span className="text-[10px] opacity-80">({shadingMetric.shaded}/{shadingMetric.total} panels)</span>
          </div>
        </div>

        {/* View Mode Quick Buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => {
              sphericalRef.current = { radius: 35, theta: Math.PI / 4, phi: Math.PI / 3.5 };
            }}
            title="Reset Perspective 3D View"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md transition-all shadow-md active:scale-95"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              sphericalRef.current = { radius: 38, theta: 0, phi: 0.05 };
            }}
            title="Top-Down Satellite View"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md transition-all shadow-md active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              sphericalRef.current.radius = Math.max(10, sphericalRef.current.radius - 6);
            }}
            title="Zoom In"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md transition-all shadow-md active:scale-95"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              sphericalRef.current.radius = Math.min(80, sphericalRef.current.radius + 6);
            }}
            title="Zoom Out"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md transition-all shadow-md active:scale-95"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Sun & Shadow Analysis Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-2xl pointer-events-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Season Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Season:</span>
              <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                {(['summer', 'equinox', 'winter'] as SeasonType[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setCurrentSeason(s);
                      updateSunPosition(currentTime, s);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                      currentSeason === s ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day Slider & Play/Pause */}
            <div className="flex-1 flex items-center gap-3 max-w-md">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1.5 rounded-lg border transition-all ${
                  isPlaying ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isPlaying ? 'Pause Sun Simulation' : 'Play Diurnal Sun Sweep'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Sun Time:
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {Math.floor(currentTime).toString().padStart(2, '0')}:
                    {Math.round((currentTime % 1) * 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <input
                  type="range"
                  min="8.0"
                  max="18.0"
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentTime(val);
                    updateSunPosition(val, currentSeason);
                  }}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

Solar3DViewport.displayName = 'Solar3DViewport';
