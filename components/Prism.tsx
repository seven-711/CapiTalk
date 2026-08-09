'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

interface PrismProps {
  animationType?: 'rotate' | 'bounce' | 'wave' | 'pulse';
  timeScale?: number;
  height?: number;
  baseWidth?: number;
  scale?: number;
  hueShift?: number;
  colorFrequency?: number;
  noise?: number;
  glow?: number;
  className?: string;
  style?: React.CSSProperties;
}

const vertexShader = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uTimeScale;
  uniform float uHeight;
  uniform float uBaseWidth;
  uniform float uScale;
  uniform float uHueShift;
  uniform float uColorFrequency;
  uniform float uNoise;
  uniform float uGlow;

  varying vec2 vUv;

  vec3 maroonRgb(float t) {
    vec3 c1 = vec3(0.439, 0.102, 0.192); // #701a31 Maroon
    vec3 c2 = vec3(0.768, 0.117, 0.227); // #c41e3a Crimson
    vec3 c3 = vec3(1.000, 0.788, 0.000); // #ffc900 Gold
    return mix(mix(c1, c2, sin(t * uColorFrequency) * 0.5 + 0.5), c3, cos(t * uColorFrequency * 0.7) * 0.25 + 0.25);
  }

  void main() {
    vec2 st = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
    st *= 1.0 / max(uScale, 0.1);

    float t = uTime * uTimeScale;

    // Prism 3D rotation coordinates
    float angle = t;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 p = rot * st;

    // Triangular Prism Distance Field
    float k = sqrt(3.0);
    p.x = abs(p.x) - uBaseWidth * 0.08;
    p.y = p.y + uHeight * 0.04;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -1.5, 1.5);
    float d = -length(p) * sign(p.y);

    float edge = smoothstep(0.03, 0.0, abs(d));
    float glow = exp(-abs(d) * (6.0 - uGlow * 3.5)) * uGlow;

    vec3 col = maroonRgb(d * 8.0 + t + uHueShift);
    vec3 finalColor = col * (edge * 1.6 + glow);

    gl_FragColor = vec4(finalColor, clamp(edge * 0.9 + glow * 0.7, 0.0, 0.95));
  }
`;

export const Prism: React.FC<PrismProps> = ({
  animationType = 'rotate',
  timeScale = 0.5,
  height = 3.5,
  baseWidth = 5.5,
  scale = 3.6,
  hueShift = 0,
  colorFrequency = 1,
  noise = 0,
  glow = 1,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
    } catch (e) {
      return;
    }

    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.top = '0';
    gl.canvas.style.left = '0';
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.pointerEvents = 'none';

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [container.clientWidth, container.clientHeight] },
        uTimeScale: { value: timeScale },
        uHeight: { value: height },
        uBaseWidth: { value: baseWidth },
        uScale: { value: scale },
        uHueShift: { value: hueShift },
        uColorFrequency: { value: colorFrequency },
        uNoise: { value: noise },
        uGlow: { value: glow },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });

    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      program.uniforms.uTime.value = elapsed;
      renderer.render({ scene: mesh });
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (gl.canvas && gl.canvas.parentNode) {
        gl.canvas.parentNode.removeChild(gl.canvas);
      }
    };
  }, [timeScale, height, baseWidth, scale, hueShift, colorFrequency, noise, glow]);

  return <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={style} />;
};

export default Prism;
