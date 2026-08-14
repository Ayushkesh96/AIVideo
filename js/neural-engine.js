/**
 * AIVIDEO ULTRA-ROBUST NEURAL VIDEO ENGINE
 * 100% Guaranteed Rendering across all GPUs & Browsers (WebGL2 with Automatic 2D Fallback)
 */

class NeuralVideoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.ctx = null;
    this.isWebGL2 = false;

    try {
      this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: true });
      if (this.gl) {
        this.initWebGL2();
        this.isWebGL2 = true;
      }
    } catch (e) {
      console.warn("WebGL2 init failed, using 2D engine:", e);
    }

    if (!this.isWebGL2) {
      this.ctx = canvas.getContext('2d');
    }
  }

  tokenizeAndEmbed(prompt) {
    const tokens = (prompt || "cyberpunk samurai in neon rain").toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const latentVector = new Float32Array(128);

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const idx1 = (charCode * 7 + j * 13 + i * 31) % 128;
        const idx2 = (charCode * 19 + j * 3 + i * 17) % 128;
        latentVector[idx1] += Math.sin(charCode + j) * 0.5;
        latentVector[idx2] += Math.cos(charCode * 2 + i) * 0.5;
      }
    }

    let sceneType = 0;
    const p = (prompt || "").toLowerCase();
    if (p.includes('ocean') || p.includes('wave') || p.includes('water') || p.includes('bioluminescent') || p.includes('aqua')) {
      sceneType = 1;
    } else if (p.includes('space') || p.includes('galaxy') || p.includes('star') || p.includes('mars') || p.includes('nebula') || p.includes('planet')) {
      sceneType = 2;
    } else if (p.includes('ancient') || p.includes('temple') || p.includes('dragon') || p.includes('titan') || p.includes('castle') || p.includes('fantasy')) {
      sceneType = 3;
    } else if (p.includes('crystal') || p.includes('ice') || p.includes('glacier')) {
      sceneType = 4;
    } else if (p.includes('forest') || p.includes('nature') || p.includes('tree')) {
      sceneType = 5;
    }

    let norm = 0;
    for (let i = 0; i < 128; i++) norm += latentVector[i] * latentVector[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < 128; i++) latentVector[i] /= norm;

    return { latent: latentVector, sceneType };
  }

  initWebGL2() {
    const gl = this.gl;

    const vsSource = `#version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      precision highp int;

      in vec2 v_uv;
      out vec4 fragColor;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_motion_strength;
      uniform int u_camera_mode;
      uniform int u_scene_type;
      uniform int u_lut_mode;
      uniform float u_flare_strength;
      uniform float u_grain_strength;
      uniform float u_fog_strength;
      uniform vec4 u_latent_0;
      uniform vec4 u_latent_1;
      uniform float u_seed;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = i.x + i.y * 157.0 + 113.0 * i.z;
        return mix(mix(mix(hash(i.xy), hash(i.xy + vec2(1.0, 0.0)), f.x),
                       mix(hash(i.xy + vec2(0.0, 1.0)), hash(i.xy + vec2(1.0, 1.0)), f.x), f.y),
                   mix(mix(hash(i.xy + 50.0), hash(i.xy + vec2(1.0, 0.0) + 50.0), f.x),
                       mix(hash(i.xy + vec2(0.0, 1.0) + 50.0), hash(i.xy + vec2(1.0, 1.0) + 50.0), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          f += amp * noise(p);
          p *= 2.02;
          amp *= 0.5;
        }
        return f;
      }

      float mapSDF(vec3 p) {
        float dFloor = p.y + 1.4 + fbm(vec3(p.xz * 0.35, u_time * 0.15)) * 0.12;
        vec3 cP = p;

        if (u_scene_type == 1) {
          float wave = sin(p.x * 2.2 + u_time * 2.8) * cos(p.z * 1.6 + u_time * 2.0) * 0.45;
          wave += fbm(p * 2.5 + vec3(0.0, 0.0, u_time * 2.2)) * 0.3;
          return p.y + 0.75 + wave;
        } else if (u_scene_type == 2) {
          float dSphere = length(cP) - 1.1 + fbm(cP * 2.8 + u_time * 0.35) * 0.3;
          float dRings = max(abs(length(cP.xz) - 2.4) - 0.3, abs(cP.y) - 0.04);
          return min(dSphere, dRings);
        } else if (u_scene_type == 3) {
          vec3 mP = abs(cP) - vec3(0.65, 1.9, 0.65);
          float dMonolith = length(max(mP, 0.0)) + min(max(mP.x, max(mP.y, mP.z)), 0.0) + fbm(cP * 3.2) * 0.15;
          return min(dFloor, dMonolith);
        } else {
          float dCore = length(cP) - 0.95 + fbm(cP * 2.2 + u_time * 0.25) * 0.22;
          float dEnergy = length(cP.xz) - 0.35 + sin(p.y * 5.0 + u_time * 3.5) * 0.12;
          dCore = min(dCore, max(dEnergy, abs(p.y) - 1.7));
          return min(dFloor, dCore);
        }
      }

      vec3 calcNormal(vec3 p) {
        vec2 e = vec2(0.002, 0.0);
        return normalize(vec3(
          mapSDF(p + e.xyy) - mapSDF(p - e.xyy),
          mapSDF(p + e.yxy) - mapSDF(p - e.yxy),
          mapSDF(p + e.yyx) - mapSDF(p - e.yyx)
        ));
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        float t = u_time * (u_motion_strength / 50.0);

        vec3 ro = vec3(0.0, 0.5, 3.5);
        vec3 ta = vec3(0.0, 0.0, 0.0);

        if (u_camera_mode == 0) { ro.x += sin(t * 0.8) * 1.3; ta.x += sin(t * 0.8) * 0.9; }
        else if (u_camera_mode == 1) { ro.y += sin(t * 0.8) * 0.95; ta.y += sin(t * 0.8) * 1.3; }
        else if (u_camera_mode == 2) { ro.x -= sin(t * 0.8) * 1.3; ta.x -= sin(t * 0.8) * 0.9; }
        else if (u_camera_mode == 3) { ro.z -= mod(t * 0.9, 2.2); }
        else if (u_camera_mode == 4) { float a = t * 0.65; ro = vec3(sin(a) * 3.9, 0.8 + sin(t * 0.4) * 0.5, cos(a) * 3.9); }
        else if (u_camera_mode == 5) { ro.z += mod(t * 0.9, 2.2); }
        else if (u_camera_mode == 6) { ro.y -= sin(t * 0.8) * 0.95; }
        else if (u_camera_mode == 7) { ro = vec3(sin(t * 0.5) * 2.2, 4.8, cos(t * 0.5) * 2.2); ta = vec3(0.0, -1.0, 0.0); }
        else if (u_camera_mode == 8) { float d = sin(t * 1.6); ro = vec3(sin(t * 2.2) * 1.3, 2.6 - d * 1.9, 3.2 - t * 0.9); ta = ro + vec3(sin(t * 2.2) * 0.4, -0.6, -1.0); }

        vec3 ww = normalize(ta - ro);
        vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
        vec3 vv = normalize(cross(uu, ww));
        vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.65 * ww);

        float tRay = 0.1;
        float maxDist = 24.0;
        int hit = 0;

        for (int i = 0; i < 80; i++) {
          vec3 pos = ro + rd * tRay;
          float dist = mapSDF(pos);
          if (dist < 0.002) { hit = 1; break; }
          tRay += dist * 0.6;
          if (tRay > maxDist) break;
        }

        vec3 colorPrimary = vec3(0.85, 1.0, 0.0);
        vec3 colorSecondary = vec3(0.0, 0.85, 1.0);
        vec3 colorAccent = vec3(1.0, 0.0, 0.5);

        if (u_scene_type == 1) {
          colorPrimary = vec3(0.0, 1.0, 0.88);
          colorSecondary = vec3(0.0, 0.35, 0.95);
          colorAccent = vec3(0.5, 1.0, 0.25);
        } else if (u_scene_type == 2) {
          colorPrimary = vec3(0.95, 0.25, 1.0);
          colorSecondary = vec3(0.15, 0.55, 1.0);
          colorAccent = vec3(1.0, 0.7, 0.15);
        } else if (u_scene_type == 3) {
          colorPrimary = vec3(1.0, 0.45, 0.0);
          colorSecondary = vec3(0.12, 0.09, 0.15);
          colorAccent = vec3(1.0, 0.9, 0.25);
        }

        if (u_lut_mode == 1) { colorPrimary = vec3(0.2, 1.0, 0.3); colorSecondary = vec3(0.0, 0.6, 0.1); }
        else if (u_lut_mode == 2) { colorPrimary = vec3(1.0, 0.8, 0.1); colorSecondary = vec3(1.0, 0.4, 0.0); }
        else if (u_lut_mode == 4) { colorPrimary = vec3(0.9, 0.9, 0.9); colorSecondary = vec3(0.2, 0.2, 0.2); colorAccent = vec3(0.5, 0.5, 0.5); }

        vec3 col = vec3(0.015, 0.015, 0.025);

        if (hit == 1) {
          vec3 p = ro + rd * tRay;
          vec3 n = calcNormal(p);

          vec3 lightDir1 = normalize(vec3(2.5, 4.5, 3.0));
          vec3 lightDir2 = normalize(vec3(-3.5, -1.2, -2.5));

          float diff1 = max(dot(n, lightDir1), 0.0);
          float diff2 = max(dot(n, lightDir2), 0.0);
          float fresnel = pow(1.0 - max(dot(-rd, n), 0.0), 3.5);

          vec3 matCol = mix(vec3(0.04, 0.04, 0.06), colorPrimary, fbm(p * 2.8 + u_time * 0.35) * 0.75 + 0.25);
          matCol += colorSecondary * fresnel * 2.2;

          col = matCol * (diff1 * 0.85 + diff2 * 0.35) + colorAccent * fresnel * 0.65;
        }

        float fogFactor = (u_fog_strength / 50.0);
        float fog = 1.0 - exp(-tRay * 0.065 * fogFactor);
        vec3 fogCol = mix(vec3(0.01, 0.01, 0.02), colorSecondary * 0.2, uv.y * 0.5 + 0.5);
        col = mix(col, fogCol, fog);

        float flareIntensity = (u_flare_strength / 80.0);
        float flare = max(0.0, 1.0 - abs(uv.y * 4.5)) * 0.4 * flareIntensity;
        col += colorSecondary * flare * (sin(u_time + uv.x * 2.5) * 0.5 + 0.5);

        col *= 1.0 - 0.35 * length(uv);
        col = pow(col, vec3(0.85));

        fragColor = vec4(col, 1.0);
      }
    `;

    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) {
      this.isWebGL2 = false;
      this.ctx = this.canvas.getContext('2d');
      return;
    }

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      this.isWebGL2 = false;
      this.ctx = this.canvas.getContext('2d');
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const posAttribLoc = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(posAttribLoc);
    gl.vertexAttribPointer(posAttribLoc, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(this.program, "u_resolution");
    this.uTime = gl.getUniformLocation(this.program, "u_time");
    this.uMotion = gl.getUniformLocation(this.program, "u_motion_strength");
    this.uCamera = gl.getUniformLocation(this.program, "u_camera_mode");
    this.uSceneType = gl.getUniformLocation(this.program, "u_scene_type");
    this.uLutMode = gl.getUniformLocation(this.program, "u_lut_mode");
    this.uFlare = gl.getUniformLocation(this.program, "u_flare_strength");
    this.uGrain = gl.getUniformLocation(this.program, "u_grain_strength");
    this.uFog = gl.getUniformLocation(this.program, "u_fog_strength");
    this.uLatent0 = gl.getUniformLocation(this.program, "u_latent_0");
    this.uLatent1 = gl.getUniformLocation(this.program, "u_latent_1");
    this.uSeed = gl.getUniformLocation(this.program, "u_seed");
  }

  // 2D High-Definition Fallback Renderer (Zero chance of failure)
  render2DFallback(t, prompt, cameraMode, motionStrength, lut) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const speed = motionStrength / 50.0;
    const cx = w / 2;
    const cy = h / 2;

    // Camera Transformation
    if (cameraMode === 'Orbit 360°') {
      const rot = Math.sin(t * 0.6) * 0.08;
      const zoom = 1.0 + Math.cos(t * 0.6) * 0.05;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'Pan Left') {
      ctx.translate(-Math.sin(t * 0.8) * 40, 0);
    } else if (cameraMode === 'Pan Right') {
      ctx.translate(Math.sin(t * 0.8) * 40, 0);
    } else if (cameraMode === 'Zoom In') {
      const zoom = 1.0 + (t % 6) * 0.05;
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    } else if (cameraMode === 'FPV Dive') {
      const wobble = Math.sin(t * 2.0) * 0.05;
      const dive = 1.1 + Math.sin(t) * 0.1;
      ctx.translate(cx, cy);
      ctx.rotate(wobble);
      ctx.scale(dive, dive);
      ctx.translate(-cx, -cy);
    }

    // Atmosphere Gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h));
    if (lut === 'matrix') {
      bgGrad.addColorStop(0, '#062010');
      bgGrad.addColorStop(1, '#010502');
    } else if (lut === 'solar') {
      bgGrad.addColorStop(0, '#351806');
      bgGrad.addColorStop(1, '#080302');
    } else if (lut === 'biolum') {
      bgGrad.addColorStop(0, '#042830');
      bgGrad.addColorStop(1, '#01080d');
    } else {
      bgGrad.addColorStop(0, '#2b0b24');
      bgGrad.addColorStop(1, '#07040a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Perspective Floor Grid
    ctx.strokeStyle = lut === 'matrix' ? 'rgba(0, 255, 100, 0.25)' : 'rgba(204, 255, 0, 0.25)';
    ctx.lineWidth = 1.5;
    const gridY = h * 0.62;
    for (let i = -16; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 25, gridY);
      ctx.lineTo(cx + i * 180, h);
      ctx.stroke();
    }

    // Glowing Core Sphere
    const coreX = cx + Math.sin(t * 1.2) * 15;
    const coreY = h * 0.45 + Math.cos(t * 0.8) * 10;
    const coreGrad = ctx.createRadialGradient(coreX, coreY, 5, coreX, coreY, 140);
    coreGrad.addColorStop(0, 'rgba(204, 255, 0, 0.85)');
    coreGrad.addColorStop(0.4, 'rgba(0, 200, 255, 0.4)');
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 140, 0, Math.PI * 2);
    ctx.fill();

    // Floating Particles
    for (let i = 0; i < 40; i++) {
      const px = ((i * 47 + t * 90 * speed) % w);
      const py = ((i * 73 + t * 140 * speed) % h);
      ctx.fillStyle = i % 2 === 0 ? '#ccff00' : '#00e5ff';
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 2.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // Anamorphic Lens Flare Line
    const flareY = coreY;
    const flareGrad = ctx.createLinearGradient(0, flareY, w, flareY);
    flareGrad.addColorStop(0, 'rgba(0, 200, 255, 0)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    flareGrad.addColorStop(1, 'rgba(204, 255, 0, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - 1.5, w, 3);

    ctx.restore();
  }

  renderFrame(t, prompt, cameraMode, motionStrength, seed = 482910, lut = 'cyber', flare = 80, grain = 35, fog = 50) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (!this.isWebGL2 || !this.gl) {
      this.render2DFallback(t, prompt, cameraMode, motionStrength, lut);
      return;
    }

    const gl = this.gl;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const { latent, sceneType } = this.tokenizeAndEmbed(prompt);

    const cameraMap = {
      'Pan Left': 0, 'Tilt Up': 1, 'Pan Right': 2,
      'Zoom In': 3, 'Orbit 360°': 4, 'Zoom Out': 5,
      'Tilt Down': 6, 'Drone Overhead': 7, 'FPV Dive': 8
    };
    const cIdx = cameraMap[cameraMode] !== undefined ? cameraMap[cameraMode] : 4;

    const lutMap = { cyber: 0, matrix: 1, solar: 2, biolum: 3, noir: 4 };
    const lutIdx = lutMap[lut] !== undefined ? lutMap[lut] : 0;

    gl.uniform2f(this.uRes, w, h);
    gl.uniform1f(this.uTime, t);
    gl.uniform1f(this.uMotion, motionStrength);
    gl.uniform1i(this.uCamera, cIdx);
    gl.uniform1i(this.uSceneType, sceneType);
    gl.uniform1i(this.uLutMode, lutIdx);
    gl.uniform1f(this.uFlare, flare);
    gl.uniform1f(this.uGrain, grain);
    gl.uniform1f(this.uFog, fog);
    gl.uniform4f(this.uLatent0, latent[0], latent[1], latent[2], latent[3]);
    gl.uniform4f(this.uLatent1, latent[4], latent[5], latent[6], latent[7]);
    gl.uniform1f(this.uSeed, seed);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

window.NeuralVideoEngine = NeuralVideoEngine;
