'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useWorkspace, AgentStep } from '../components/WorkspaceProvider';

export default function WorkspaceDashboard() {
  const {
    activeStep,
    progress,
    logs,
    isBuilding,
    isDeployed,
    agents,
    triggerDeployment,
    toggleRoleSelection,
    confirmWorkforce,
    prompt,
  } = useWorkspace();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const finalCardRef = useRef<HTMLDivElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRatioRef = useRef(0);

  const [lineWidth, setLineWidth] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentStep | null>(null);
  const [modalTab, setModalTab] = useState<'flow' | 'logs' | 'metrics' | 'output'>('flow');
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'success' | 'warning'>('all');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [copiedArtifact, setCopiedArtifact] = useState(false);

  const openAgentInspector = (agent: AgentStep) => {
    setSelectedAgent(agent);
    setModalTab('flow');
    setLogFilter('all');
    setCopiedLogs(false);
    setCopiedArtifact(false);
  };

  // All cards (1 to 16) are rendered continuously
  const allAgents = agents;
  const isFinished = activeStep >= 17;

  // Refs for tracking smooth spring-based absolute left-coordinate scrolling states
  const targetLeftRef = useRef(0);
  const currentLeftRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Dynamic connecting line width adjustment (connects straight through card centers)
  useEffect(() => {
    const updateLineWidth = () => {
      const activeCard = activeCardRef.current;
      const finalCard = finalCardRef.current;

      if (activeCard) {
        setLineWidth(activeCard.offsetLeft + activeCard.clientWidth / 2);
      } else if (isFinished && finalCard) {
        setLineWidth(finalCard.offsetLeft + finalCard.clientWidth / 2);
      } else {
        setLineWidth(visibleAgentsLength() * 304 + 96);
      }
    };

    const animId = requestAnimationFrame(updateLineWidth);
    return () => cancelAnimationFrame(animId);
  }, [activeStep, isFinished]);

  const visibleAgentsLength = () => {
    return agents.filter((agent) => agent.id <= activeStep).length;
  };

  const updateBackgroundGradient = (leftOffset: number, container: HTMLDivElement, wrapper: HTMLDivElement) => {
    const viewportWidth = container.clientWidth;
    const wrapperWidth = wrapper.scrollWidth;
    const maxShift = Math.max(1, wrapperWidth - viewportWidth);
    const ratio = Math.min(1, Math.max(0, Math.abs(leftOffset) / maxShift));
    
    scrollRatioRef.current = ratio;
  };

  // Spring animation loop that updates wrapperRef.current.style.left with momentum/inertia ease
  const startSpringScrollLoop = (container: HTMLDivElement, wrapper: HTMLDivElement) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const loop = () => {
      const target = targetLeftRef.current;
      const current = currentLeftRef.current;
      const diff = target - current;

      // Stop loop when the spring rests close enough
      if (Math.abs(diff) < 0.5) {
        wrapper.style.left = `${target}px`;
        currentLeftRef.current = target;
        isAnimatingRef.current = false;
        updateBackgroundGradient(target, container, wrapper);
        return;
      }

      // Spring-based interpolation factor (0.08 provides smooth easing momentum)
      const nextLeft = current + diff * 0.08;
      wrapper.style.left = `${Math.round(nextLeft)}px`;
      currentLeftRef.current = nextLeft;
      updateBackgroundGradient(nextLeft, container, wrapper);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  // Horizontal scroll wheel listener - maps vertical wheel to absolute left-position scrolling
  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      // Allow vertical scrolling inside nested scrollable elements
      let target = e.target as HTMLElement | null;
      while (target && target !== container) {
        const style = window.getComputedStyle(target);
        const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
        if (isScrollable && target.scrollHeight > target.clientHeight) {
          const canScrollUp = target.scrollTop > 0 && e.deltaY < 0;
          const canScrollDown = target.scrollTop + target.clientHeight < target.scrollHeight && e.deltaY > 0;
          if (canScrollUp || canScrollDown) {
            return; // Let the element scroll vertically
          }
        }
        target = target.parentElement;
      }

      e.preventDefault();
      
      const viewportWidth = container.clientWidth;
      const wrapperWidth = wrapper.scrollWidth;
      const maxShift = Math.max(0, wrapperWidth - viewportWidth);

      // Wheel Down (deltaY > 0) -> scrolls right (wrapper left moves negative)
      // Wheel Up (deltaY < 0) -> scrolls left (wrapper left moves back to 0)
      targetLeftRef.current = Math.max(
        -maxShift,
        Math.min(0, targetLeftRef.current - e.deltaY * 1.5)
      );

      // Trigger the spring animation loop
      startSpringScrollLoop(container, wrapper);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Automatic camera follow: Focuses on the active card (positioned 28% from the left edge)
  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    const activeCard = activeCardRef.current;
    const finalCard = finalCardRef.current;

    const targetCard = activeCard || (isFinished ? finalCard : null);
    if (!container || !wrapper || !targetCard) return;

    const scrollAdjust = () => {
      const viewportWidth = container.clientWidth;
      const wrapperWidth = wrapper.scrollWidth;
      const maxShift = Math.max(0, wrapperWidth - viewportWidth);

      // Position the card approximately 28% from the left edge of the viewport
      const leftMargin = viewportWidth * 0.28;
      const targetLeft = -Math.max(0, Math.min(maxShift, targetCard.offsetLeft - leftMargin));

      // Update target coordinate for the absolute left scrolling system
      targetLeftRef.current = targetLeft;

      // Trigger/resume spring transition
      startSpringScrollLoop(container, wrapper);
    };

    // Run instantly on phase changes
    scrollAdjust();

    // Trigger follow recalculations during active card expansion animations to adapt viewport coordinates
    const timers = [100, 300, 500, 700].map((t) => setTimeout(scrollAdjust, t));

    return () => timers.forEach(clearTimeout);
  }, [activeStep, isFinished]);

  // Scroll logs container to bottom when new logs stream in
  useEffect(() => {
    const logContainer = logContainerRef.current;
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }, [logs]);

  // Set initial background gradient and keep in sync with activeStep transitions
  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (container && wrapper) {
      updateBackgroundGradient(currentLeftRef.current, container, wrapper);
    }
  }, [activeStep]);

  // WebGL Aurora Shader Canvas Initialization and Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

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
      uniform float u_scroll;
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

          // Apply a smooth ease-in-out S-curve to scroll progression
          float s = smoothstep(0.0, 1.0, u_scroll);

          // Deep space background colors - interpolate dynamically from near black to rich blue
          vec3 color1 = mix(vec3(0.002, 0.004, 0.01), vec3(0.027, 0.078, 0.180), s); // starts dark, ends deep blue
          vec3 color2 = mix(vec3(0.005, 0.01, 0.02), vec3(0.039, 0.117, 0.270), s);
          
          // Primary gradient blues - scale glows from zero to full electric blue intensity
          vec3 accent1 = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.776, 1.0), s);
          vec3 accent2 = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.447, 1.0), s);
          
          float n = noise(uv * 3.0 + u_time * 0.1);
          n += 0.5 * noise(uv * 6.0 - u_time * 0.2);
          
          vec3 finalColor = mix(color1, color2, uv.y);
          
          // Aurora effect
          float aurora = smoothstep(0.4, 0.6, noise(vec2(uv.x * 2.0 + u_time * 0.05, uv.y * 1.5)));
          finalColor = mix(finalColor, accent2 * 0.4, aurora * s);
          
          // Glowing particles
          for(int i = 0; i < 8; i++) {
              float t = u_time * (0.1 + float(i) * 0.05);
              vec2 pos = vec2(hash(vec2(float(i), 1.0)), hash(vec2(float(i), 2.0)));
              pos.x += sin(t) * 0.2;
              pos.y += cos(t) * 0.2;
              float d = length(uv - pos);
              finalColor += accent1 * ((0.002 * s) / (d * d + 0.01));
          }

          // Grid pattern - scales from dim dark lines to prominent grid glows
          vec2 grid = fract(uv * 40.0);
          float line = smoothstep(0.0, 0.02, grid.x) * smoothstep(1.0, 0.98, grid.x) +
                       smoothstep(0.0, 0.02, grid.y) * smoothstep(1.0, 0.98, grid.y);
          finalColor += mix(vec3(0.02, 0.04, 0.08), vec3(0.1, 0.2, 0.4), s) * (1.0 - line) * 0.1;

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
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
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
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
      if (uScroll) gl.uniform1f(uScroll, scrollRatioRef.current);
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

  // Circle SVG circular progress variables
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Helper for card border classes
  const getAgentBorderClass = (status: AgentStep['status']) => {
    switch (status) {
      case 'completed':
        return 'completed-agent border-primary/40';
      case 'active':
        return 'active-agent border-primary/50';
      case 'pending':
      case 'queued':
      default:
        return 'future-agent border-white/5';
    }
  };

  // Helper mock data to show inside the details modal
  const getAgentDetailFlow = (id: number) => {
    switch (id) {
      case 1:
        return {
          model: 'User-Directed Prompt Baseline',
          input: 'Raw text requirements from user input.',
          output: 'Baseline configuration schemas, feature matrix, and system bounds mapping.',
          inputNodeName: 'Raw User Text',
          outputNodeName: 'workspace_manifest.json',
          metrics: { quality: '100%', speed: 'Instant', tokens: '0', promptTokens: '0', completionTokens: '0', cost: '$0.0000' },
          logs: [
            '[09:40:02] [INFO] Listening for prompt submission...',
            '[09:40:03] [INFO] Prompt received: "Build a next-generation workspace designer..."',
            '[09:40:04] [SUCCESS] Initialized workspace specifications outline and dependencies tree.'
          ],
          outputFile: {
            name: 'workspace_manifest.json',
            type: 'JSON Data',
            size: '512 B',
            language: 'json',
            content: JSON.stringify({
              projectName: "Collabro Workspace UI",
              prompt: prompt || "Build a next-generation workflow designer with WebGL background shaders...",
              features: [
                "Horizontal canvas layout",
                "Dynamic connector lines",
                "Conic border card rotation",
                "WebGL grid-aurora shader"
              ],
              pipelineSteps: 16
            }, null, 2)
          }
        };
      case 2:
        return {
          model: 'Workforce Configurator UI',
          input: 'Roles definition panel settings.',
          output: 'Validated list of active developer and compiler agents.',
          inputNodeName: 'Configurator Form',
          outputNodeName: 'active_workforce.json',
          metrics: { quality: '100%', speed: 'User Input', tokens: '0', promptTokens: '0', completionTokens: '0', cost: '$0.0000' },
          logs: [
            '[09:41:10] [INFO] Opening workforce configurator selection...',
            '[09:41:15] [INFO] Toggled roles checkboxes and confirmed bounds...',
            '[09:41:20] [SUCCESS] Selected roles confirmed. Starting simulated agent run...'
          ],
          outputFile: {
            name: 'active_workforce.json',
            type: 'JSON Config',
            size: '256 B',
            language: 'json',
            content: JSON.stringify({
              selectedRoles: agents.filter(a => a.selected !== false).map(a => a.name),
              skippedRoles: agents.filter(a => a.selected === false).map(a => a.name),
              status: "Workforce Confirmed"
            }, null, 2)
          }
        };
      case 3:
        return {
          model: 'Minimax',
          input: 'Baseline configuration parameters.',
          output: 'Business Specifications Document and User Flow Index.',
          inputNodeName: 'Prompt Config',
          outputNodeName: 'business_specs.md',
          metrics: { quality: '98%', speed: '1.2s', tokens: '8.2k', promptTokens: '6,200', completionTokens: '2,040', cost: '$0.0412' },
          logs: [
            '[09:42:01] [INFO] Drafting functional requirements specifications...',
            '[09:42:05] [INFO] Mapping business user flows and edge cases...',
            '[09:42:10] [SUCCESS] Completed Business Specifications document.'
          ],
          outputFile: {
            name: 'business_specs.md',
            type: 'Markdown Text',
            size: '2.4 KB',
            language: 'markdown',
            content: `# Business Requirements Document (BRD)

## 1. Project Goal
The objective is to construct a cinematic, premium horizontal workspace canvas for Collabro AI to represent production pipelines.

## 2. Key Features
- Horizontal canvas animation with spring physics (ease-in-out scroll models).
- Dynamic glowing neon connector lines mapping to the active card centers.
- Conic gradient borders on active cards representing compile actions.
- WebGL Grid background shaders representation.

## 3. Product Constraints
- Vertical wheel gesture acts as horizontal canvas scrolling modifier.
- Sequential card reveals: only show cards for steps <= activeStep.
`
          }
        };
      case 4:
        return {
          model: 'Minimax',
          input: 'Business specifications document.',
          output: 'Agile sprints, milestone tasks lists, and assignee mappings.',
          inputNodeName: 'business_specs.md',
          outputNodeName: 'sprint_tasks.json',
          metrics: { quality: '95%', speed: '1.8s', tokens: '14.2k', promptTokens: '11,400', completionTokens: '2,800', cost: '$0.0526' },
          logs: [
            '[09:42:15] [INFO] Planning task stories & sprint epics...',
            '[09:42:19] [INFO] Orchestrating milestone allocations and schedules...',
            '[09:42:25] [SUCCESS] Sprint timeline generated and locked in.'
          ],
          outputFile: {
            name: 'sprint_tasks.json',
            type: 'JSON Tasks',
            size: '3.1 KB',
            language: 'json',
            content: JSON.stringify({
              sprints: [
                {
                  id: 1,
                  name: "Sprint 1: Canvas Layouts",
                  tasks: [
                    "Setup globals.css Tailwind configuration",
                    "Build horizontal canvas view and absolute positioning wrappers",
                    "Write requestAnimationFrame spring momentum hooks"
                  ],
                  assignee: "Frontend Developer",
                  status: "Completed"
                },
                {
                  id: 2,
                  name: "Sprint 2: Logic & Environment Shaders",
                  tasks: [
                    "Implement WorkspaceProvider state managers",
                    "Compile WebGL auroral background shader component"
                  ],
                  assignee: "System Architect & UI Designer",
                  status: "Completed"
                }
              ]
            }, null, 2)
          }
        };
      case 5:
        return {
          model: 'Minimax',
          input: 'Sprint tasks and project roadmaps.',
          output: 'Solution architecture blueprints, component diagrams, and database layout specifications.',
          inputNodeName: 'sprint_tasks.json',
          outputNodeName: 'architecture.json',
          metrics: { quality: '99%', speed: '2.1s', tokens: '18.4k', promptTokens: '14,200', completionTokens: '4,200', cost: '$0.0210' },
          logs: [
            '[09:43:02] [INFO] Mapping route architecture parameters...',
            '[09:43:08] [INFO] Designing component blocks interfaces...',
            '[09:43:15] [SUCCESS] Compiled Solution Architecture document.'
          ],
          outputFile: {
            name: 'architecture.json',
            type: 'JSON Architecture',
            size: '1.8 KB',
            language: 'json',
            content: JSON.stringify({
              architectureStyle: "SPA Client-Side Dashboard",
              modules: {
                WorkspaceCanvas: "Coordinates absolute coordinates with inertia algorithms",
                WebGLShader: "Renders canvas grids with float-based fragment uniforms",
                TelemetryLogs: "Buffers output console logs on interval updates"
              },
              datastores: {
                SessionState: "React Context Store API hooks"
              }
            }, null, 2)
          }
        };
      case 6:
        return {
          model: 'Minimax',
          input: 'Solution architecture blueprints.',
          output: 'CSS color maps, border variables, grid spacing parameters, and animation curves.',
          inputNodeName: 'architecture.json',
          outputNodeName: 'design_tokens.json',
          metrics: { quality: '92%', speed: '1.5s', tokens: '10.1k', promptTokens: '8,200', completionTokens: '1,900', cost: '$0.0343' },
          logs: [
            '[09:43:20] [INFO] Resolving glassmorphic color gradients themes...',
            '[09:43:25] [INFO] Configuring Tailwind CSS overrides parameters...',
            '[09:43:30] [SUCCESS] Created Design Tokens manifest.'
          ],
          outputFile: {
            name: 'design_tokens.json',
            type: 'JSON Styles',
            size: '890 B',
            language: 'json',
            content: JSON.stringify({
              theme: "Dark Slate Glass",
              colors: {
                primary: "#afc6ff",
                secondary: "#60d4fa",
                background: "#040b1f"
              },
              animations: {
                activeFloat: "floatActive 4s ease-in-out infinite",
                borderGlow: "spin 4s linear infinite"
              },
              filters: {
                glassBlur: "blur(20px)",
                upcomingBlur: "blur(0.5px)"
              }
            }, null, 2)
          }
        };
      case 7:
        return {
          model: 'Minimax',
          input: 'Design tokens and layout parameters.',
          output: 'Next.js App router dashboard JSX and CSS layouts.',
          inputNodeName: 'design_tokens.json',
          outputNodeName: 'page.tsx',
          metrics: { quality: '97%', speed: '3.4s', tokens: '24.2k', promptTokens: '18,500', completionTokens: '5,700', cost: '$0.0842' },
          logs: logs.map(l => `[${l.time}] [INFO] ${l.message}`),
          outputFile: {
            name: 'page.tsx',
            type: 'React Component',
            size: '12.4 KB',
            language: 'tsx',
            content: `'use client';

import React, { useRef, useEffect } from 'react';
import { useWorkspace } from '../components/WorkspaceProvider';

export default function WorkspaceDashboard() {
  const { activeStep, progress, logs } = useWorkspace();
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Spring scrolling coordinates calculation
  useEffect(() => {
    // horizontal scroll wheel gestures translation
  }, []);
  
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Absolute canvas wrapper containing agent cards */}
    </div>
  );
}`
          }
        };
      case 8:
        return {
          model: 'Minimax',
          input: 'Solution blueprints and API requirements.',
          output: 'Express/Next.js API route handlers controllers.',
          inputNodeName: 'architecture.json',
          outputNodeName: 'route.ts',
          metrics: { quality: '96%', speed: '2.5s', tokens: '15.2k', promptTokens: '12,200', completionTokens: '3,000', cost: '$0.0516' },
          logs: [
            '[09:44:00] [INFO] Mapping API routing configurations...',
            '[09:44:05] [INFO] Writing session telemetry endpoint logic...',
            '[09:44:10] [SUCCESS] NextJS backend controllers initialized.'
          ],
          outputFile: {
            name: 'route.ts',
            type: 'TypeScript Controller',
            size: '1.2 KB',
            language: 'typescript',
            content: `import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, selectedRoles } = await req.json();
    const buildId = Math.random().toString(36).substring(7);
    return NextResponse.json({
      success: true,
      buildId,
      status: "initializing"
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}`
          }
        };
      case 9:
        return {
          model: 'Minimax',
          input: 'Database schemas plans and ERDs.',
          output: 'PostgreSQL init schema file and lookup indexes.',
          inputNodeName: 'architecture.json',
          outputNodeName: '001_init.sql',
          metrics: { quality: '99%', speed: '2.0s', tokens: '16.8k', promptTokens: '13,200', completionTokens: '3,600', cost: '$0.0185' },
          logs: [
            '[09:44:20] [INFO] Constructing tables structure metadata...',
            '[09:44:25] [INFO] Binding referential constraints and indexes...',
            '[09:44:30] [SUCCESS] Output SQL migration schema compiled.'
          ],
          outputFile: {
            name: '001_init.sql',
            type: 'PostgreSQL Schema',
            size: '980 B',
            language: 'sql',
            content: `-- Initial migration script

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  active_step INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  timestamp VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  log_type VARCHAR(20) DEFAULT 'info'
);
`
          }
        };
      case 10:
        return {
          model: 'Minimax',
          input: 'SQL database schemas and API designs.',
          output: 'OpenAPI Swagger definition contract schema.',
          inputNodeName: '001_init.sql',
          outputNodeName: 'openapi.yaml',
          metrics: { quality: '95%', speed: '1.6s', tokens: '12.4k', promptTokens: '9,800', completionTokens: '2,600', cost: '$0.0384' },
          logs: [
            '[09:44:40] [INFO] Setting up API paths structure mappings...',
            '[09:44:45] [INFO] Configuring payloads schemas validations...',
            '[09:44:50] [SUCCESS] OpenAPI definitions contract successfully verified.'
          ],
          outputFile: {
            name: 'openapi.yaml',
            type: 'OpenAPI Spec',
            size: '1.5 KB',
            language: 'yaml',
            content: `openapi: 3.0.0
info:
  title: Collabro AI Workspace API
  version: 1.0.0
paths:
  /api/workspace:
    post:
      summary: Initialize workspace session
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                prompt:
                  type: string
                selectedRoles:
                  type: array
                  items:
                    type: integer
`
          }
        };
      case 11:
        return {
          model: 'Minimax',
          input: 'API contracts and system guidelines.',
          output: 'Minimax API route pipelines and prompt orchestrator script.',
          inputNodeName: 'openapi.yaml',
          outputNodeName: 'orchestrator.py',
          metrics: { quality: '98%', speed: '2.8s', tokens: '19.6k', promptTokens: '15,200', completionTokens: '4,400', cost: '$0.0712' },
          logs: [
            '[09:45:00] [INFO] Framing LLM system instruction models...',
            '[09:45:05] [INFO] Connecting system message vectors indexers...',
            '[09:45:10] [SUCCESS] Completed AI Orchestrator package.'
          ],
          outputFile: {
            name: 'orchestrator.py',
            type: 'Python Engine',
            size: '2.1 KB',
            language: 'python',
            content: `import os
import openai

class AgentOrchestrator:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        
    def execute_agent(self, role: str, context: str):
        response = self.client.chat.completions.create(
            model="minimax",
            messages=[
                {"role": "system", "content": f"You are a {role} AI agent."},
                {"role": "user", "content": context}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content
`
          }
        };
      case 12:
        return {
          model: 'Minimax',
          input: 'Orchestrator scripts and server routes.',
          output: 'Access control models and security headers policy configs.',
          inputNodeName: 'orchestrator.py',
          outputNodeName: 'security.json',
          metrics: { quality: '99%', speed: '1.9s', tokens: '13.8k', promptTokens: '10,800', completionTokens: '3,000', cost: '$0.0416' },
          logs: [
            '[09:45:20] [INFO] Inspecting dependencies vulnerability trees...',
            '[09:45:25] [INFO] Configuring CORS options parameters mapping...',
            '[09:45:30] [SUCCESS] Audit clear. Exported security config parameters.'
          ],
          outputFile: {
            name: 'security.json',
            type: 'Security Rules',
            size: '540 B',
            language: 'json',
            content: JSON.stringify({
              cors: {
                origin: "*",
                methods: ["GET", "POST"],
                allowedHeaders: ["Content-Type", "Authorization"]
              },
              helmet: {
                contentSecurityPolicy: true,
                dnsPrefetchControl: false
              },
              ssl: "Required"
            }, null, 2)
          }
        };
      case 13:
        return {
          model: 'Minimax',
          input: 'API routes and React dashboard page components.',
          output: 'Integration test suites and Playwright E2E browser tests.',
          inputNodeName: 'security.json',
          outputNodeName: 'integration.spec.ts',
          metrics: { quality: '94%', speed: '2.2s', tokens: '14.5k', promptTokens: '11,500', completionTokens: '3,000', cost: '$0.0495' },
          logs: [
            '[09:45:40] [INFO] Preparing mock variables interfaces...',
            '[09:45:45] [INFO] Writing unit verification components logic...',
            '[09:45:50] [SUCCESS] All integration scripts verified successfully.'
          ],
          outputFile: {
            name: 'integration.spec.ts',
            type: 'Playwright Test',
            size: '1.1 KB',
            language: 'typescript',
            content: `import { test, expect } from '@playwright/test';

test('workspace should render cards timeline', async ({ page }) => {
  await page.goto('/workspace');
  
  const canvas = page.locator('div[ref="containerRef"]');
  await expect(canvas).toBeVisible();
  
  const promptCard = page.locator('text=User Prompt');
  await expect(promptCard).toBeVisible();
});
`
          }
        };
      case 14:
        return {
          model: 'Minimax',
          input: 'Integration tests output logs and codes package.',
          output: 'ESLint diagnostics reports, complexity checks, and code quality card.',
          inputNodeName: 'integration.spec.ts',
          outputNodeName: 'code_review.md',
          metrics: { quality: '97%', speed: '1.4s', tokens: '11,200', promptTokens: '9,200', completionTokens: '2,000', cost: '$0.0316' },
          logs: [
            '[09:46:00] [INFO] Reading repository code nodes ASTs...',
            '[09:46:05] [INFO] Checking code quality variables and formats...',
            '[09:46:10] [SUCCESS] Code review completed. All code standard models OK.'
          ],
          outputFile: {
            name: 'code_review.md',
            type: 'Markdown Report',
            size: '1.4 KB',
            language: 'markdown',
            content: `# Code Review Quality Audit

- Lint Diagnostics: Clean (0 errors, 1 warning)
- Cyclomatic Complexity: Low (Max depth: 3)
- Performance Checklist:
  - React useEffect cleanup hooks verified.
  - requestAnimationFrame frame cycles checked for thread locks.
- Recommendation: Keep scroll-inertia scaling factor to 0.08 to avoid laggy camera movements on dynamic renders.
`
          }
        };
      case 15:
        return {
          model: 'Minimax',
          input: 'Reviewed code packages and reports.',
          output: 'Docker build packages and GitHub actions deployment pipeline configurations.',
          inputNodeName: 'code_review.md',
          outputNodeName: 'Dockerfile',
          metrics: { quality: '96%', speed: '2.3s', tokens: '17.4k', promptTokens: '13,400', completionTokens: '4,000', cost: '$0.0582' },
          logs: [
            '[09:46:20] [INFO] Creating alpine docker containers configs...',
            '[09:46:25] [INFO] Configuring node runner environments maps...',
            '[09:46:30] [SUCCESS] Docker container assets successfully exported.'
          ],
          outputFile: {
            name: 'Dockerfile',
            type: 'Docker Rules',
            size: '480 B',
            language: 'dockerfile',
            content: `FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
`
          }
        };
      case 16:
        return {
          model: 'Minimax',
          input: 'Docker structures and live setups.',
          output: 'Developer guides, setup instructions manuals, and API endpoints checklists.',
          inputNodeName: 'Dockerfile',
          outputNodeName: 'README.md',
          metrics: { quality: '99%', speed: '2.0s', tokens: '22.5k', promptTokens: '17,500', completionTokens: '5,000', cost: '$0.0718' },
          logs: [
            '[09:46:40] [INFO] Analyzing configuration directories indices...',
            '[09:46:45] [INFO] Formulating developer guide specifications docs...',
            '[09:46:50] [SUCCESS] Walkthrough docs successfully built.'
          ],
          outputFile: {
            name: 'README.md',
            type: 'Markdown Manual',
            size: '2.8 KB',
            language: 'markdown',
            content: `# Collabro AI NextJS Workspace

## Getting Started
1. Run \`npm install\` to prepare package modules.
2. Fire \`npm run dev\` dev server to open localhost interface.
3. Access Prompt Center at \`/\` to configure target requirements.
4. Interact with Workspace dashboard at \`/workspace\` and click individual cards to inspect active processing flows.
`
          }
        };
      default:
        return {
          model: 'Minimax',
          input: 'Staged requirements.',
          output: 'Compiled code packages, logs audits, and binary builds.',
          inputNodeName: 'Stage Input',
          outputNodeName: 'Output Artifact',
          metrics: { quality: '96%', speed: '2.2s', tokens: '12.5k', promptTokens: '9,500', completionTokens: '3,000', cost: '$0.0345' },
          logs: [`[09:45:00] Initializing Agent ${id}...`, `[09:45:04] Resolving step dependencies...`, `[09:45:08] Processing inputs...`],
          outputFile: {
            name: `artifact_agent_${id}.json`,
            type: 'JSON',
            size: '512 B',
            language: 'json',
            content: JSON.stringify({
              agentId: id,
              status: "executed",
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-64px)] relative overflow-hidden z-20">
      {/* Viewport Container (overflow-hidden to fully hide browser scrollbars) */}
      <div
        ref={containerRef}
        className="flex-1 relative w-full h-full overflow-hidden select-none"
      >
        {/* Dynamic WebGL Shader Background Canvas */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none -z-10" 
        />
        {/* BASE INACTIVE LINE: Runs all the way through the timeline */}
        <div className="absolute top-[50%] left-0 h-[1.5px] bg-white/5 w-[5000px] z-10 pointer-events-none" />

        {/* ACTIVE GLOWING NEON LINE: Grows dynamically up to the active card center */}
        <div 
          className="absolute top-[50%] left-0 h-[2.5px] bg-gradient-to-r from-secondary/40 via-primary to-secondary z-10 pointer-events-none transition-all duration-700 filter drop-shadow-[0_0_8px_rgba(0,198,255,0.9)]"
          style={{ width: `${lineWidth}px` }}
        />

        {/* GLOWING PULSE: Sits at the tip of the active neon line */}
        <div 
          className="absolute top-[50%] -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-400 z-15 pointer-events-none transition-all duration-700 shadow-[0_0_20px_#00C6FF] before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-white before:animate-ping"
          style={{ left: `${lineWidth - 8}px` }}
        />

        {/* ABSOLUTE POSITIONED CARDS WRAPPER: Managed programmatically via style.left */}
        <div
          ref={wrapperRef}
          className="absolute top-0 bottom-0 flex items-center gap-12 px-24 min-w-max h-full py-12 z-20"
          style={{ left: '0px' }}
        >
          
          {/* Loop over ALL agents */}
          {allAgents.map((agent) => {
            const isCompleted = agent.id < activeStep;
            const isActive = agent.id === activeStep;
            const isUpcoming = agent.id > activeStep;
            const isNewSpawn = agent.id === activeStep;

            // Render active Workforce Selection Card at Step 2
            if (agent.id === 2 && isActive) {
              return (
                <div
                  key={agent.id}
                  ref={activeCardRef}
                  onClick={() => openAgentInspector(agent)}
                  className="w-[480px] h-[520px] rounded-2xl relative p-[2px] flex items-center justify-center overflow-hidden active-agent-float z-20 shadow-[0_0_40px_rgba(0,198,255,0.25)] animate-spawn cursor-pointer"
                >
                  {/* Conic Gradient Border Rotation */}
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,#00C6FF,#4FACFE,transparent)] animate-[spin_4s_linear_infinite] z-0" />
                  
                  {/* Solid mask layer to block center of conic gradient */}
                  <div className="absolute inset-[2px] rounded-2xl bg-[#07142E] z-10 pointer-events-none" />

                  <div className="w-full h-full rounded-2xl bg-transparent backdrop-blur-xl p-8 flex flex-col justify-between relative z-20 border border-white/5 overflow-hidden">
                    <div onClick={(e) => e.stopPropagation()} className="h-full flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(0,198,255,0.1)]">
                          <span className="material-symbols-outlined text-primary text-[28px]">settings_suggest</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold font-mono tracking-wider">
                          CONFIG
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">Workforce Configurator</h3>
                      <p className="text-body-sm text-[12px] text-on-surface-variant mb-4">Select the required roles for this build:</p>
                      
                      {/* Selectable Roles Checkbox List */}
                      <div className="h-60 overflow-y-auto no-scrollbar space-y-2 pr-1 border border-white/5 bg-black/20 rounded-xl p-3">
                        {agents.slice(2).map((a) => (
                          <div
                            key={a.id}
                            onClick={() => toggleRoleSelection(a.id)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                              a.selected
                                ? 'bg-primary/10 border-primary/30 text-white'
                                : 'bg-white/5 border-white/5 text-white/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-[18px]">{a.icon}</span>
                              <span className="text-xs font-semibold font-mono">{a.name}</span>
                            </div>
                            <span className="material-symbols-outlined text-[18px]">
                              {a.selected ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmWorkforce();
                      }}
                      className="w-full primary-gradient py-3.5 rounded-xl text-on-primary font-bold text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(0,198,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer mt-4 relative z-20"
                    >
                      Confirm Workforce & Start Build
                    </button>
                  </div>
                </div>
              );
            }

            // Render normal Active Card
            if (isActive) {
              return (
                <div
                  key={agent.id}
                  ref={activeCardRef}
                  onClick={() => openAgentInspector(agent)}
                  className={`w-[480px] h-[520px] rounded-2xl relative p-[2px] flex items-center justify-center overflow-hidden active-agent-float z-20 shadow-[0_0_40px_rgba(0,198,255,0.25)] cursor-pointer ${
                    isNewSpawn ? 'animate-spawn' : ''
                  }`}
                >
                  {/* Conic Gradient Border Rotation */}
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,#00C6FF,#4FACFE,transparent)] animate-[spin_4s_linear_infinite] z-0" />

                  {/* Solid mask layer to block center of conic gradient */}
                  <div className="absolute inset-[2px] rounded-2xl bg-[#07142E] z-10 pointer-events-none" />

                  {/* Inner Card Container - Vertical scrolling container */}
                  <div className="w-full h-full rounded-2xl bg-transparent backdrop-blur-xl p-8 flex flex-col justify-between relative z-20 overflow-hidden border border-white/5">
                    
                    {/* Subtle glowing decoration */}
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

                    {/* Active Header */}
                    <div className="flex justify-between items-start relative z-10 w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(0,198,255,0.1)]">
                          <span className="material-symbols-outlined text-primary text-[28px]">
                            {agent.icon}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-[10px] text-secondary font-bold font-mono tracking-wider animate-pulse uppercase">
                              Processing
                            </span>
                            <span className="font-label-md text-label-md text-on-surface-variant font-mono text-[11px]">
                              STEP {agent.id < 10 ? `0${agent.id}` : agent.id}
                            </span>
                          </div>
                          <h3 className="font-headline-md text-headline-md font-bold text-white mt-1">
                            {agent.name}
                          </h3>
                        </div>
                      </div>

                      {/* Inspect & Progress Controls */}
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAgentInspector(agent);
                          }}
                          className="px-2.5 py-1 bg-primary/25 border border-primary/35 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/35 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(0,198,255,0.1)]"
                        >
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          <span>Inspect Flow</span>
                        </button>
                        
                        <svg className="w-11 h-11 transform -rotate-90">
                          <circle
                            className="text-white/10"
                            strokeWidth="2.5"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="22"
                            cy="22"
                          />
                          <circle
                            className="text-primary transition-all duration-300"
                            strokeWidth="2.5"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="22"
                            cy="22"
                          />
                          <text
                            x="22"
                            y="25"
                            className="text-[9px] font-bold font-mono fill-white text-anchor-middle"
                            style={{ textAnchor: 'middle' }}
                          >
                            {progress}%
                          </text>
                        </svg>
                      </div>
                    </div>

                    {/* Task details and logs */}
                    <div className="mt-4 flex-1 flex flex-col relative z-10 min-h-0">
                      
                      {/* Current task panel */}
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-4 shrink-0">
                        <div className="flex justify-between items-center mb-1 text-[11px] font-mono text-on-surface-variant/70 uppercase tracking-widest font-bold">
                          <span>Current Task</span>
                          <span className="text-secondary">{agent.estTime} Left</span>
                        </div>
                        <p className="text-white font-mono text-[13px] font-medium truncate animate-pulse">
                          {agent.task}
                        </p>
                      </div>

                      {/* Log monitor header */}
                      <div className="flex justify-between text-body-sm font-code-md mb-2 font-mono text-[12px] text-primary-container font-semibold px-1">
                        <span>Streaming Logs</span>
                        <div className="flex gap-1 h-3.5 items-end">
                          <div className="eq-bar h-1" style={{ animationDelay: '0.1s' }}></div>
                          <div className="eq-bar h-3.5" style={{ animationDelay: '0.3s' }}></div>
                          <div className="eq-bar h-2.5" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>

                      {/* Streaming Terminal logs */}
                      <div
                        ref={logContainerRef}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-black/40 rounded-xl p-4 font-mono text-body-sm text-on-surface-variant overflow-y-auto no-scrollbar border border-white/5 min-h-0 text-[13px] leading-relaxed shadow-inner"
                      >
                        {logs.map((log, index) => {
                          let textClass = 'text-white/95';
                          if (log.type === 'success') textClass = 'text-secondary';
                          else if (log.type === 'warning') textClass = 'text-tertiary';
                          else if (log.message.includes('[SYSTEM]')) textClass = 'text-primary font-bold';

                          return (
                            <div key={index} className="flex gap-3 mb-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                              <span className="text-primary/60 shrink-0 font-medium">[{log.time}]</span>
                              <span className={textClass}>{log.message}</span>
                            </div>
                          );
                        })}
                        {isBuilding && (
                          <div className="flex gap-3 mt-1 text-primary animate-pulse font-bold">
                            <span>_</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Render Completed Card (Vertically scrollable content)
            if (isCompleted) {
              return (
                <div
                  key={agent.id}
                  onClick={() => openAgentInspector(agent)}
                  className={`glass-card completed-agent w-64 h-80 rounded-2xl p-6 flex flex-col justify-between relative group hover:border-primary/30 hover:scale-[1.02] border-primary/40 opacity-80 shadow-[0_0_15px_rgba(0,198,255,0.05)] z-20 cursor-pointer ${
                    agent.selected === false ? 'opacity-30 grayscale-[50%] border-white/5' : ''
                  }`}
                >
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-3 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      {/* Checkmark icon (or skip icon) */}
                      <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: agent.selected === false ? "'FILL' 0" : "'FILL' 1" }}>
                        {agent.selected === false ? 'block' : 'check_circle'}
                      </span>
                      <span className="font-label-md text-label-md text-on-surface-variant/80 font-mono text-[11px]">
                        STEP {agent.id < 10 ? `0${agent.id}` : agent.id}
                      </span>
                    </div>
                    <h3 className="font-headline-md text-lg font-bold mb-1 text-white">
                      {agent.name}
                    </h3>
                    <p className="font-body-sm text-[13px] text-on-surface-variant/80 leading-snug">
                      {agent.selected === false ? 'This role was skipped in configuration.' : agent.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.selected === false ? 'bg-white/20' : 'bg-primary'}`}></div>
                      <span className={`font-label-md text-[10px] font-bold tracking-widest uppercase ${agent.selected === false ? 'text-white/40' : 'text-primary'}`}>
                        {agent.selected === false ? 'SKIPPED' : 'COMPLETED'}
                      </span>
                    </div>
                    {agent.selected !== false && (
                      <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        100%
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Render Upcoming Card (Vertically scrollable content)
            return (
              <div
                key={agent.id}
                className={`glass-card w-64 h-80 rounded-2xl p-6 flex flex-col justify-between border border-white/5 opacity-35 blur-[0.5px] pointer-events-none z-20 select-none ${
                  agent.selected === false ? 'opacity-15 grayscale-[80%]' : ''
                }`}
              >
                <div className="flex-1 overflow-y-auto no-scrollbar pb-3 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="material-symbols-outlined text-on-surface-variant/50 text-[26px]">
                      {agent.selected === false ? 'block' : agent.icon}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant/40 font-mono text-[11px]">
                      STEP {agent.id < 10 ? `0${agent.id}` : agent.id}
                    </span>
                  </div>
                  <h3 className="font-headline-md text-lg font-bold mb-1 text-white/60">
                    {agent.name}
                  </h3>
                  <p className="font-body-sm text-[13px] text-on-surface-variant/40 leading-snug">
                    {agent.selected === false ? 'Skipped in configuration.' : agent.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                  <span className="font-label-md text-[10px] font-bold text-on-surface-variant/30 tracking-widest uppercase">
                    {agent.selected === false ? 'SKIPPED' : 'QUEUED'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* MASSIVE FINAL OUTPUT CARD (Vertically scrollable content) */}
          <div
            ref={finalCardRef}
            className={`transition-all duration-700 ease-in-out rounded-3xl p-10 flex flex-col border z-20 ${
              isFinished
                ? 'w-[640px] h-[520px] bg-[#07142E]/90 border-green-500/40 shadow-[0_0_60px_rgba(34,197,94,0.15)] animate-spawn text-white'
                : 'glass-card w-64 h-80 border-white/5 opacity-35 blur-[0.5px] pointer-events-none select-none'
            }`}
          >
            {isFinished ? (
              // Success Expanded Card Layout
              <div className="w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="font-label-md text-green-400 font-bold text-[10px] tracking-[0.2em] uppercase">
                        BUILD SYSTEM OK
                      </span>
                      <h2 className="text-3xl font-black tracking-tight text-white mt-1">
                        Deployment Completed
                      </h2>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-pulse">
                      <span className="material-symbols-outlined text-green-400 text-3xl font-bold">check_circle</span>
                    </div>
                  </div>

                  {/* Checklist readiness */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-mono text-sm font-semibold text-white/90">Website Ready</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-mono text-sm font-semibold text-white/90">Backend Ready</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-mono text-sm font-semibold text-white/90">Database Ready</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-mono text-sm font-semibold text-white/90">APIs Ready</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-mono text-sm font-semibold text-white/90">Documentation Ready</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span className="font-mono text-sm font-semibold text-white/90">Deployment Ready</span>
                    </div>
                  </div>
                </div>

                {/* Final Workspace Actions Buttons */}
                <div className="grid grid-cols-4 gap-3 mt-6">
                  <button className="col-span-2 primary-gradient py-3.5 rounded-xl text-on-primary font-bold text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(0,198,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                    Open Project
                  </button>
                  <button className="bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer">
                    Preview
                  </button>
                  <button className="bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer">
                    Download Source
                  </button>
                  <button className="col-span-4 bg-white/5 border border-white/10 py-2.5 rounded-xl hover:bg-white/10 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer mt-1">
                    Open Workspace
                  </button>
                </div>
              </div>
            ) : (
              // Closed Inactive Card Layout
              <div className="w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="material-symbols-outlined text-on-surface-variant/40 text-[26px]">rocket_launch</span>
                    <span className="font-label-md text-label-md text-on-surface-variant/40 font-mono text-[11px]">PHASE FINAL</span>
                  </div>
                  <h3 className="font-headline-md text-lg font-bold mb-1 text-white/60">Final Output</h3>
                  <p className="font-body-sm text-[13px] text-on-surface-variant/40 leading-snug">
                    Deployment checks, success checklists, and live workspaces launch panel.
                  </p>
                </div>
                <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                  <span className="font-label-md text-[10px] font-bold text-on-surface-variant/30 tracking-widest uppercase">
                    QUEUED
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Toast Notification for successful deployment */}
      {isDeployed && (
        <div className="absolute bottom-10 left-10 glass-panel px-6 py-4 rounded-xl border border-green-500/30 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300 shadow-2xl">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check
            </span>
          </div>
          <div>
            <h4 className="text-white font-bold font-body-md text-sm">Deployment Fired!</h4>
            <p className="text-on-surface-variant font-body-sm text-xs">Simulated pipeline has run successfully.</p>
          </div>
        </div>
      )}

      {/* PREMIUM AGENT DETAILS INSPECTOR OVERLAY MODAL */}
      {selectedAgent && (() => {
        const details = getAgentDetailFlow(selectedAgent.id);
        const isActiveAgent = selectedAgent.id === activeStep;
        const isSkipped = selectedAgent.selected === false;

        const filteredLogs = details.logs.filter(log => {
          if (logFilter === 'all') return true;
          if (logFilter === 'info') return log.includes('[INFO]');
          if (logFilter === 'success') return log.includes('[SUCCESS]');
          if (logFilter === 'warning') return log.includes('[WARNING]');
          return true;
        });

        const copyLogs = () => {
          navigator.clipboard.writeText(details.logs.join('\n'));
          setCopiedLogs(true);
          setTimeout(() => setCopiedLogs(false), 2000);
        };

        const copyArtifact = () => {
          navigator.clipboard.writeText(details.outputFile.content);
          setCopiedArtifact(true);
          setTimeout(() => setCopiedArtifact(false), 2000);
        };

        return (
          <div 
            onClick={() => setSelectedAgent(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300"
          >
            {/* Inline keyframes for connector lines SVG animation */}
            <style>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: -20;
                }
              }
            `}</style>
            
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="glass-panel rounded-3xl border border-white/10 w-full max-w-3xl p-8 text-white relative shadow-2xl animate-spawn flex flex-col min-h-[580px] max-h-[90vh]"
              style={{ background: 'rgba(7, 20, 46, 0.92)' }}
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedAgent(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all cursor-pointer z-50"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              {/* Modal Header */}
              <div className="flex gap-4 items-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(0,198,255,0.15)] shrink-0">
                  <span className="material-symbols-outlined text-primary text-[32px]">
                    {selectedAgent.icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-on-surface-variant">STEP {selectedAgent.id < 10 ? `0${selectedAgent.id}` : selectedAgent.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                      isActiveAgent 
                        ? 'bg-secondary/10 border-secondary/20 text-secondary animate-pulse'
                        : isSkipped 
                        ? 'bg-white/5 border-white/10 text-white/40'
                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                      {isActiveAgent ? 'Active' : isSkipped ? 'Skipped' : 'Completed'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white mt-1">{selectedAgent.name}</h3>
                </div>
              </div>

              {/* Tab Navigation selectors */}
              <div className="flex gap-1 mb-6 border-b border-white/5 pb-2 shrink-0">
                <button 
                  onClick={() => setModalTab('flow')} 
                  className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'flow' 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">hub</span>
                  <span>Flow Diagram</span>
                </button>
                <button 
                  onClick={() => setModalTab('logs')} 
                  className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'logs' 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                  <span>Activity Logs</span>
                </button>
                <button 
                  onClick={() => setModalTab('metrics')} 
                  className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'metrics' 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">monitoring</span>
                  <span>Performance</span>
                </button>
                <button 
                  onClick={() => setModalTab('output')} 
                  className={`px-4 py-2 text-xs font-bold font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'output' 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">article</span>
                  <span>Generated Output</span>
                </button>
              </div>

              {/* Tab Panels */}
              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 pr-1">
                
                {/* 1. FLOW TAB */}
                {modalTab === 'flow' && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center py-6 bg-black/10 border border-white/5 rounded-2xl relative p-6">
                      
                      {/* SVG Flow Connections */}
                      <div className="absolute top-[42%] left-[20%] right-[20%] -translate-y-1/2 h-[4px] z-0 pointer-events-none flex items-center justify-between px-2">
                        {/* Connector Left */}
                        <svg className="w-[110px] h-8 text-primary" viewBox="0 0 100 32" preserveAspectRatio="none">
                          <path 
                            d="M 0,16 L 100,16" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            strokeDasharray="6,4" 
                            fill="none" 
                            className="animate-[dash_1.5s_linear_infinite]" 
                          />
                          <polygon points="92,12 100,16 92,20" fill="currentColor" />
                        </svg>

                        {/* Connector Right */}
                        <svg className="w-[110px] h-8 text-secondary" viewBox="0 0 100 32" preserveAspectRatio="none">
                          <path 
                            d="M 0,16 L 100,16" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            strokeDasharray="6,4" 
                            fill="none" 
                            className="animate-[dash_1.5s_linear_infinite]" 
                          />
                          <polygon points="92,12 100,16 92,20" fill="currentColor" />
                        </svg>
                      </div>

                      {/* Nodes */}
                      <div className="flex items-center justify-between w-full relative z-10 px-4">
                        {/* Input Node */}
                        <div className="flex flex-col items-center w-[120px] text-center">
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 mb-2 hover:border-primary/40 transition-all cursor-help" title={details.input}>
                            <span className="material-symbols-outlined text-white/60 text-[22px]">database</span>
                          </div>
                          <span className="text-[9px] text-on-surface-variant/50 font-mono uppercase tracking-wider block">Source Input</span>
                          <span className="text-[11px] font-bold text-white/90 truncate w-full mt-0.5">{details.inputNodeName}</span>
                        </div>

                        {/* Agent Processor Node */}
                        <div className="flex flex-col items-center w-[150px] text-center">
                          <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/50 flex items-center justify-center shadow-lg shadow-primary/20 mb-2 relative">
                            <span className="material-symbols-outlined text-primary text-[32px]">{selectedAgent.icon}</span>
                            {/* Pulse rings */}
                            <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-md -z-10 animate-pulse"></div>
                          </div>
                          <span className="text-[10px] text-primary font-bold font-mono uppercase tracking-wider block">Agent Node</span>
                          <span className="text-xs font-black text-white truncate w-full mt-0.5">{selectedAgent.name}</span>
                          <span className="text-[9px] text-secondary font-mono mt-0.5">{details.model}</span>
                        </div>

                        {/* Output Node */}
                        <div className="flex flex-col items-center w-[120px] text-center">
                          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center shadow-lg shadow-black/40 mb-2 hover:border-green-400/50 transition-all cursor-help" title={details.output}>
                            <span className="material-symbols-outlined text-green-400 text-[22px]">draft</span>
                          </div>
                          <span className="text-[9px] text-green-400/60 font-mono uppercase tracking-wider block">Generated Artifact</span>
                          <span className="text-[11px] font-bold text-green-300 truncate w-full mt-0.5">{details.outputNodeName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Department Description & Execution Outline */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <h4 className="text-xs text-primary font-mono uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>Role Details</span>
                      </h4>
                      <p className="text-sm text-on-surface-variant/90 leading-relaxed mb-4">
                        {selectedAgent.description}
                      </p>
                      
                      <h4 className="text-xs text-primary font-mono uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">insights</span>
                        <span>Execution Summary</span>
                      </h4>
                      <p className="text-xs text-on-surface-variant/80 leading-relaxed font-mono">
                        The <span className="text-primary font-bold">{selectedAgent.name}</span> has run pipeline calculations over the upstream files, compiling specifications based on user instructions. The model execution parsed <span className="text-white font-bold">{details.metrics.tokens}</span> tokens in <span className="text-secondary font-bold">{details.metrics.speed}</span>.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. ACTIVITY LOGS TAB */}
                {modalTab === 'logs' && (
                  <div className="space-y-4 flex flex-col h-full">
                    {/* Log Filter Buttons & Copy */}
                    <div className="flex justify-between items-center bg-black/20 p-2 rounded-xl border border-white/5">
                      <div className="flex gap-1.5">
                        {(['all', 'info', 'success', 'warning'] as const).map(filter => (
                          <button
                            key={filter}
                            onClick={() => setLogFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              logFilter === filter
                                ? 'bg-primary/20 border border-primary/30 text-primary'
                                : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={copyLogs}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 font-mono text-[10px] font-bold text-white/80 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copiedLogs ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedLogs ? 'Copied!' : 'Copy Logs'}</span>
                      </button>
                    </div>

                    {/* Console Screen */}
                    {isSkipped ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-black/40 border border-white/5 rounded-2xl min-h-[220px]">
                        <span className="material-symbols-outlined text-[48px] text-white/20 mb-3">block</span>
                        <p className="font-mono text-sm text-white/55">This role was skipped during workforce setup.</p>
                      </div>
                    ) : (
                      <div className="bg-black/45 border border-white/5 rounded-2xl p-5 font-mono text-xs text-on-surface-variant/90 space-y-2 min-h-[220px] max-h-[300px] overflow-y-auto shadow-inner">
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log, index) => {
                            let textClass = 'text-white/90';
                            if (log.includes('[SUCCESS]')) textClass = 'text-green-400 font-bold';
                            else if (log.includes('[WARNING]')) textClass = 'text-yellow-400 font-bold';
                            else if (log.includes('[ERROR]')) textClass = 'text-red-400 font-bold';
                            
                            return (
                              <div key={index} className="flex gap-2 leading-relaxed animate-in fade-in slide-in-from-left-1 duration-200">
                                <span className="text-white/90">{log}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-white/40 py-6">No logs match the selected filter.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PERFORMANCE TAB */}
                {modalTab === 'metrics' && (
                  <div className="space-y-6">
                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Quality */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-36">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-wider block">Quality Rating</span>
                          <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        </div>
                        <div>
                          <span className="text-4xl font-black font-mono text-green-400 block">{details.metrics.quality}</span>
                          <span className="text-[10px] text-on-surface-variant/40 font-mono mt-1 block">Output Benchmark OK</span>
                        </div>
                      </div>

                      {/* Speed */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-36">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-wider block">Latency duration</span>
                          <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
                        </div>
                        <div>
                          <span className="text-4xl font-black font-mono text-secondary block">{details.metrics.speed}</span>
                          <span className="text-[10px] text-on-surface-variant/40 font-mono mt-1 block">Avg Inference Cycle</span>
                        </div>
                      </div>

                      {/* Token Volume */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-36">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-on-surface-variant/60 font-mono uppercase tracking-wider block">Token Volume</span>
                          <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>token</span>
                        </div>
                        <div>
                          <span className="text-4xl font-black font-mono text-primary block">{details.metrics.tokens}</span>
                          <span className="text-[10px] text-on-surface-variant/40 font-mono mt-1 block">Total Input / Output</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed usage & Pricing */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <h4 className="text-xs text-primary font-mono uppercase tracking-wider mb-4 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span>Token allocation & inference costing</span>
                      </h4>

                      <div className="space-y-4">
                        {/* Prompt tokens progress bar */}
                        <div>
                          <div className="flex justify-between font-mono text-xs text-on-surface-variant/80 mb-1.5">
                            <span>Prompt (Input) Tokens</span>
                            <span>{details.metrics.promptTokens}</span>
                          </div>
                          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-primary h-full rounded-full" style={{ width: isSkipped ? '0%' : '75%' }}></div>
                          </div>
                        </div>

                        {/* Completion tokens progress bar */}
                        <div>
                          <div className="flex justify-between font-mono text-xs text-on-surface-variant/80 mb-1.5">
                            <span>Completion (Output) Tokens</span>
                            <span>{details.metrics.completionTokens}</span>
                          </div>
                          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                            <div className="bg-secondary h-full rounded-full" style={{ width: isSkipped ? '0%' : '25%' }}></div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs font-mono">
                          <span className="text-white/60">Estimated API Run Cost (USD):</span>
                          <span className="font-bold text-green-300 text-sm">{details.metrics.cost}</span>
                        </div>
                      </div>
                    </div>

                    {/* LLM Engine Parameters */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <h4 className="text-xs text-primary font-mono uppercase tracking-wider mb-3 font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">settings</span>
                        <span>Hyperparameter Settings</span>
                      </h4>

                      <div className="grid grid-cols-4 gap-4 text-center font-mono">
                        <div className="bg-black/20 border border-white/5 rounded-xl p-2.5">
                          <span className="text-[8px] text-on-surface-variant/50 uppercase block mb-1">Temperature</span>
                          <span className="text-xs text-white font-bold">{isSkipped ? 'N/A' : '0.2'}</span>
                        </div>
                        <div className="bg-black/20 border border-white/5 rounded-xl p-2.5">
                          <span className="text-[8px] text-on-surface-variant/50 uppercase block mb-1">Top P</span>
                          <span className="text-xs text-white font-bold">{isSkipped ? 'N/A' : '0.95'}</span>
                        </div>
                        <div className="bg-black/20 border border-white/5 rounded-xl p-2.5">
                          <span className="text-[8px] text-on-surface-variant/50 uppercase block mb-1">Presence Pen</span>
                          <span className="text-xs text-white font-bold">{isSkipped ? 'N/A' : '0.0'}</span>
                        </div>
                        <div className="bg-black/20 border border-white/5 rounded-xl p-2.5">
                          <span className="text-[8px] text-on-surface-variant/50 uppercase block mb-1">Context size</span>
                          <span className="text-xs text-white font-bold">{isSkipped ? 'N/A' : '128k'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. GENERATED OUTPUT TAB */}
                {modalTab === 'output' && (
                  <div className="space-y-4">
                    {/* Header toolbar */}
                    <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400 text-[18px]">draft</span>
                        <span className="font-mono text-xs text-white/90">{details.outputFile.name}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-white/50 border border-white/10 font-mono uppercase shrink-0">
                          {details.outputFile.type} ({details.outputFile.size})
                        </span>
                      </div>
                      
                      {!isSkipped && (
                        <button
                          onClick={copyArtifact}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 font-mono text-[10px] font-bold text-white/80 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedArtifact ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedArtifact ? 'Copied!' : 'Copy Artifact'}</span>
                        </button>
                      )}
                    </div>

                    {/* File contents */}
                    {isSkipped ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-black/40 border border-white/5 rounded-2xl min-h-[220px]">
                        <span className="material-symbols-outlined text-[48px] text-white/20 mb-3">block</span>
                        <p className="font-mono text-sm text-white/55">No file output was generated because this role was skipped.</p>
                      </div>
                    ) : (
                      <div className="bg-black/50 border border-white/5 rounded-2xl p-5 max-h-[300px] overflow-y-auto text-xs leading-relaxed no-scrollbar shadow-inner relative">
                        <pre className="font-mono text-green-300 whitespace-pre overflow-x-auto text-[11px]">
                          <code>
                            {details.outputFile.content}
                          </code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="primary-gradient px-8 py-3 rounded-xl text-on-primary font-bold text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.95] transition-all cursor-pointer"
                >
                  Dismiss Inspector
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
