import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { ConvaiClient } from 'convai-web-sdk';

// TODO: Replace with the keys from Step 1!
const CONVAI_API_KEY = "b3af4b38de956e650abecaf5ed81f4ca";
const CHARACTER_ID = "87162aea-488f-11f1-a794-42010a7be02e";

export default function InterviewAvatar({ currentQuestion, hideBackground, isAiSpeaking }) {
  const [convaiClient, setConvaiClient] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize the Convai Brain
    const client = new ConvaiClient({
      apiKey: CONVAI_API_KEY,
      characterId: CHARACTER_ID,
      enableAudio: true, 
    });

    setConvaiClient(client);
    setIsReady(true);

    return () => {
      // Cleanup if needed - ConvaiClient handles cleanup internally
      if (client && typeof client.close === 'function') {
        client.close();
      }
    };
  }, []);

  // Watch for new questions from the LLM backend!
  useEffect(() => {
    if (convaiClient && currentQuestion && isReady) {
      // Use the correct ConvaiClient API methods
      try {
        if (typeof convaiClient.sendTextChunk === 'function') {
          convaiClient.sendTextChunk(currentQuestion);
        } else if (typeof convaiClient.sendTextStream === 'function') {
          convaiClient.sendTextStream(currentQuestion);
        } else {
          console.warn('Neither sendTextChunk nor sendTextStream available');
        }
      } catch (error) {
        console.error('Error sending text to ConvaiClient:', error);
      }
    }
  }, [currentQuestion, convaiClient, isReady]);

  return (
    <div style={{ width: '100%', height: hideBackground ? '100%' : '500px', background: hideBackground ? 'transparent' : '#1a1a2e', borderRadius: hideBackground ? '0' : '12px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 1.65, 0.9], fov: 40 }}>
        
        {/* Cinematic Lighting & Office Background */}
        <Environment preset="apartment" background blur={0.8} />
        <ambientLight intensity={0.8} />
        <spotLight position={[0, 2, 2]} intensity={2} angle={0.5} penumbra={1} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        {/* The 3D Character Container */}
        {isReady && convaiClient && (
           <ConvaiModel client={convaiClient} isAiSpeaking={isAiSpeaking} /> 
        )}

        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          target={[0, 1.55, 0]} 
          minPolarAngle={Math.PI / 2} 
          maxPolarAngle={Math.PI / 2} 
        />
      </Canvas>
    </div>
  );
}

// Helper component to render the 3D character model
function ConvaiModel({ client, isAiSpeaking }) {
  const avatarRef = useRef();

  // Load the model from public folder
  const { scene } = useGLTF('/model2.glb');

  // Simple simulated lip-sync
  useFrame((state) => {
    if (!scene) return;

    // Find the mesh that actually has morph targets (typically the Head mesh)
    scene.traverse((node) => {
      if (node.isMesh && node.morphTargetDictionary) {
        
        // Find indices for common mouth-opening morph targets
        const morphTargets = [
          'jawOpen', 'mouthOpen', 'viseme_O', 'viseme_aa', 'viseme_a', 'v_aa'
        ];
        
        let targetIndex = -1;
        for (const name of morphTargets) {
          if (node.morphTargetDictionary[name] !== undefined) {
            targetIndex = node.morphTargetDictionary[name];
            break;
          }
        }

        // If we found a mouth morph target, animate it!
        if (targetIndex !== -1) {
          if (isAiSpeaking) {
            // Create a randomized flapping motion based on time
            const time = state.clock.getElapsedTime();
            // Use multiple sine waves combined to make it look like random speech syllables
            const speechPulse = (Math.sin(time * 15) * 0.5 + 0.5) * 0.5 + 
                                (Math.sin(time * 25) * 0.5 + 0.5) * 0.3 + 
                                (Math.sin(time * 8) * 0.5 + 0.5) * 0.2;
            
            // Apply it to the morph target array
            node.morphTargetInfluences[targetIndex] = speechPulse * 0.8;
          } else {
            // Smoothly close the mouth when not speaking
            node.morphTargetInfluences[targetIndex] *= 0.8;
          }
        }
      }
      
      // Bonus: If it has a jaw bone instead of morph targets, rotate it
      if (node.isBone && (node.name.toLowerCase().includes('jaw') || node.name === 'Jaw')) {
        if (isAiSpeaking) {
           const time = state.clock.getElapsedTime();
           const speechPulse = (Math.sin(time * 15) * 0.5 + 0.5) * 0.5 + (Math.sin(time * 25) * 0.5 + 0.5) * 0.3;
           // Rotate the jaw slightly downwards
           // You may need to tune the axis depending on the armature
           node.rotation.x = Math.max(0, speechPulse * 0.15); 
        } else {
           node.rotation.x *= 0.8;
        }
      }
    });

    // Slight breathing/idle animation for the whole avatar
    if (avatarRef.current) {
       const time = state.clock.getElapsedTime();
       // Subtle breathing
       avatarRef.current.position.y = Math.sin(time * 2) * 0.005;
       
       if (isAiSpeaking) {
          // Slight head bobbing while talking
          avatarRef.current.rotation.y = Math.sin(time * 1.5) * 0.02;
          avatarRef.current.rotation.x = Math.sin(time * 3) * 0.01;
       } else {
          // Return to center
          avatarRef.current.rotation.y *= 0.95;
          avatarRef.current.rotation.x *= 0.95;
       }
    }
  });

  return (
    <group ref={avatarRef}>
      {scene ? (
        <primitive object={scene.clone()} position={[0, 0, 0]} scale={1} />
      ) : (
        // Fallback: simple geometric character
        <>
          <mesh position={[0, 1.5, 0]} scale={0.6}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="#fdbcb4" />
          </mesh>
          <mesh position={[0, 0.5, 0]} scale={[0.5, 1, 0.3]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#4a90e2" />
          </mesh>
          <mesh position={[-0.6, 0.8, 0]} scale={[0.15, 0.8, 0.15]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#fdbcb4" />
          </mesh>
          <mesh position={[0.6, 0.8, 0]} scale={[0.15, 0.8, 0.15]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#fdbcb4" />
          </mesh>
        </>
      )}
    </group>
  );
}