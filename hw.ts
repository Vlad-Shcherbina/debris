function glFromCanvas(canvas: HTMLCanvasElement): WebGLRenderingContext {
    let gl = <WebGLRenderingContext>canvas.getContext('webgl');
    if (!gl) throw "Can't get GL context";

    let devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    return gl;
}

function makeShaderProgram(
    gl: WebGLRenderingContext,
    vertex_shader: string, fragment_shader: string) {

    let prog = gl.createProgram();
    function addShader(type: number, source: string) {
        let s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            throw `Could not compile shader:\n${gl.getShaderInfoLog(s)}`;
        gl.attachShader(prog, s);
    }
    addShader(gl.VERTEX_SHADER, vertex_shader);
    addShader(gl.FRAGMENT_SHADER, fragment_shader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw 'Could not link the shader program';
    return prog;
}

function makeCircleDrawer(gl: WebGLRenderingContext) {
    let prog = makeShaderProgram(gl, `
    attribute vec2 pos;
    attribute vec2 texcoord;

    varying vec2 v_texcoord;

    void main() {
      gl_Position = vec4(pos, 0, 1.0);
      v_texcoord = texcoord;
    }
    `, `
    precision mediump float;

    uniform float sharpness;

    varying vec2 v_texcoord;

    void main() {
      float a = clamp(
          (1.0 - sqrt(dot(v_texcoord, v_texcoord))) * sharpness,
          0.0, 1.0);
      gl_FragColor = vec4(v_texcoord, 1, a);
    }
    `);
    let sharpness_uniform = gl.getUniformLocation(prog, "sharpness");
    let pos_attr = gl.getAttribLocation(prog, "pos");
    let texcoord_attr = gl.getAttribLocation(prog, "texcoord");

    let pos_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.DYNAMIC_DRAW);

    let texcoord_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1,
    ]), gl.STATIC_DRAW);

    function drawCircle(x, y, r, sharpness=10) {
        gl.useProgram(prog);

        gl.enableVertexAttribArray(pos_attr);
        gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
        let vertices = new Float32Array([
            x - r, y - r,
            x + r, y - r,
            x + r, y + r,
            x - r, y + r,
        ]);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        gl.vertexAttribPointer(pos_attr, 2, gl.FLOAT, false, 0, 0);

        gl.enableVertexAttribArray(texcoord_attr);
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
        gl.vertexAttribPointer(texcoord_attr, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(sharpness_uniform, sharpness);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return drawCircle;
}

class Bubble {
    x: number;
    y: number;
    r: number;
    t_min: number;
    t_max: number;
    constructor() {
        this.x = (Math.random() * 2 - 1) * 0.9;
        this.y = (Math.random() * 2 - 1) * 0.9;
        this.r = 0.2 + Math.random() * 0.1;
        this.t_min = 0;
        this.t_max = this.r * 20;
    }
    idle(dt: number) {
        this.t_min -= dt;
        this.t_max -= dt;
    }
    isAlive() {
        return this.t_max >= 0;
    }
    draw(drawCircle) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        let a = -this.t_min / (this.t_max - this.t_min);
        a = 1 - 2 * Math.abs(a - 0.5);
        drawCircle(this.x, this.y, this.r * Math.sqrt(1 - (1-a)*(1-a)), /*sharpness*/10 * a);
    }
}

class Ripple {
    x: number;
    y: number;
    r: number;
    t_min: number;
    t_max: number;
    idle(dt: number) {
        this.t_min -= dt;
        this.t_max -= dt;
    }
    isAlive() {
        return this.t_max >= 0;
    }
    draw(drawCircle) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        let a = -this.t_min / (this.t_max - this.t_min);
        drawCircle(this.x, this.y, this.r * (1 + a), /*sharpness*/2 * (1 - a));
    }
}

function start() {
    let canvas = <HTMLCanvasElement>document.getElementById('glcanvas');
    let gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let drawCircle = makeCircleDrawer(gl);
    let prev_t = null;

    let bubbles: Bubble[] = [];
    let ripples: Ripple[] = [];

    canvas.onclick = function(e) {
        let rect = canvas.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width * 2 - 1;
        let y = (rect.bottom - e.clientY) / rect.height * 2 - 1;

        let r = new Ripple();
        r.x = x;
        r.y = y;
        r.r = 0.05;
        r.t_min = 0.0;
        r.t_max = 0.5;
        ripples.push(r);
    }

    function renderFrame(t) {
        let dt = prev_t ? (t - prev_t) * 0.001 : 0;
        prev_t = t;

        requestAnimationFrame(renderFrame);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (let b of bubbles) {
            b.draw(drawCircle);
            b.idle(dt);
        }
        for (let r of ripples) {
            r.draw(drawCircle);
            r.idle(dt);
        }
        const spawn_rate = 2;
        if (Math.random() < dt * spawn_rate) {
            bubbles.push(new Bubble());
        }
        bubbles = bubbles.filter((b) => b.isAlive());
        ripples = ripples.filter((r) => r.isAlive());
    }
    requestAnimationFrame(renderFrame);
}

start();
