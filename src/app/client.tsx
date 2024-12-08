"use client";

import {
  Canvas,
  extend,
  useFrame,
  useThree,
  useLoader,
} from "@react-three/fiber";
import { FC, useRef, useState } from "react";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const PixelShaderMaterial = shaderMaterial(
  {
    uTexture: null,
    uPixelSize: 10,
    uResolution: new THREE.Vector2(),
    uMouse: new THREE.Vector2(),
    uMouseSmooth: new THREE.Vector2(),
  },
  // vertexShader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`,
  // fragmentShader
  `
  uniform sampler2D uTexture;
  uniform float uPixelSize;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec2 uMouseSmooth;

  varying vec2 vUv;

  void main() {
    vec2 cellCount = uResolution / 30.0;
    vec2 cellUv = round(vUv * cellCount) / cellCount + (0.5 / cellCount);
    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 diff = (cellUv - uMouseSmooth) * aspectRatio;
    float dist = length(diff);
    vec2 mouseDelta = uMouse - uMouseSmooth;
    float dx = abs(mouseDelta.x);
    float dy = abs(mouseDelta.y);
    float speed = length(mouseDelta);
    float speedDecay = clamp(speed * 5.0, 0.0, 1.0);
    float radius = 0.2;
    float influence = smoothstep(0.0, radius, radius - dist) * speedDecay;
    vec2 direction = (speed > 0.000001) ? normalize(mouseDelta) : vec2(0.0);
    vec2 displacement = direction * (-300.0 * influence * length(uMouseSmooth));

    vec2 pixelatedUv = round(vUv * uResolution / uPixelSize) * uPixelSize / uResolution;
    vec2 finalUv = pixelatedUv + displacement / uResolution;
    vec4 color = texture2D(uTexture, finalUv);

    gl_FragColor = color;

    #include <colorspace_fragment>
  }
  `,
);

extend({ PixelShaderMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    pixelShaderMaterial: JSX.IntrinsicElements["shaderMaterial"] & {
      uTexture: THREE.Texture;
      uPixelSize: number;
      uResolution: THREE.Vector2;
    };
  }
}

interface ImageComponentProps {
  mouse: { x: number; y: number };
}

const ImageComponent: FC<ImageComponentProps> = ({ mouse }) => {
  const { viewport } = useThree((state) => state);
  const ref = useRef<THREE.ShaderMaterial>(null);
  const texture = useLoader(THREE.TextureLoader, "/photo.jpg");
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const aspectTexture = texture.image.width / texture.image.height;
  const aspectViewport = viewport.width / viewport.height;

  const scale =
    aspectViewport > aspectTexture
      ? [viewport.width, viewport.width / aspectTexture, 1]
      : [viewport.height * aspectTexture, viewport.height, 1];

  const frameCount = useRef(0);

  const smoothMouseRef = useRef({ x: 0, y: 0 });
  const firstMouseMove = useRef(true);

  useFrame(() => {
    frameCount.current += 1;
    if (ref.current) {
      ref.current.uniforms.uResolution.value.set(
        window.innerWidth,
        window.innerHeight,
      );
      if (frameCount.current % 10 === 0) {
        if (ref.current.uniforms.uPixelSize.value > 10) {
          ref.current.uniforms.uPixelSize.value -= 10;
        } else {
          ref.current.uniforms.uPixelSize.value = 0.001;
        }
      }

      smoothMouseRef.current.x = firstMouseMove.current
        ? mouse.x
        : THREE.MathUtils.lerp(smoothMouseRef.current.x, mouse.x, 0.1);
      smoothMouseRef.current.y = firstMouseMove.current
        ? mouse.y
        : THREE.MathUtils.lerp(smoothMouseRef.current.y, mouse.y, 0.1);

      ref.current.uniforms.uMouse.value = new THREE.Vector2(mouse.x, mouse.y);
      ref.current.uniforms.uMouseSmooth.value = new THREE.Vector2(
        smoothMouseRef.current.x,
        smoothMouseRef.current.y,
      );

      if (firstMouseMove.current && mouse.x !== 0 && mouse.y !== 0) {
        firstMouseMove.current = false;
      }
    }
  });

  return (
    <mesh scale={new THREE.Vector3(...scale)}>
      <planeGeometry />
      <pixelShaderMaterial
        ref={ref}
        uTexture={texture}
        uPixelSize={100}
        uResolution={new THREE.Vector2(viewport.width, viewport.height)}
      />
    </mesh>
  );
};

const Client = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  return (
    <Canvas
      className="w-screen h-screen"
      onPointerMove={(e) => {
        const x = e.clientX / window.innerWidth;
        const y = 1.0 - e.clientY / window.innerHeight;
        setMouse({ x, y });
      }}
    >
      <ImageComponent mouse={mouse} />
    </Canvas>
  );
};

export default Client;
