// === NAV hide/show ===
(() => {
  const nav = document.querySelector('.nav');
  let lastY = window.scrollY;
  function onScroll(){
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 24);
    const goingDown = y > lastY;
    if (goingDown && y > 120) nav.classList.add('hidden');
    else nav.classList.remove('hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// === Vídeo autoplay robusto (hero) ===
(() => {
  const vid = document.querySelector('.hero-video');
  function ensureInline(){ if(!vid) return; vid.setAttribute('playsinline',''); vid.setAttribute('webkit-playsinline',''); vid.muted = true; }
  function tryPlay(){ if(!vid) return; ensureInline(); const p = vid.play(); if(p && p.catch){ p.catch(()=>{ const resume = () => { ensureInline(); vid.play().catch(()=>{}); window.removeEventListener('pointerdown', resume); }; window.addEventListener('pointerdown', resume, { once:true }); }); } }
  window.addEventListener('load', tryPlay, { once:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
})();

// === Typewriter simples no H1 ===
(() => {
  const titleEl = document.querySelector('h1.chroma');
  if (!titleEl) return;
  const full = titleEl.textContent.trim();
  titleEl.textContent = '';
  let i = 0; (function type(){ if (i <= full.length){ titleEl.textContent = full.slice(0,i); i++; setTimeout(type, 80); } })();
})();

// === WebGL "Data Grid" (clean e tech) no #technology — com fallback sem OES_derivatives ===
(() => {
  const wrap = document.getElementById('tech-wrap');
  const canvas = document.getElementById('tech-three');
  if (!wrap || !canvas) return;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl){
    // Fallback CSS (sem WebGL)
    wrap.insertAdjacentHTML('beforeend', '<div style="position:absolute;inset:0;background:radial-gradient(60% 50% at 50% 40%, rgba(255,255,255,.06), transparent 60%),linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.55));display:grid;place-items:center;color:#cbd5e1">Ative WebGL / aceleração de hardware</div>');
    return;
  }

  // ===== Shaders =====
  const vs = `
  attribute vec2 aXZ; // posição base no plano (x,z)
  uniform mat4 uProj, uView, uModel; uniform float uTime;
  varying vec3 vPos; varying vec3 vN; varying vec2 vUV;
  float h(vec2 p){
    return 0.25*sin(1.6*p.x + 1.2*uTime)
         + 0.18*sin(1.2*p.y - 0.9*uTime)
         + 0.12*sin(2.0*(p.x+p.y) + 1.4*uTime);
  }
  void main(){
    float y = h(aXZ);
    vec3 pos = vec3(aXZ.x, y, aXZ.y);
    float dhdx = 0.25*1.6*cos(1.6*aXZ.x + 1.2*uTime) + 0.12*2.0*cos(2.0*(aXZ.x+aXZ.y) + 1.4*uTime);
    float dhdz = 0.18*1.2*cos(1.2*aXZ.y - 0.9*uTime) + 0.12*2.0*cos(2.0*(aXZ.x+aXZ.y) + 1.4*uTime);
    vec3 Tx = normalize(vec3(1.0, dhdx, 0.0));
    vec3 Tz = normalize(vec3(0.0, dhdz, 1.0));
    vec3 N = normalize(cross(Tz, Tx));
    vN = mat3(uModel) * N;
    vec4 wp = uModel * vec4(pos,1.0);
    vPos = wp.xyz;
    vUV = aXZ*0.5 + 0.5; // [-S,S] -> [0,1]
    gl_Position = uProj * uView * wp;
  }`;

  // FS com derivatives (AA perfeito nas linhas)
  const fsDeriv = `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;
  varying vec3 vPos; varying vec3 vN; varying vec2 vUV;
  uniform vec3 uEye, uLightDir, uColA, uColB, uColC; uniform float uTime;
  float gridLines(vec2 uv){
    uv *= 22.0; // densidade
    vec2 g = abs(fract(uv - 0.5)-0.5)/fwidth(uv);
    float line = 1.0 - clamp(min(g.x,g.y), 0.0, 1.0);
    return line;
  }
  void main(){
    vec3 N = normalize(vN); vec3 L = normalize(uLightDir); vec3 V = normalize(uEye - vPos); vec3 H = normalize(L + V);
    float diff = max(dot(N,L), 0.0); float spec = pow(max(dot(N,H), 0.0), 70.0); float rim = pow(1.0 - max(dot(N,V),0.0), 2.0);
    vec3 duo = mix(uColB, uColA, vUV.y);
    float pulse = 0.5 + 0.5 * sin(uTime*0.85 + vUV.x*4.2 + vUV.y*1.3);
    vec3 base = mix(duo, uColC, 0.35*pulse);
    float flow = max(sin((vUV.x+vUV.y)*20.0 - uTime*2.5), 0.0); flow = pow(flow, 3.0);
    float gln = gridLines(vUV);
    vec3 col = base*(0.18 + 0.82*diff) + vec3(1.0)*spec*0.55 + vec3(0.5,0.8,1.0)*rim*0.35;
    col += (0.08*gln + 0.18*flow) * vec3(0.75,0.85,1.0);
    gl_FragColor = vec4(col, 1.0);
  }`;

  // FS sem derivatives (compatibilidade ampla)
  const fsBasic = `
  precision mediump float;
  varying vec3 vPos; varying vec3 vN; varying vec2 vUV;
  uniform vec3 uEye, uLightDir, uColA, uColB, uColC; uniform float uTime;
  float gridLines(vec2 uv){
    uv *= 22.0; // densidade
    vec2 f = abs(fract(uv) - 0.5);
    float w = 0.06; // largura fixa das linhas
    float ax = smoothstep(w, 0.0, f.x);
    float ay = smoothstep(w, 0.0, f.y);
    return max(ax, ay);
  }
  void main(){
    vec3 N = normalize(vN); vec3 L = normalize(uLightDir); vec3 V = normalize(uEye - vPos); vec3 H = normalize(L + V);
    float diff = max(dot(N,L), 0.0); float spec = pow(max(dot(N,H), 0.0), 60.0); float rim = pow(1.0 - max(dot(N,V),0.0), 2.0);
    vec3 duo = mix(uColB, uColA, vUV.y);
    float pulse = 0.5 + 0.5 * sin(uTime*0.85 + vUV.x*4.2 + vUV.y*1.3);
    vec3 base = mix(duo, uColC, 0.35*pulse);
    float flow = max(sin((vUV.x+vUV.y)*20.0 - uTime*2.5), 0.0); flow = pow(flow, 3.0);
    float gln = gridLines(vUV);
    vec3 col = base*(0.22 + 0.78*diff) + vec3(1.0)*spec*0.45 + vec3(0.5,0.8,1.0)*rim*0.28;
    col += (0.08*gln + 0.16*flow) * vec3(0.70,0.84,1.0);
    gl_FragColor = vec4(col, 1.0);
  }`;

  function compileShader(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ throw new Error(gl.getShaderInfoLog(s)||'shader'); } return s; }
  function buildProgram(fsSrc){ const prog = gl.createProgram(); gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(prog); if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)||'link'); return prog; }

  // Tenta derivatives; se não, cai para básico
  const hasDeriv = !!gl.getExtension('OES_standard_derivatives');
  let prog; try { prog = buildProgram(hasDeriv ? fsDeriv : fsBasic); } catch(e){ try{ prog = buildProgram(fsBasic); } catch(e2){ console.error('GL program failed:', e2); wrap.insertAdjacentHTML('beforeend', '<div style="position:absolute;inset:0;background:radial-gradient(60% 50% at 50% 40%, rgba(255,255,255,.06), transparent 60%),linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.55));display:grid;place-items:center;color:#cbd5e1">Seu dispositivo não suporta os shaders. Mostrando fallback.</div>'); return; } }
  gl.useProgram(prog);

  // === Geometria: grade NxM em [-S,S]
  const S = 2.6, NX = 120, NY = 86; // levemente reduzido p/ performance ampla
  const pos = new Float32Array((NX+1)*(NY+1)*2);
  let p=0; for(let j=0;j<=NY;j++){ const vz = -S + 2*S*(j/NY); for(let i=0;i<=NX;i++){ const vx = -S + 2*S*(i/NX); pos[p++]=vx; pos[p++]=vz; } }
  const idx = new Uint16Array(NX*NY*6);
  let k=0; for(let j=0;j<NY;j++){ for(let i=0;i<NX;i++){ const a=j*(NX+1)+i, b=a+1, c=a+(NX+1), d=c+1; idx[k++]=a; idx[k++]=c; idx[k++]=b; idx[k++]=b; idx[k++]=c; idx[k++]=d; } }

  function bufAttrib(name, data, size){ const loc = gl.getAttribLocation(prog, name); const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; }
  bufAttrib('aXZ', pos, 2);
  const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

  // Uniforms & matrizes
  const uProj = gl.getUniformLocation(prog,'uProj');
  const uView = gl.getUniformLocation(prog,'uView');
  const uModel = gl.getUniformLocation(prog,'uModel');
  const uEye = gl.getUniformLocation(prog,'uEye');
  const uLightDir = gl.getUniformLocation(prog,'uLightDir');
  const uColA = gl.getUniformLocation(prog,'uColA');
  const uColB = gl.getUniformLocation(prog, 'uColB');
  const uColC = gl.getUniformLocation(prog,'uColC');
  const uTime = gl.getUniformLocation(prog,'uTime');

  // Paleta clean (azul -> aço)
  gl.uniform3f(uColA, 0.11, 0.82, 0.98);
  gl.uniform3f(uColB, 0.08, 0.06, 0.20);
  gl.uniform3f(uColC, 0.90, 0.40, 1.00);

  function mat4(){ return new Float32Array(16); }
  function ident(m){ m.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return m; }
  function mul(a,b){ const o=mat4(); for(let i=0;i<4;i++){ for(let j=0;j<4;j++){ o[i*4+j]=a[i*4+0]*b[j+0]+a[i*4+1]*b[j+4]+a[i*4+2]*b[j+8]+a[i*4+3]*b[j+12]; } } return o; }
  function rotX(a,ang){ const c=Math.cos(ang),s=Math.sin(ang); const r=mat4(); ident(r); r[5]=c; r[6]=s; r[9]=-s; r[10]=c; return mul(a,r); }
  function perspective(out,fovy,aspect,near,far){ const f=1/Math.tan(fovy/2), nf=1/(near-far); out.set([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0]); return out; }

  let yaw=0.0, pitch=-0.35, dist=4.0;
  function resize(){ const r=wrap.getBoundingClientRect(); const W=Math.max(1,r.width), H=Math.max(1,r.height); canvas.width=W; canvas.height=H; gl.viewport(0,0,W,H); const p=perspective(mat4(), Math.PI/4, W/H, 0.1, 100); gl.uniformMatrix4fv(uProj,false,p);} resize();
  window.addEventListener('resize', resize, {passive:true});

  // Interação sutil (arrastar gira, roda = zoom)
  let dragging=false, lx=0, ly=0;
  canvas.addEventListener('pointerdown',e=>{ dragging=true; lx=e.clientX; ly=e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup',e=>{ dragging=false; canvas.releasePointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove',e=>{ if(!dragging) return; const dx=(e.clientX-lx)/250, dy=(e.clientY-ly)/250; yaw+=dx; pitch = Math.max(-1.1, Math.min(0.2, pitch+dy)); lx=e.clientX; ly=e.clientY; });
  canvas.addEventListener('wheel',e=>{ dist+=e.deltaY*0.001; dist=Math.max(2.5, Math.min(7.0, dist)); }, {passive:true});

  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

  function render(t){
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const eye=[Math.sin(yaw)*Math.cos(pitch)*dist, Math.sin(pitch)*dist + 1.0, Math.cos(yaw)*Math.cos(pitch)*dist];
  }
})();

// === Scroll Animations ===
(() => {
  const sections = document.querySelectorAll('section:not(.case-modal)');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, {
    threshold: 0.1
  });

  sections.forEach(section => {
    section.classList.add('fade-in-section');
    observer.observe(section);
  });
})();