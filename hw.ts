function start() {
    let canvas = <HTMLCanvasElement>document.getElementById('glcanvas');
    let gl = <WebGLRenderingContext>canvas.getContext('webgl');
    if (!gl) alert("can't get GL context");

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

start();
