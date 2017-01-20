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
    Bubble.prototype.draw = function (drawCircle) {
        if (this.t_min > 0 || this.t_max < 0)
            return;
        var a = -this.t_min / (this.t_max - this.t_min);
        a = 1 - 2 * Math.abs(a - 0.5);
        drawCircle(this.x, this.y, this.r * Math.sqrt(1 - (1 - a) * (1 - a)), /*sharpness*/ 10 * a);
    };
    return Bubble;
}());
function start() {
    var canvas = document.getElementById('glcanvas');
    var gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var drawCircle = makeCircleDrawer(gl);
    var prev_t = null;
    var bubbles = [];
    function renderFrame(t) {
        var dt = prev_t ? (t - prev_t) * 0.001 : 0;
        prev_t = t;
        requestAnimationFrame(renderFrame);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        for (var _i = 0, bubbles_1 = bubbles; _i < bubbles_1.length; _i++) {
            var b = bubbles_1[_i];
            b.draw(drawCircle);
            b.idle(dt);
        }
        var spawn_rate = 2;
        if (Math.random() < dt * spawn_rate) {
            bubbles.push(new Bubble());
        }
        bubbles = bubbles.filter(function (b) { return b.isAlive(); });
    }
    requestAnimationFrame(renderFrame);
}
start();
