import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';
import * as THREE from 'three';

// 固定値
const SCENE = {
  sx: -3.21, sy: 0.89, sz: -0.07, sRotY: 1.62, sScale: 2.81,
  tScale: 1.26,
  mx: -0.40, my: -0.22, mz: -0.06, mRotY: 1.64, mScale: 0.90,
  cx: 0.614, cy: 0.578, cz: -0.017,
  sceneX: 0.00, panLR: 0.08, introStartX: 5.00,
};

function CameraIntro({ onDone }) {
  const { camera } = useThree();
  const progress = useRef(0);

  useEffect(() => {
    progress.current = 0;
    camera.position.set(SCENE.introStartX, SCENE.cy, SCENE.cz);
    camera.lookAt(-0.4, 0.4, 0);
  }, [camera]);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    progress.current += delta / 2.5;
    if (progress.current >= 1) {
      progress.current = 1;
      onDone?.();
    }
    const t = 1 - Math.pow(1 - progress.current, 3);
    camera.position.setX(SCENE.introStartX + (SCENE.cx - SCENE.introStartX) * t);
    camera.lookAt(-0.4, 0.4, 0);
  });

  return null;
}

function CameraFixed({ cam }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(cam.cx, cam.cy, cam.cz);
    camera.lookAt(-0.4, 0.4, 0);
    if (cam.panLR !== 0) {
      const right = new THREE.Vector3();
      camera.getWorldDirection(right);
      right.cross(camera.up).normalize();
      camera.position.addScaledVector(right, cam.panLR);
    }
  }, [camera, cam]);
  return null;
}

function BarModel() {
  const { scene } = useGLTF('/models/bar_scene.glb');
  const shelfRef = useRef();
  const tableRef = useRef();

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes('tmpadt4ej21obj') && !shelfRef.current) {
          shelfRef.current = child;
        }
        if (child.name.includes('tripo_node') && !tableRef.current) {
          tableRef.current = child;
        }
        if (child.material) {
          child.material.envMapIntensity = 0.6;
          child.material.needsUpdate = true;
        }
      }
    });

    if (shelfRef.current) {
      shelfRef.current.position.set(SCENE.sx, SCENE.sy, SCENE.sz);
      shelfRef.current.rotation.y = SCENE.sRotY;
      shelfRef.current.scale.setScalar(SCENE.sScale);
    }
    if (tableRef.current) {
      tableRef.current.scale.setScalar(SCENE.tScale);
    }
  }, [scene]);

  return <primitive object={scene} />;
}

function MasterModel({ animState, onAnimDone }) {
  const group = useRef();
  const { scene, animations } = useGLTF('/models/master.glb');
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    if (actions['idle']) {
      actions['idle'].reset().setLoop(THREE.LoopRepeat).setEffectiveTimeScale(0.7).fadeIn(0.5).play();
    }
    return () => {
      if (actions['idle']) actions['idle'].stop();
    };
  }, [actions]);

  useEffect(() => {
    if (!animState || animState === 'idle') return;

    const target = actions[animState];
    const idle = actions['idle'];
    if (!target || !idle) return;

    target.reset();
    target.setLoop(THREE.LoopOnce, 1);
    target.clampWhenFinished = true;
    idle.crossFadeTo(target, 0.4, true);
    target.play();

    const onFinish = () => {
      target.crossFadeTo(idle, 0.4, true);
      idle.reset().setLoop(THREE.LoopRepeat).setEffectiveTimeScale(0.7).play();
      onAnimDone?.();
      mixer.removeEventListener('finished', onFinish);
    };
    mixer.addEventListener('finished', onFinish);

    return () => {
      mixer.removeEventListener('finished', onFinish);
    };
  }, [animState, actions, mixer, onAnimDone]);

  return (
    <group ref={group} position={[SCENE.mx, SCENE.my, SCENE.mz]} rotation={[0, SCENE.mRotY, 0]} scale={SCENE.mScale}>
      <primitive object={scene} />
    </group>
  );
}

export default function BarScene({ animState, onAnimDone }) {
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="bar-scene">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
        }}
        camera={{
          fov: 40,
          near: 0.01,
          far: 50,
          position: [SCENE.introStartX, SCENE.cy, SCENE.cz],
        }}
      >
        <ambientLight intensity={0.12} color="#ffd4a0" />
        <spotLight position={[-0.4, 3, 1]} angle={0.6} penumbra={0.8} intensity={4} color="#ff9944" castShadow />
        <pointLight position={[-1.2, 1.5, -0.3]} intensity={2} color="#ffaa55" distance={5} decay={2} />
        <pointLight position={[0.2, 1.5, -0.3]} intensity={2} color="#ffaa55" distance={5} decay={2} />
        <pointLight position={[-0.4, 0.1, 1]} intensity={0.4} color="#ff8833" distance={3} decay={2} />

        <group position={[SCENE.sceneX, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0d0806" roughness={0.85} />
          </mesh>

          <Suspense fallback={null}>
            <BarModel />
            <MasterModel animState={animState} onAnimDone={onAnimDone} />
          </Suspense>
        </group>

        {!introDone && <CameraIntro onDone={() => setIntroDone(true)} />}
        {introDone && <CameraFixed cam={SCENE} />}

        <Environment preset="night" />
        <fog attach="fog" args={['#0a0505', 3, 10]} />
      </Canvas>
      <div className="scene-gradient-top" />
      <div className="scene-gradient-bottom" />
    </div>
  );
}

useGLTF.preload('/models/bar_scene.glb');
useGLTF.preload('/models/master.glb');
