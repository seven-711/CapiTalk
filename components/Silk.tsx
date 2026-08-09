'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

interface SilkProps {
  speed?: number;
  scale?: number;
  color?: string;
  noiseIntensity?: number;
  rotation?: number;
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
  uniform float uSpeed;
  uniform float uScale;
  uniform vec3 uColor;
  uniform float uNoiseIntensity;
  uniform float uRotation;

  varying vec2 vUv;

  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ) );
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 st = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
    st *= uScale;

    float rad = radians(uRotation);
    mat2 rotMat = mat2(cos(rad), -sin(rad), sin(rad), cos(rad));
    st = rotMat * st;

    float t = uTime * uSpeed * 0.1;
    float n1 = snoise(st * 3.0 + vec2(t, t * 0.8)) * uNoiseIntensity;
    float n2 = snoise(st * 6.0 - vec2(t * 1.2, t)) * (uNoiseIntensity * 0.5);

    float silkWave = sin(st.x * 4.0 + n1 * 2.0 + t) * cos(st.y * 4.0 + n2 * 2.0 + t * 0.7);
    float highlight = pow(smoothstep(-1.0, 1.0, silkWave), 2.5);

    vec3 goldAccent = vec3(1.0, 0.788, 0.0); // #ffc900
    vec3 finalColor = mix(uColor, goldAccent, highlight * 0.25) + vec3(highlight * 0.2);

    float alpha = clamp(0.75 + highlight * 0.25, 0.0, 0.95);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const Silk: React.FC<SilkProps> = ({
  speed = 5,
  scale = 1,
  color = '#701a31',
  noiseIntensity = 1.5,
  rotation = 0,
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
        uSpeed: { value: speed },
        uScale: { value: scale },
        uColor: { value: hexToRgb(color) },
        uNoiseIntensity: { value: noiseIntensity },
        uRotation: { value: rotation },
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

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

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
      resizeObserver.disconnect();
      if (gl.canvas && gl.canvas.parentNode) {
        gl.canvas.parentNode.removeChild(gl.canvas);
      }
    };
  }, [speed, scale, color, noiseIntensity, rotation]);

  return <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={style} />;
};

export default Silk;
