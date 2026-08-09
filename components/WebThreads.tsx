'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

interface WebThreadsProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  threadCount?: number;
  frequency?: number;
  spread?: number;
  taper?: number;
  position?: number;
  fanMode?: 'center' | 'left' | 'right';
  glow?: number;
  falloff?: number;
  thickness?: number;
  brightness?: number;
  opacity?: number;
  mirror?: boolean;
  shimmer?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  className?: string;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
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
  uniform vec2 uMouse;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uSpeed;
  uniform float uThreadCount;
  uniform float uFrequency;
  uniform float uSpread;
  uniform float uThickness;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uGrainIntensity;
  uniform bool uGrain;
  uniform bool uMirror;
  uniform float uMouseStrength;

  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 st = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
    if (uMirror) {
      st.x = abs(st.x);
    }

    vec2 mouseOffset = (uMouse - 0.5) * uMouseStrength;
    st += mouseOffset * 0.15;

    vec3 finalColor = vec3(0.0);
    float alphaAcc = 0.0;

    for (float i = 0.0; i < 16.0; i += 1.0) {
      if (i >= uThreadCount) break;

      float t = uTime * uSpeed * 0.5 + i * uSpread;
      float y = sin(st.x * uFrequency + t) * 0.2 + cos(st.x * uFrequency * 0.5 + t * 0.7) * 0.15;
      float dist = abs(st.y - y);

      float threadAlpha = smoothstep(uThickness * 0.05, 0.0, dist);
      float glowAlpha = exp(-dist * (15.0 - uGlow * 10.0)) * uGlow;

      float mixVal = i / max(uThreadCount - 1.0, 1.0);
      vec3 col = mix(uColor1, uColor2, mixVal);
      if (i > uThreadCount * 0.5) {
        col = mix(col, uColor3, (i - uThreadCount * 0.5) / (uThreadCount * 0.5));
      }

      finalColor += col * (threadAlpha * uBrightness + glowAlpha);
      alphaAcc += threadAlpha + glowAlpha * 0.5;
    }

    if (uGrain) {
      float noise = (random(st * uTime) - 0.5) * uGrainIntensity;
      finalColor += noise;
    }

    gl_FragColor = vec4(finalColor, min(alphaAcc * uOpacity, uOpacity));
  }
`;

export const WebThreads: React.FC<WebThreadsProps> = ({
  color1 = '#701a31',
  color2 = '#c41e3a',
  color3 = '#ffc900',
  speed = 0.2,
  threadCount = 6,
  frequency = 5,
  spread = 0.18,
  thickness = 1.1,
  brightness = 0.6,
  opacity = 1,
  glow = 0.02,
  grain = true,
  grainIntensity = 0.05,
  mirror = true,
  mouseInteraction = true,
  mouseStrength = 0.3,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);

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
        uMouse: { value: [0.5, 0.5] },
        uColor1: { value: hexToRgb(color1) },
        uColor2: { value: hexToRgb(color2) },
        uColor3: { value: hexToRgb(color3) },
        uSpeed: { value: speed },
        uThreadCount: { value: threadCount },
        uFrequency: { value: frequency },
        uSpread: { value: spread },
        uThickness: { value: thickness },
        uBrightness: { value: brightness },
        uOpacity: { value: opacity },
        uGlow: { value: glow },
        uGrain: { value: grain },
        uGrainIntensity: { value: grainIntensity },
        uMirror: { value: mirror },
        uMouseStrength: { value: mouseInteraction ? mouseStrength : 0.0 },
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

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteraction || !container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      mouseRef.current = [x, y];
    };

    if (mouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    let animationFrameId: number;
    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      program.uniforms.uTime.value = elapsed;
      program.uniforms.uMouse.value = mouseRef.current;
      renderer.render({ scene: mesh });
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mouseInteraction) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      if (gl.canvas && gl.canvas.parentNode) {
        gl.canvas.parentNode.removeChild(gl.canvas);
      }
    };
  }, [
    color1,
    color2,
    color3,
    speed,
    threadCount,
    frequency,
    spread,
    thickness,
    brightness,
    opacity,
    glow,
    grain,
    grainIntensity,
    mirror,
    mouseInteraction,
    mouseStrength,
  ]);

  return <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={style} />;
};

export default WebThreads;
