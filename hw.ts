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

function makeRingDrawer(gl: WebGLRenderingContext):
    (x: number, y: number, r: number, width: number, color: number[])=>void {

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

    uniform vec4 color;
    uniform float width;

    varying vec2 v_texcoord;

    void main() {
      float a = clamp(
          (1.0 - sqrt(dot(v_texcoord, v_texcoord))) / width,
          0.0, 1.0);
      a = 1.0 - 2.0 * abs(a - 0.5);
      gl_FragColor = vec4(color.rgb, color.a * a);
    }
    `);
    let color_uniform = gl.getUniformLocation(prog, "color");
    let width_uniform = gl.getUniformLocation(prog, "width");
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

    return function(x, y, r, width, color) {
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

        gl.uniform1f(width_uniform, width);
        gl.uniform4fv(color_uniform, color);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    };
}

class Bubble {
    x: number;
    y: number;
    r: number;
    t_min: number;
    t_max: number;

    idle(dt: number) {
        if (this.t_max >= 0 && this.t_max - dt < 0) {
            let ripple = new Ripple();
            ripple.x = this.x;
            ripple.y = this.y;
            ripple.r = 0.04;
            ripple.t_min = 0;
            ripple.t_max = 1.0;
            ripple.color = [1, 0, 0, 1];
            ripples.push(ripple);

            ripple = new Ripple();
            ripple.x = this.x;
            ripple.y = this.y;
            ripple.r = 0.06;
            ripple.t_min = 0.1;
            ripple.t_max = 0.5;
            ripple.color = [1, 0, 0, 1];
            ripples.push(ripple);

            lives--;
            let pos = lifeIndicatorPos(lives);
            ripple = new Ripple();
            ripple.x = pos.x;
            ripple.y = pos.y;
            ripple.r = pos.r;
            ripple.t_min = 0.0;
            ripple.t_max = 1.5;
            ripple.color = [1, 0, 0, 1];
            ripples.push(ripple);

        }
        this.t_min -= dt;
        this.t_max -= dt;
    }
    isAlive() {
        return this.t_max >= 0;
    }
    getA(t) {
        if (this.t_min > t || this.t_max < t)
            return 0;
        let a = (t - this.t_min) / (this.t_max - this.t_min);
        a = 1 - 2 * Math.abs(a - 0.5);
        return a;
    }
    getRadius(a) {
        return this.r * Math.sqrt(1 - (1-a)*(1-a));
    }
    draw(drawCircle) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        let a = this.getA(0);
        drawCircle(this.x, this.y, this.getRadius(a), /*sharpness*/10 * a);
    }
    click(x: number, y: number): boolean {
        let r = this.getRadius(this.getA(0));
        let d = Math.sqrt((this.x - x)**2 + (this.y - y)**2);
        if (d <= r) {
            this.t_min = -2;
            this.t_max = -1;

            let ripple = new Ripple();
            ripple.x = this.x;
            ripple.y = this.y;
            ripple.r = r;
            ripple.t_min = 0;
            ripple.t_max = 0.5;
            ripple.color = [0, 0.5, 1, 0.2];
            ripples.push(ripple);

            points++;

            if (phase == GamePhase.WAIT) {
                phase = GamePhase.PLAY;
                misses = 0;
            }
            return true;
        }
        return false;
    }
    overlap(other: Bubble) {
        let t1 = Math.max(this.t_min, other.t_min);
        let t2 = Math.min(this.t_max, other.t_max);
        if (t1 >= t2)
            return false;
        let d = Math.sqrt((this.x - other.x)**2 + (this.y - other.y)**2);
        for (let i = 1; i < 5; i++) {
            let t = t1 + i * (t2 - t1) / 5;
            let r1 = this.getRadius(this.getA(t));
            let r2 = other.getRadius(other.getA(t));
            if (d < r1 + r2)
                return true;
        }
        return false;
    }
}

class Ripple {
    x: number;
    y: number;
    r: number;
    t_min: number;
    t_max: number;
    color: number[];
    idle(dt: number) {
        this.t_min -= dt;
        this.t_max -= dt;
    }
    isAlive() {
        return this.t_max >= 0;
    }
    draw(drawRing) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        let a = -this.t_min / (this.t_max - this.t_min);
        let c = this.color;
        drawRing(
            this.x, this.y, this.r * (1 + 0.5 * a),
            0.3 + a, [c[0], c[1], c[2], (1.0 - a) * c[3]]);
    }
}

enum GamePhase {
    WAIT,
    PLAY,
    DEAD,
}

let bubbles: Bubble[] = [];
let ripples: Ripple[] = [];
let lives = 5;
let spawnRate = 1.5;
let deathTimer = 0;
let phase = GamePhase.WAIT;
let points = 0;
let misses = 0;

function lifeIndicatorPos(i: number) {
    return {x: 0.05 + 0.1 * i - 1, y: 1 - 0.05, r: 0.03};
}

function start() {
    let canvas = <HTMLCanvasElement>document.getElementById('glcanvas');
    let gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let drawCircle = makeCircleDrawer(gl);
    let drawRing = makeRingDrawer(gl);

    let b = new Bubble();
    b.x = 0;
    b.y = 0;
    b.r = 0.3;
    b.t_min = -1000;
    b.t_max = 1000;
    bubbles.push(b);

    let prev_t = null;

    function handleClick(x, y) {
        if (phase == GamePhase.DEAD)
            return;

        let miss = true;
        for (let b of bubbles)
            if (b.click(x, y))
                miss = false;

        if (miss) {
            let r = new Ripple();
            r.x = x;
            r.y = y;
            r.r = 0.05;
            r.t_min = 0.0;
            r.t_max = 0.5;
            r.color = [1, 1, 1, 0.5];
            ripples.push(r);

            misses++;
        }
    }

    canvas.onclick = function(e) {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width * 2 - 1;
        let y = (rect.bottom - e.clientY) / rect.height * 2 - 1;
        handleClick(x, y);
    }
    canvas.ontouchstart = function(e) {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        for (let i = 0; i < e.touches.length; i++) {
            let t = e.touches.item(i);
            let x = (t.clientX - rect.left) / rect.width * 2 - 1;
            let y = (rect.bottom - t.clientY) / rect.height * 2 - 1;
            handleClick(x, y);
        }
    }

    function renderFrame(t) {
        let dt = prev_t ? (t - prev_t) * 0.001 : 0;
        prev_t = t;

        requestAnimationFrame(renderFrame);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw
        for (let b of bubbles) {
            b.draw(drawCircle);
        }
        for (let r of ripples) {
            r.draw(drawRing);
        }
        for (let i = 0; i < lives; i++) {
            let pos = lifeIndicatorPos(i);
            drawCircle(pos.x, pos.y, pos.r, /*sharpness*/5);
        }

        // Update
        if (phase != GamePhase.DEAD) {
            for (let b of bubbles) {
                b.idle(dt);
            }
            for (let r of ripples) {
                r.idle(dt);
            }
        }
        if (phase == GamePhase.PLAY) {
            spawnRate += dt / 40;
            if (lives <= 0)
                deathTimer += dt;
            if (deathTimer > 0.3) {
                phase = GamePhase.DEAD;
                let e = document.getElementById("stats");
                console.log(spawnRate);
                e.innerHTML = `
                Hits: ${points}<br>
                Misses: ${misses}<br>
                Accuracy: ${Math.floor(100 * points / (points + misses))}%
                `;
            }
        }
        if (phase == GamePhase.PLAY && Math.random() < dt * spawnRate) {
            let added = false;
            for (let attempt = 0; attempt < 10; attempt++) {
                let b = new Bubble();
                b.x = (Math.random() * 2 - 1) * 0.9;
                b.y = (Math.random() * 2 - 1) * 0.9;
                b.r = 0.2 + Math.random() * 0.1;
                b.t_min = 0;
                b.t_max = b.r * 20;
                if (bubbles.every((bb)=>!b.overlap(bb))) {
                    bubbles.push(b);
                    added = true;
                    break;
                }
            }
            if (!added)
                console.log("not enough room to spawn new bubble");
        }
        bubbles = bubbles.filter((b) => b.isAlive());
        ripples = ripples.filter((r) => r.isAlive());
    }
    requestAnimationFrame(renderFrame);
}

start();
