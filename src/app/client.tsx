"use client";

import {
  Canvas,
  extend,
  useFrame,
  useThree,
  useLoader,
} from "@react-three/fiber";
import { useRef } from "react";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const PixelShaderMaterial = shaderMaterial(
  {
    uTexture: null,
    uPixelSize: 10,
    uResolution: new THREE.Vector2(),
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

  varying vec2 vUv;

  void main() {
    vec2 pixelatedUv = round(vUv * uResolution / uPixelSize) * uPixelSize / uResolution;
    vec4 color = texture2D(uTexture, pixelatedUv);

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

const ImageComponent = () => {
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
  return (
    <Canvas className="w-screen h-screen">
      <ImageComponent />
    </Canvas>
  );
};

export default Client;
