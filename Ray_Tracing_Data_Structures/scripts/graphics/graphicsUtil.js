// @ts-check
/**
 * 
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSource 
 * @param {string} fragSource 
 */
let buildProgram = (gl, vertexSource, fragSource) => {
    let vertexShader = buildShader(gl, vertexSource, gl.VERTEX_SHADER);
    let fragmentShader = buildShader(gl, fragSource, gl.FRAGMENT_SHADER);
    let program = gl.createProgram();
    if(!program){
        throw "Unable to create program";
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        debugger
        throw `Failed to link program:\n${gl.getProgramInfoLog(program)}`;
    }
    return program;
}

/**
 * 
 * @param {WebGL2RenderingContext} gl 
 * @param {string} source 
 * @param {number} type 
 */
let buildShader = (gl, source, type) => {
    let shader = gl.createShader(type);
    if(!shader){
        throw "Unable to create shader";
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        debugger
        throw `Failed to compile shader:\n${gl.getShaderInfoLog(shader)}`;
    }
    return shader;
}

/**
 * 
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexPath 
 * @param {string} fragmentPath 
 */
let buildProgramFromFiles = async (gl, vertexPath, fragmentPath) => {
    let vFile = fetch(vertexPath).then(r => r.text());
    let fFile = fetch(fragmentPath).then(r => r.text());
    let sources = await Promise.all([vFile, fFile]);

    return buildProgram(gl, sources[0], sources[1]);
}

export {buildProgramFromFiles, buildProgram}