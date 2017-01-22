function glFromCanvas(canvas) {
    var gl = canvas.getContext('webgl');
    if (!gl)
        throw "Can't get GL context";
    var devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    return gl;
}
function makeShaderProgram(gl, vertex_shader, fragment_shader) {
    var prog = gl.createProgram();
    function addShader(type, source) {
        var s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            throw "Could not compile shader:\n" + gl.getShaderInfoLog(s);
        gl.attachShader(prog, s);
    }
    addShader(gl.VERTEX_SHADER, vertex_shader);
    addShader(gl.FRAGMENT_SHADER, fragment_shader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw 'Could not link the shader program';
    return prog;
}
function makeCircleDrawer(gl) {
    var prog = makeShaderProgram(gl, "\n    attribute vec2 pos;\n    attribute vec2 texcoord;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      gl_Position = vec4(pos, 0, 1.0);\n      v_texcoord = texcoord;\n    }\n    ", "\n    precision mediump float;\n\n    uniform float sharpness;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      float a = clamp(\n          (1.0 - sqrt(dot(v_texcoord, v_texcoord))) * sharpness,\n          0.0, 1.0);\n      gl_FragColor = vec4(v_texcoord, 1, a);\n    }\n    ");
    var sharpness_uniform = gl.getUniformLocation(prog, "sharpness");
    var pos_attr = gl.getAttribLocation(prog, "pos");
    var texcoord_attr = gl.getAttribLocation(prog, "texcoord");
    var pos_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.DYNAMIC_DRAW);
    var texcoord_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1,
    ]), gl.STATIC_DRAW);
    function drawCircle(x, y, r, sharpness) {
        if (sharpness === void 0) { sharpness = 10; }
        gl.useProgram(prog);
        gl.enableVertexAttribArray(pos_attr);
        gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
        var vertices = new Float32Array([
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
function makeRingDrawer(gl) {
    var prog = makeShaderProgram(gl, "\n    attribute vec2 pos;\n    attribute vec2 texcoord;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      gl_Position = vec4(pos, 0, 1.0);\n      v_texcoord = texcoord;\n    }\n    ", "\n    precision mediump float;\n\n    uniform vec4 color;\n    uniform float width;\n\n    varying vec2 v_texcoord;\n\n    void main() {\n      float a = clamp(\n          (1.0 - sqrt(dot(v_texcoord, v_texcoord))) / width,\n          0.0, 1.0);\n      a = 1.0 - 2.0 * abs(a - 0.5);\n      gl_FragColor = vec4(color.rgb, color.a * a);\n    }\n    ");
    var color_uniform = gl.getUniformLocation(prog, "color");
    var width_uniform = gl.getUniformLocation(prog, "width");
    var pos_attr = gl.getAttribLocation(prog, "pos");
    var texcoord_attr = gl.getAttribLocation(prog, "texcoord");
    var pos_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(8), gl.DYNAMIC_DRAW);
    var texcoord_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1,
    ]), gl.STATIC_DRAW);
    return function (x, y, r, width, color) {
        gl.useProgram(prog);
        gl.enableVertexAttribArray(pos_attr);
        gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer);
        var vertices = new Float32Array([
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
var Bubble = (function () {
    function Bubble() {
    }
    Bubble.prototype.idle = function (dt) {
        if (this.t_max >= 0 && this.t_max - dt < 0) {
            var ripple = new Ripple();
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
            var pos = lifeIndicatorPos(lives);
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
    };
    Bubble.prototype.isAlive = function () {
        return this.t_max >= 0;
    };
    Bubble.prototype.getA = function (t) {
        if (this.t_min > t || this.t_max < t)
            return 0;
        var a = (t - this.t_min) / (this.t_max - this.t_min);
        a = 1 - 2 * Math.abs(a - 0.5);
        return a;
    };
    Bubble.prototype.getRadius = function (a) {
        return this.r * Math.sqrt(1 - (1 - a) * (1 - a));
    };
    Bubble.prototype.draw = function (drawCircle) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        var a = this.getA(0);
        drawCircle(this.x, this.y, this.getRadius(a), /*sharpness*/ 10 * a);
    };
    Bubble.prototype.click = function (x, y) {
        var r = this.getRadius(this.getA(0));
        var d = Math.sqrt(Math.pow((this.x - x), 2) + Math.pow((this.y - y), 2));
        if (d <= r) {
            this.t_min = -2;
            this.t_max = -1;
            var ripple = new Ripple();
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
    };
    Bubble.prototype.overlap = function (other) {
        var t1 = Math.max(this.t_min, other.t_min);
        var t2 = Math.min(this.t_max, other.t_max);
        if (t1 >= t2)
            return false;
        var d = Math.sqrt(Math.pow((this.x - other.x), 2) + Math.pow((this.y - other.y), 2));
        for (var i = 1; i < 5; i++) {
            var t = t1 + i * (t2 - t1) / 5;
            var r1 = this.getRadius(this.getA(t));
            var r2 = other.getRadius(other.getA(t));
            if (d < r1 + r2)
                return true;
        }
        return false;
    };
    return Bubble;
}());
var Ripple = (function () {
    function Ripple() {
    }
    Ripple.prototype.idle = function (dt) {
        this.t_min -= dt;
        this.t_max -= dt;
    };
    Ripple.prototype.isAlive = function () {
        return this.t_max >= 0;
    };
    Ripple.prototype.draw = function (drawRing) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        var a = -this.t_min / (this.t_max - this.t_min);
        var c = this.color;
        drawRing(this.x, this.y, this.r * (1 + 0.5 * a), 0.3 + a, [c[0], c[1], c[2], (1.0 - a) * c[3]]);
    };
    return Ripple;
}());
var GamePhase;
(function (GamePhase) {
    GamePhase[GamePhase["WAIT"] = 0] = "WAIT";
    GamePhase[GamePhase["PLAY"] = 1] = "PLAY";
    GamePhase[GamePhase["DEAD"] = 2] = "DEAD";
})(GamePhase || (GamePhase = {}));
var bubbles = [];
var ripples = [];
var lives = 5;
var spawnRate = 1.5;
var deathTimer = 0;
var phase = GamePhase.WAIT;
var points = 0;
var misses = 0;
var startTime = null;
function lifeIndicatorPos(i) {
    return { x: 0.05 + 0.1 * i - 1, y: 1 - 0.05, r: 0.03 };
}
function start() {
    var canvas = document.getElementById('glcanvas');
    var gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var drawCircle = makeCircleDrawer(gl);
    var drawRing = makeRingDrawer(gl);
    var b = new Bubble();
    b.x = 0;
    b.y = 0;
    b.r = 0.3;
    b.t_min = -1000;
    b.t_max = 1000;
    bubbles.push(b);
    var prev_t = null;
    function handleClick(x, y) {
        if (phase == GamePhase.DEAD)
            return;
        var miss = true;
        for (var _i = 0, bubbles_1 = bubbles; _i < bubbles_1.length; _i++) {
            var b_1 = bubbles_1[_i];
            if (b_1.click(x, y))
                miss = false;
        }
        if (miss) {
            var r = new Ripple();
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
    canvas.onclick = function (e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width * 2 - 1;
        var y = (rect.bottom - e.clientY) / rect.height * 2 - 1;
        handleClick(x, y);
    };
    canvas.ontouchstart = function (e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        for (var i = 0; i < e.touches.length; i++) {
            var t = e.touches.item(i);
            var x = (t.clientX - rect.left) / rect.width * 2 - 1;
            var y = (rect.bottom - t.clientY) / rect.height * 2 - 1;
            handleClick(x, y);
        }
    };
    function renderFrame(t) {
        var dt = prev_t ? (t - prev_t) * 0.001 : 0;
        prev_t = t;
        requestAnimationFrame(renderFrame);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Draw
        for (var _i = 0, bubbles_2 = bubbles; _i < bubbles_2.length; _i++) {
            var b_2 = bubbles_2[_i];
            b_2.draw(drawCircle);
        }
        for (var _a = 0, ripples_1 = ripples; _a < ripples_1.length; _a++) {
            var r = ripples_1[_a];
            r.draw(drawRing);
        }
        for (var i = 0; i < lives; i++) {
            var pos = lifeIndicatorPos(i);
            drawCircle(pos.x, pos.y, pos.r, /*sharpness*/ 5);
        }
        // Update
        if (phase == GamePhase.WAIT)
            startTime = t * 1e-3;
        if (phase != GamePhase.DEAD) {
            for (var _b = 0, bubbles_3 = bubbles; _b < bubbles_3.length; _b++) {
                var b_3 = bubbles_3[_b];
                b_3.idle(dt);
            }
            for (var _c = 0, ripples_2 = ripples; _c < ripples_2.length; _c++) {
                var r = ripples_2[_c];
                r.idle(dt);
            }
        }
        if (phase == GamePhase.PLAY) {
            spawnRate += dt / 40;
            if (lives <= 0)
                deathTimer += dt;
            if (deathTimer > 0.3) {
                phase = GamePhase.DEAD;
                var e = document.getElementById("stats");
                console.log(spawnRate);
                e.innerHTML = "\n                <b>Hits: " + points + "</b><br>\n                Misses: " + misses + "<br>\n                Accuracy: " + Math.floor(100 * points / (points + misses)) + "%<br>\n                Time: " + (t * 1e-3 - startTime).toFixed(1) + "s\n                ";
            }
        }
        if (phase == GamePhase.PLAY && Math.random() < dt * spawnRate) {
            var added = false;
            var _loop_1 = function (attempt) {
                var b_4 = new Bubble();
                b_4.x = (Math.random() * 2 - 1) * 0.9;
                b_4.y = (Math.random() * 2 - 1) * 0.9;
                b_4.r = 0.2 + Math.random() * 0.1;
                b_4.t_min = 0;
                b_4.t_max = b_4.r * 20;
                if (bubbles.every(function (bb) { return !b_4.overlap(bb); })) {
                    bubbles.push(b_4);
                    added = true;
                    return "break";
                }
            };
            for (var attempt = 0; attempt < 10; attempt++) {
                var state_1 = _loop_1(attempt);
                if (state_1 === "break")
                    break;
            }
            if (!added)
                console.log("not enough room to spawn new bubble");
        }
        bubbles = bubbles.filter(function (b) { return b.isAlive(); });
        ripples = ripples.filter(function (r) { return r.isAlive(); });
    }
    requestAnimationFrame(renderFrame);
}
start();
