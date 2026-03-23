import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Product } from '../../data/products';
import { motion, AnimatePresence } from 'motion/react';

interface PCVisualizerProps {
  build: { [key: string]: Product | null };
  currentStepId?: string;
}

function PCCase({ build, currentStepId, isExploded, isBooting }: PCVisualizerProps & { isExploded: boolean, isBooting: boolean }) {
  const group = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Group>(null);
  const cpuFanRef = useRef<THREE.Mesh>(null);
  const gpuFansRef = useRef<THREE.Group>(null);

  // Case Dimensions
  const caseWidth = 2.8;
  const caseHeight = 5.2;
  const caseDepth = 5.2;

  const fanColor = build.gpu || build.ram ? "#22c55e" : "#444";
  const bootColor = isBooting ? "#00ff00" : fanColor;

  useFrame((state) => {
    const speed = isBooting ? 0.5 : 0.05;
    if (fanRef.current) {
      fanRef.current.children.forEach((fan) => {
        fan.rotation.y += speed;
      });
    }
    if (cpuFanRef.current) {
      cpuFanRef.current.rotation.y += speed;
    }
    if (gpuFansRef.current) {
      gpuFansRef.current.children.forEach((fan) => {
        fan.rotation.y += speed * 1.2;
      });
    }
  });

  const getPos = (basePos: [number, number, number], offset: number): [number, number, number] => {
    if (!isExploded) return basePos;
    return [basePos[0] + offset, basePos[1], basePos[2]];
  };

  return (
    <group ref={group}>
      {/* Case Chassis - Glass Side Panel */}
      <mesh position={getPos([caseWidth / 2, 0, 0], 2.5)}>
        <boxGeometry args={[0.05, caseHeight, caseDepth]} />
        <meshStandardMaterial color="#fff" transparent opacity={0.1} metalness={1} roughness={0} />
      </mesh>

      {/* Case Frame - More structural */}
      <group>
        {/* Main Frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[caseWidth, caseHeight, caseDepth]} />
          <meshStandardMaterial color="#111" wireframe />
        </mesh>
        {/* Back Panel */}
        <mesh position={[-caseWidth / 2, 0, 0]}>
          <boxGeometry args={[0.05, caseHeight, caseDepth]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Top Panel */}
        <mesh position={[0, caseHeight / 2, 0]}>
          <boxGeometry args={[caseWidth, 0.05, caseDepth]} />
          <meshStandardMaterial color="#111" metalness={0.5} />
        </mesh>
        {/* Bottom PSU Shroud */}
        <mesh position={[0, -caseHeight / 2 + 0.6, 0]}>
          <boxGeometry args={[caseWidth - 0.1, 1.2, caseDepth - 0.1]} />
          <meshStandardMaterial color="#080808" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Cable Grommets */}
        {[0.8, -0.8].map((z) => (
          <mesh key={z} position={[-caseWidth / 2 + 0.25, 0, z]}>
            <boxGeometry args={[0.02, 0.6, 0.2]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        ))}
        {/* Top I/O Ports */}
        <group position={[0, caseHeight / 2 + 0.02, 1.5]}>
          {[0, 0.2, 0.4].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <boxGeometry args={[0.1, 0.05, 0.1]} />
              <meshStandardMaterial color="#333" metalness={1} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Motherboard (Detailed) */}
      <group position={getPos([-caseWidth / 2 + 0.2, 0.4, 0], -0.5)}>
        {/* PCB */}
        <mesh>
          <boxGeometry args={[0.1, 4, 3.5]} />
          <meshStandardMaterial 
            color={build.motherboard ? "#121212" : "#050505"} 
            emissive={currentStepId === 'motherboard' ? "#22c55e" : "#000"}
            emissiveIntensity={0.8}
          />
        </mesh>
        {/* Rear I/O Shield */}
        <mesh position={[0, 1.2, -1.6]}>
          <boxGeometry args={[0.2, 1.2, 0.6]} />
          <meshStandardMaterial color="#333" metalness={1} />
        </mesh>
        {/* Heatsinks */}
        <mesh position={[0.1, 1.5, 0.5]}>
          <boxGeometry args={[0.2, 0.8, 1.2]} />
          <meshStandardMaterial color="#222" metalness={1} />
        </mesh>
        <mesh position={[0.1, 1.2, -1.2]}>
          <boxGeometry args={[0.2, 1.2, 0.5]} />
          <meshStandardMaterial color="#222" metalness={1} />
        </mesh>
        {/* PCIe Slots */}
        {[0, -0.8, -1.6].map((y) => (
          <mesh key={y} position={[0.1, y, 0.5]}>
            <boxGeometry args={[0.15, 0.1, 2.5]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))}
        {/* RAM Slots */}
        {[1.6, 1.8, 2.0, 2.2].map((z) => (
          <mesh key={z} position={[0.1, 1.8, z - 0.2]}>
            <boxGeometry args={[0.12, 1.6, 0.05]} />
            <meshStandardMaterial color="#080808" />
          </mesh>
        ))}
      </group>

      {/* CPU Cooler (Detailed Air Cooler) */}
      {build.cpu && (
        <group position={getPos([-caseWidth / 2 + 0.8, 1.2, 0.5], 1)}>
          {/* Fin Stack */}
          {[...Array(15)].map((_, i) => (
            <mesh key={i} position={[i * 0.05, 0, 0]}>
              <boxGeometry args={[0.02, 1.2, 1.2]} />
              <meshStandardMaterial color="#666" metalness={1} roughness={0.1} />
            </mesh>
          ))}
          {/* Heatpipes */}
          {[0.3, -0.3].map((z) => (
            <mesh key={z} position={[0.4, -0.6, z]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
              <meshStandardMaterial color="#cd7f32" metalness={1} />
            </mesh>
          ))}
          {/* Fan */}
          <group position={[0.8, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh ref={cpuFanRef}>
              <cylinderGeometry args={[0.55, 0.55, 0.1, 32]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <ringGeometry args={[0.45, 0.55, 32]} />
              <meshStandardMaterial color={bootColor} emissive={bootColor} emissiveIntensity={isBooting ? 4 : 2} />
            </mesh>
          </group>
        </group>
      )}

      {/* GPU (Detailed Triple Fan) */}
      {build.gpu && (
        <group position={getPos([-caseWidth / 2 + 1.2, -0.2, 0.5], 1.5)}>
          {/* Shroud */}
          <mesh>
            <boxGeometry args={[0.8, 1.2, 4]} />
            <meshStandardMaterial 
              color="#0a0a0a" 
              metalness={1} 
              roughness={0.2} 
              emissive={currentStepId === 'gpu' ? "#22c55e" : "#000"}
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Backplate */}
          <mesh position={[-0.45, 0, 0]}>
            <boxGeometry args={[0.05, 1.2, 4]} />
            <meshStandardMaterial color="#111" metalness={0.9} />
          </mesh>
          {/* Fans */}
          <group ref={gpuFansRef} position={[0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            {[-1.2, 0, 1.2].map((z, i) => (
              <mesh key={i} position={[z, 0, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
                <meshStandardMaterial color="#050505" />
              </mesh>
            ))}
          </group>
          {/* RGB Strip */}
          <mesh position={[0.41, 0.5, 0]}>
            <boxGeometry args={[0.01, 0.05, 3.5]} />
            <meshStandardMaterial color={bootColor} emissive={bootColor} emissiveIntensity={isBooting ? 5 : 3} />
          </mesh>
        </group>
      )}

      {/* RAM (Detailed with Heatspreaders) */}
      {build.ram && (
        <group position={getPos([-caseWidth / 2 + 0.5, 1.8, 1.8], 0.5)}>
          {[...Array(4)].map((_, i) => (
            <group key={i} position={[0, 0, i * 0.2]}>
              <mesh>
                <boxGeometry args={[0.08, 1.4, 0.1]} />
                <meshStandardMaterial 
                  color="#1a1a1a" 
                  metalness={1} 
                  emissive={currentStepId === 'ram' ? "#22c55e" : "#000"}
                  emissiveIntensity={0.8}
                />
              </mesh>
              {/* RGB Top */}
              <mesh position={[0, 0.7, 0]}>
                <boxGeometry args={[0.09, 0.05, 0.1]} />
                <meshStandardMaterial color={bootColor} emissive={bootColor} emissiveIntensity={isBooting ? 4 : 2} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* PSU (Inside Shroud) */}
      {build.psu && (
        <group position={getPos([0, -caseHeight / 2 + 0.6, -caseDepth / 2 + 1.2], 0.5)}>
          <mesh>
            <boxGeometry args={[caseWidth - 0.4, 1.1, 2.2]} />
            <meshStandardMaterial 
              color="#050505" 
              emissive={currentStepId === 'psu' ? "#22c55e" : "#000"}
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Cables (Simplified) */}
          <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.5, 8]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        </group>
      )}

      {/* Storage (M.2 on Motherboard) */}
      {build.storage && (
        <mesh position={getPos([-caseWidth / 2 + 0.35, 0.2, 0.5], 0.2)}>
          <boxGeometry args={[0.05, 0.15, 0.8]} />
          <meshStandardMaterial 
            color="#222" 
            metalness={0.8} 
            emissive={currentStepId === 'storage' ? "#22c55e" : "#000"}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}

      {/* Front Fans (Detailed) */}
      <group ref={fanRef}>
        {[...Array(3)].map((_, i) => (
          <group key={i} position={[caseWidth / 2 - 0.1, 1.6 - i * 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh>
              <cylinderGeometry args={[0.7, 0.7, 0.15, 32]} />
              <meshStandardMaterial color="#0a0a0a" transparent opacity={0.9} />
            </mesh>
            {/* Blades (Simplified) */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.65, 0.7, 32]} />
              <meshStandardMaterial color={bootColor} emissive={bootColor} emissiveIntensity={isBooting ? 3 : 1.5} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

export default function PCVisualizer({ build, currentStepId }: PCVisualizerProps) {
  const isComplete = Object.values(build).filter(Boolean).length === 7;
  const [isExploded, setIsExploded] = useState(false);
  const [isBooting, setIsBooting] = useState(false);

  const handleBoot = () => {
    if (!isComplete) return;
    setIsBooting(true);
    setTimeout(() => setIsBooting(false), 5000);
  };

  return (
    <div className="w-full h-[600px] bg-[#0a0a0a] rounded-3xl overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] group/canvas">
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none z-10 p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-bold uppercase tracking-[0.3em] text-green-500 flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
              Real-Time 3D Blueprint
            </motion.div>
            <h2 className="text-white text-2xl font-bold tracking-tighter uppercase italic">NEXUS Core <span className="text-white/20">v2.5</span></h2>
          </div>
          
          <div className="text-right space-y-4 pointer-events-auto">
            <div className="space-y-1">
              <div className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Interactive Viewport</div>
              <div className="flex gap-2 justify-end">
                <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-green-500" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(Object.values(build).filter(Boolean).length / 7) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setIsExploded(!isExploded)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${
                  isExploded ? 'bg-green-600 border-green-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                {isExploded ? 'Collapse View' : 'Exploded View'}
              </button>
              
              {isComplete && (
                <button 
                  onClick={handleBoot}
                  disabled={isBooting}
                  className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${
                    isBooting ? 'bg-green-500/20 border-green-500 text-green-500 animate-pulse' : 'bg-green-600 border-green-500 text-white hover:bg-green-700'
                  }`}
                >
                  {isBooting ? 'System Booting...' : 'Initiate Boot'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {Object.entries(build).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-1 h-1 rounded-full transition-all duration-500 ${value ? 'bg-green-500 scale-150 shadow-[0_0_10px_#22c55e]' : 'bg-white/10'}`}></div>
                <span className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors duration-500 ${value ? 'text-white' : 'text-white/20'} ${currentStepId === key ? 'text-green-400' : ''}`}>
                  {key}
                </span>
              </div>
            ))}
          </div>

          <div className="text-right">
            <AnimatePresence mode="wait">
              {isBooting ? (
                <motion.div
                  key="booting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="space-y-2"
                >
                  <div className="text-green-500 font-black text-3xl tracking-tighter uppercase italic animate-pulse">NEXUS OS</div>
                  <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Kernel Loading...</div>
                </motion.div>
              ) : isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <div className="text-green-500 font-black text-xl tracking-tighter uppercase italic">System Optimized</div>
                  <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest">All components verified</div>
                </motion.div>
              ) : (
                <motion.div
                  key="incomplete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="text-white/20 font-black text-xl tracking-tighter uppercase italic">Configuration Incomplete</div>
                  <div className="text-white/10 text-[9px] font-bold uppercase tracking-widest">Awaiting hardware selection</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[12, 6, 12]} fov={30} />
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 10, 30]} />
        
        <ambientLight intensity={0.4} />
        <spotLight position={[15, 20, 15]} angle={0.15} penumbra={1} intensity={3} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
        <directionalLight position={[0, 10, 0]} intensity={1} />
        
        <Stage environment="city" intensity={0.5} shadows="contact" adjustCamera={false}>
          <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
            <PCCase build={build} currentStepId={currentStepId} isExploded={isExploded} isBooting={isBooting} />
          </Float>
        </Stage>

        {/* Reflective Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial 
            color="#080808" 
            metalness={0.9} 
            roughness={0.1} 
            transparent 
            opacity={0.8} 
          />
        </mesh>

        <OrbitControls 
          enablePan={false} 
          minDistance={8}
          maxDistance={25}
          minPolarAngle={Math.PI / 6} 
          maxPolarAngle={Math.PI / 2} 
          autoRotate={!isComplete && !isExploded && !isBooting}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
    </div>
  );
}
