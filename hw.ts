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

var gl : WebGLRenderingContext = null;

function start() {
    let canvas = <HTMLCanvasElement>document.getElementById('glcanvas');
    let gl = glFromCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let prog = makeShaderProgram(gl, `
    attribute vec2 pos;
    void main() {
      gl_Position = vec4(pos, 0, 1.0);
    }
    `, `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(1, 1, 1, 1);
    }
    `);

    let pos_attr = gl.getAttribLocation(prog, "pos");
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(pos_attr, 2, gl.FLOAT, false, 0, 0);

    let vertices = new Float32Array([
        0, 0,
        1, 0,
        0, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);

    gl.useProgram(prog);

    gl.enableVertexAttribArray(pos_attr);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(pos_attr, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

start();
