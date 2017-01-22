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
        this.x = (Math.random() * 2 - 1) * 0.9;
        this.y = (Math.random() * 2 - 1) * 0.9;
        this.r = 0.2 + Math.random() * 0.1;
        this.t_min = 0;
        this.t_max = this.r * 20;
    }
    Bubble.prototype.idle = function (dt) {
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
var bubbles = [];
var ripples = [];
function start() {
    var canvas = document.getElementById('glcanvas');
    var gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var drawCircle = makeCircleDrawer(gl);
    var drawRing = makeRingDrawer(gl);
    var prev_t = null;
    canvas.onclick = function (e) {
        var rect = canvas.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width * 2 - 1;
        var y = (rect.bottom - e.clientY) / rect.height * 2 - 1;
        var miss = true;
        for (var _i = 0, bubbles_1 = bubbles; _i < bubbles_1.length; _i++) {
            var b = bubbles_1[_i];
            if (b.click(x, y))
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
        }
    };
    function renderFrame(t) {
        var dt = prev_t ? (t - prev_t) * 0.001 : 0;
        prev_t = t;
        requestAnimationFrame(renderFrame);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (var _i = 0, bubbles_2 = bubbles; _i < bubbles_2.length; _i++) {
            var b = bubbles_2[_i];
            b.draw(drawCircle);
            b.idle(dt);
        }
        for (var _a = 0, ripples_1 = ripples; _a < ripples_1.length; _a++) {
            var r = ripples_1[_a];
            r.draw(drawRing);
            r.idle(dt);
        }
        var spawn_rate = 2;
        if (Math.random() < dt * spawn_rate) {
            bubbles.push(new Bubble());
        }
        bubbles = bubbles.filter(function (b) { return b.isAlive(); });
        ripples = ripples.filter(function (r) { return r.isAlive(); });
    }
    requestAnimationFrame(renderFrame);
}
start();
