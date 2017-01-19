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

    varying vec2 v_texcoord;

    void main() {
      if (dot(v_texcoord, v_texcoord) <= 1.0)
        gl_FragColor = vec4(v_texcoord, 1, 1);
      else
        gl_FragColor = vec4(0, 0, 0, 1);
    }
    `);
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

    function drawCircle(x, y, r) {
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

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return drawCircle;
}

function start() {
    let canvas = <HTMLCanvasElement>document.getElementById('glcanvas');
    let gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let drawCircle = makeCircleDrawer(gl);
    drawCircle(0.5, 0, 0.5);
    drawCircle(0.1, 0.3, 0.2);
    drawCircle(0.1, -0.3, 0.25);
    drawCircle(-0.1, -0.3, 0.15);
}

start();
