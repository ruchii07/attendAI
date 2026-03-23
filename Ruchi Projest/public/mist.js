(function () {

  // Create and inject canvas as full-screen background
  var canvas = document.createElement("canvas");
  canvas.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:-1",
    "display:block"
  ].join(";");
  document.body.insertBefore(canvas, document.body.firstChild);

  var gl = canvas.getContext("webgl");
  if (!gl) {
    console.warn("WebGL not supported — mist background disabled.");
    return;
  }

  // ── VERTEX SHADER ──────────────────────────────────────────
  var vsSource = [
    "attribute vec2 position;",
    "void main() {",
    "  gl_Position = vec4(position, 0.0, 1.0);",
    "}"
  ].join("\n");

  // ── FRAGMENT SHADER (FBM Mist) ─────────────────────────────
  var fsSource = [
    "precision highp float;",
    "uniform float u_time;",
    "uniform vec2  u_resolution;",
    "uniform vec2  u_mouse;",

    "float hash(vec2 p) {",
    "  p = fract(p * vec2(123.34, 456.21));",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",

    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(a, b, u.x)",
    "       + (c - a) * u.y * (1.0 - u.x)",
    "       + (d - b) * u.x * u.y;",
    "}",

    "float fbm(vec2 p) {",
    "  float v = 0.0;",
    "  float a = 0.5;",
    "  for (int i = 0; i < 6; i++) {",
    "    v += a * noise(p);",
    "    p *= 2.0;",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",

    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / u_resolution.xy;",
    "  uv.x *= u_resolution.x / u_resolution.y;",

    "  vec2 mPos = u_mouse / u_resolution.xy;",
    "  mPos.x *= u_resolution.x / u_resolution.y;",
    "  float dist = distance(uv, mPos);",

    "  vec2 q;",
    "  q.x = fbm(uv + 0.07 * u_time);",
    "  q.y = fbm(uv + vec2(1.0, 1.0));",

    "  vec2 r;",
    "  r.x = fbm(uv + 1.0 * q + vec2(1.7, 9.2) + 0.15  * u_time);",
    "  r.y = fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time);",

    "  float f = fbm(uv + r);",

    // Dark navy/obsidian palette tuned for AttendAI dark theme
    "  vec3 baseColor   = vec3(0.067, 0.071, 0.098);",
    "  vec3 mistColor   = vec3(0.11,  0.12,  0.17 );",
    "  vec3 accentColor = vec3(0.18,  0.20,  0.30 );",

    "  vec3 color = mix(baseColor, mistColor, f);",
    "  color = mix(color, accentColor, dot(q, r) * 0.5);",

    // Subtle purple-blue mouse glow matching #c0c1ff accent
    "  float mouseGlow = smoothstep(0.4, 0.0, dist);",
    "  color += mouseGlow * 0.07 * vec3(0.75, 0.76, 1.0);",

    "  color = pow(color, vec3(1.08)) * 1.35;",
    "  gl_FragColor = vec4(color, 1.0);",
    "}"
  ].join("\n");

  // ── COMPILE & LINK ─────────────────────────────────────────
  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vs = compileShader(gl.VERTEX_SHADER,   vsSource);
  var fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // ── GEOMETRY (full-screen quad) ───────────────────────────
  var vertices = new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1
  ]);
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var posAttrib = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posAttrib);
  gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

  // ── UNIFORMS ──────────────────────────────────────────────
  var timeLoc  = gl.getUniformLocation(program, "u_time");
  var resLoc   = gl.getUniformLocation(program, "u_resolution");
  var mouseLoc = gl.getUniformLocation(program, "u_mouse");

  // ── MOUSE TRACKING ────────────────────────────────────────
  var mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = window.innerHeight - e.clientY; // flip Y for WebGL
  });

  // ── RENDER LOOP ───────────────────────────────────────────
  function render(time) {
    // Resize canvas to match window if needed
    if (canvas.width  !== window.innerWidth ||
        canvas.height !== window.innerHeight) {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.uniform1f(timeLoc,  time * 0.001);
    gl.uniform2f(resLoc,   canvas.width, canvas.height);
    gl.uniform2f(mouseLoc, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

})();
