'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const ShaderBackground: React.FC = () => {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (pathname === '/workspace') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    // Shader code
    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      varying vec2 v_texCoord;
      
      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      void main() {
          vec2 uv = v_texCoord;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;
      
          // Deep blue background colors
          vec3 color1 = vec3(0.015, 0.043, 0.121); // #040B1F
          vec3 color2 = vec3(0.027, 0.078, 0.180); // #07142E
          vec3 color3 = vec3(0.039, 0.117, 0.270); // #0A1E45
          
          // Primary gradient blues
          vec3 accent1 = vec3(0.0, 0.776, 1.0);    // #00C6FF
          vec3 accent2 = vec3(0.0, 0.447, 1.0);    // #0072FF
          
          float n = noise(uv * 3.0 + u_time * 0.1);
          n += 0.5 * noise(uv * 6.0 - u_time * 0.2);
          
          vec3 finalColor = mix(color1, color2, uv.y);
          
          // Aurora effect
          float aurora = smoothstep(0.4, 0.6, noise(vec2(uv.x * 2.0 + u_time * 0.05, uv.y * 1.5)));
          finalColor = mix(finalColor, accent2 * 0.3, aurora);
          
          // Glowing particles
          for(int i = 0; i < 8; i++) {
              float t = u_time * (0.1 + float(i) * 0.05);
              vec2 pos = vec2(hash(vec2(float(i), 1.0)), hash(vec2(float(i), 2.0)));
              pos.x += sin(t) * 0.2;
              pos.y += cos(t) * 0.2;
              float d = length(uv - pos);
              finalColor += accent1 * (0.001 / (d * d + 0.01));
          }
      
          // Grid pattern
          vec2 grid = fract(uv * 40.0);
          float line = smoothstep(0.0, 0.02, grid.x) * smoothstep(1.0, 0.98, grid.x) +
                       smoothstep(0.0, 0.02, grid.y) * smoothstep(1.0, 0.98, grid.y);
          finalColor += vec3(0.1, 0.2, 0.4) * (1.0 - line) * 0.1;
      
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vs);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Sync drawing-buffer size with layout size
    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncSize);
      observer.observe(canvas);
    }
    syncSize();

    let animFrameId: number;
    const render = (t: number) => {
      if (!observer) syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  if (pathname === '/workspace') return null;

  return (
    <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none" style={{ display: 'block' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
