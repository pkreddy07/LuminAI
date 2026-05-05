import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { ConvaiClient } from 'convai-web-sdk';

// TODO: Replace with the keys from Step 1!
const CONVAI_API_KEY = "b3af4b38de956e650abecaf5ed81f4ca";
const CHARACTER_ID = "87162aea-488f-11f1-a794-42010a7be02e";

export default function InterviewAvatar({ currentQuestion }) {
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
    <div style={{ width: '100%', height: '500px', background: '#1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 1.5, 3], fov: 40 }}>
        
        {/* Cinematic Lighting */}
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        {/* The 3D Character Container */}
        {isReady && convaiClient && (
           <ConvaiModel client={convaiClient} /> 
        )}

        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 2} />
      </Canvas>
    </div>
  );
}

// Helper component to render the 3D character model
function ConvaiModel({ client }) {
  const avatarRef = useRef();

  // Load the model from public folder
  const { scene } = useGLTF('/model.glb');

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