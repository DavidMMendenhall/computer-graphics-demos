// @ts-check

import { copyMatrix4x4, getIdenity4x4Matricies, identityMatrix4x4, inverseMatrix4x4, lookAt, multiplyMatrix4x4, scaleMatrix4x4, translate, transposeMatrix4x4 } from "../math/matrix.js";
import { projectionPerspectiveFOV } from "../math/projection.js";
import { buildProgramFromFiles } from "./graphicsUtil.js";
// Axis aligned bounding box constants
const AABBMin_X = 0;
const AABBMin_Y = 1;
const AABBMin_Z = 2;

const AABBMax_X = 3;
const AABBMax_Y = 4;
const AABBMax_Z = 5;
/**
 * @typedef Model
 * @prop {Float32Array} vertices
 * @prop {Float32Array} normals
 * @prop {Uint16Array | Uint32Array} indices
 * @prop {WebGLVertexArrayObject} [_VAO]
 */

const canvas = document.createElement('canvas');
canvas.id = 'canvas';
document.body.appendChild(canvas);
canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;

/** @type {WebGL2RenderingContext} */
// @ts-ignore
const gl = canvas.getContext('webgl2');
if(!gl){
    throw "Unable to get Webgl2 rendering context";
}

// set up programs, uniforms and attributes
const specularProgram = 
    await buildProgramFromFiles(gl, './assets/shaders/specular.vert', './assets/shaders/specular.frag');
const basicProgram = 
    await buildProgramFromFiles(gl, './assets/shaders/basic.vert', './assets/shaders/basic.frag');

const uniforms = {
    specular:{
        mat: {
            aspect: gl.getUniformLocation(specularProgram, 'uAspect'),
            projection: gl.getUniformLocation(specularProgram, 'uProjection'),
            view: gl.getUniformLocation(specularProgram, 'uView'),
            // model: gl.getUniformLocation(specularProgram, 'uModel'),
        },
        eye: gl.getUniformLocation(specularProgram, 'uEye'),
        color: gl.getUniformLocation(specularProgram, 'uColor'),
    },
    basic:{
        mat: {
            aspect: gl.getUniformLocation(basicProgram, 'uAspect'),
            projection: gl.getUniformLocation(basicProgram, 'uProjection'),
            view: gl.getUniformLocation(basicProgram, 'uView'),
            // model: gl.getUniformLocation(basicProgram, 'uModel'),
        },
        color: gl.getUniformLocation(basicProgram, 'uColor'),
    },
}

const attributes = {
    specular:{
        position: gl.getAttribLocation(specularProgram, 'aPosition'),
        normal: gl.getAttribLocation(specularProgram, 'aNormal'),
        model: gl.getAttribLocation(specularProgram, 'aModel'),
        color: gl.getAttribLocation(specularProgram, 'aColor'),
    },
    basic:{
        position: gl.getAttribLocation(basicProgram, 'aPosition'),
        color: gl.getAttribLocation(basicProgram, 'aColor'),
        model: gl.getAttribLocation(basicProgram, 'aModel'),
    },
}

// Set up WebGLSettings
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.enable(gl.SCISSOR_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.depthFunc(gl.LEQUAL);


// set up aspect matrix (its global and should be)
let aspectMatrix = getIdenity4x4Matricies(1);
let updateAspect = () => {
    if (canvas.width > canvas.height) {
        aspectMatrix[0] = canvas.height / canvas.width;
    } else {
        aspectMatrix[5] = canvas.width / canvas.height;
    }
};

/** @type {WebGLBuffer}*/
// @ts-ignore
const MODEL_MATRIX_BUFFER = gl.createBuffer();
/** @type {WebGLBuffer}*/
// @ts-ignore
const MODEL_COLOR_BUFFER = gl.createBuffer();
if(!MODEL_MATRIX_BUFFER || !MODEL_COLOR_BUFFER){
    throw "Could not create global model buffers";
}
let modelMatrixData = new Float32Array(16);
let modelColorData = new Float32Array(4);
let modelArraySize = 1;

/**
 * 
 * @param {number} modelCount 
 */
let resizeModelData = (modelCount) => {
    modelArraySize = modelCount;
    modelMatrixData = new Float32Array(16 * modelCount);
    modelColorData = new Float32Array(4 * modelCount);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_MATRIX_BUFFER);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * 4 * modelCount, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_COLOR_BUFFER);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 4 * modelCount, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

resizeModelData(1);


// camera utils
/**
 * @typedef Camera
 * @prop {{x:number, y:number, z:number}} position
 * @prop {{x:number, y:number, z:number}} target
 * @prop {{x:number, y:number, z:number}} up
 * @prop {number} fieldOfView Radians
 * @prop {number} near
 * @prop {number} far
*/

/**
 * Builds a projection matrix for a camera
 * @param {Camera} camera
 * @param {Float32Array} [destination]
*/
let getCameraMatrix = (camera, destination) => {
    if(destination){
        return inverseMatrix4x4(lookAt(camera.position, camera.target, camera.up), destination);
    }
    return inverseMatrix4x4(lookAt(camera.position, camera.target, camera.up));
};

/**
 * 
 * @param {Camera} camera 
 * @returns 
 */
let getInverseViewProjectionAspectMatrix = (camera) => {
    let projection = projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far);
    let view = getCameraMatrix(camera);
    return inverseMatrix4x4(multiplyMatrix4x4(view, multiplyMatrix4x4(projection, aspectMatrix)));
}


// Set up view panel manager
const viewPanelIds = {
    main: 0,
    mini: 1,
}

let viewPanelManager = (() => {
    const miniSize = 1/3;
    let currentView = viewPanelIds.main;
    /**
     * Sets up the viewport and box for a given view
     * @param {0|1} id 
    */
   let setView = (id) => {
       currentView = id;
       if(id == viewPanelIds.main){
           gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
           gl.scissor(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        }else if(id == viewPanelIds.mini){
            gl.viewport(0, 0, gl.drawingBufferWidth * miniSize, gl.drawingBufferHeight * miniSize);
            gl.scissor(0, 0, gl.drawingBufferWidth * miniSize, gl.drawingBufferHeight * miniSize);
        }
    };
    
    return {
        get currentView(){ return currentView },
        set currentView(val){if(val == 0 || val == 1){
            setView(val);
        }}
    }
})();

let resize = () => {
    canvas.width = canvas.getBoundingClientRect().width;
    canvas.height = canvas.getBoundingClientRect().height;
    updateAspect();
    viewPanelManager.currentView = viewPanelManager.currentView;// trigger the setter
}
window.addEventListener('resize', resize);
resize();

/**
 * 
 * @param {number[]} color 
 */
let clear = (color) => {
    let v = viewPanelManager.currentView;
    gl.colorMask(true, true, true, true);
    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clearDepth(1.0);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.colorMask(true, true, true, false); // disable alpha write
}

/**
 * 
 * @param {Model} model
 * @param {WebGLBuffer} matrixBuffer The global matrix buffer
 * @param {WebGLBuffer} colorBuffer The color matrix buffer
 */
let buildVAO = (model, matrixBuffer, colorBuffer) => {
    let vertexBuffer = gl.createBuffer();
    let normalBuffer = gl.createBuffer();
    let indexBuffer = gl.createBuffer();
    if(!vertexBuffer || !normalBuffer || !indexBuffer){
        throw "Failed to create buffers";
    }

    let VAO = gl.createVertexArray();
    if(!VAO){
        throw "Failed to create vertex array";
    }

    gl.bindVertexArray(VAO);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

    // this covers both the specular and basic programs, position is forced to the same location 0
    gl.enableVertexAttribArray(attributes.specular.position);
    gl.vertexAttribPointer(attributes.specular.position, 3, gl.FLOAT, false, 3 * model.vertices.BYTES_PER_ELEMENT, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, matrixBuffer);
    // don't buffer data to it, it will be done at run time

    for(let col = 0; col < 4; col++){
        let colLocation = attributes.specular.model + col;
        gl.enableVertexAttribArray(colLocation);
        gl.vertexAttribPointer(colLocation, 4, gl.FLOAT, false, 16 * 4, col * 4 * 4);
        gl.vertexAttribDivisor(colLocation, 1);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(attributes.specular.color);
    gl.vertexAttribPointer(attributes.specular.color, 4, gl.FLOAT, false, 4 * 4, 0);
    gl.vertexAttribDivisor(attributes.specular.color, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(attributes.specular.normal);
    gl.vertexAttribPointer(attributes.specular.normal, 3, gl.FLOAT, false, 3 * model.normals.BYTES_PER_ELEMENT, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return VAO;
};

/**
 * 
 * @param {import("./item.js").Item} item 
 * @param {Float32Array} matrixArray
 * @param {number} index
 * 
 */
let buildItemModelMat = (item, matrixArray, index) => {
    let m = new Float32Array(matrixArray.buffer, matrixArray.BYTES_PER_ELEMENT * 16 * index, 16);
    identityMatrix4x4(m);
    translate(m, item.position[0], item.position[1], item.position[2]);
    scaleMatrix4x4(m, item.scale[0], item.scale[1], item.scale[2]);
    return m;
}

/**
 * Draws items with the specular shader
 * @param {import("./item.js").Item[]} items 
 * @param {Model} model
 * @param {Camera} camera 
 * @param {number[]} [color] force a color on objects, expects 4 numbers
 */
let drawItems = (items, camera, model, color) => {
    gl.useProgram(specularProgram);
    if(!model._VAO){
        model._VAO = buildVAO(model, MODEL_MATRIX_BUFFER, MODEL_COLOR_BUFFER);
    }

    if(modelArraySize < items.length){
        resizeModelData(items.length);
    }

    gl.uniformMatrix4fv(uniforms.specular.mat.aspect, false, aspectMatrix);
    gl.uniformMatrix4fv(uniforms.specular.mat.projection, false, projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far));
    gl.uniformMatrix4fv(uniforms.specular.mat.view, false, getCameraMatrix(camera));
    gl.uniform3f(uniforms.specular.eye, camera.position.x, camera.position.y, camera.position.z)
    
    gl.bindVertexArray(model._VAO);
    let indexType = model.indices.BYTES_PER_ELEMENT == 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
    for(let i = 0; i < items.length; i++){
        let item = items[i];
        let r = color ? color[0] : item.color[0];
        let g = color ? color[1] : item.color[1];
        let b = color ? color[2] : item.color[2];
        let a = color ? color[3] : 1;

        modelColorData[4 * i + 0] = r;
        modelColorData[4 * i + 1] = g;
        modelColorData[4 * i + 2] = b;
        modelColorData[4 * i + 3] = a;
        buildItemModelMat(item, modelMatrixData, i);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_MATRIX_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelMatrixData, 0, items.length * 16);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_COLOR_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelColorData, 0, items.length * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawElementsInstanced(gl.TRIANGLES, model.indices.length, indexType, 0, items.length);
    gl.bindVertexArray(null);
}

/**
 * Draws items with the basci shader as lines
 * @param {import("./item.js").Item[]} items 
 * @param {Model} model
 * @param {Camera} camera 
 * @param {number[]} [color] force a color on objects, expects 4 numbers
 */
let drawItemOutlines = (items, camera, model, color) => {
    gl.useProgram(basicProgram);
    if(!model._VAO){
        model._VAO = buildVAO(model, MODEL_MATRIX_BUFFER, MODEL_COLOR_BUFFER);
    }

    if(modelArraySize < items.length){
        resizeModelData(items.length);
    }

    gl.uniformMatrix4fv(uniforms.basic.mat.aspect, false, aspectMatrix);
    gl.uniformMatrix4fv(uniforms.basic.mat.projection, false, projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far));
    gl.uniformMatrix4fv(uniforms.basic.mat.view, false, getCameraMatrix(camera));
    
    gl.bindVertexArray(model._VAO);
    let indexType = model.indices.BYTES_PER_ELEMENT == 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
    for(let i = 0; i < items.length; i++){
        let item = items[i];
        let r = color ? color[0] : item.color[0];
        let g = color ? color[1] : item.color[1];
        let b = color ? color[2] : item.color[2];
        let a = color ? color[3] : 1;

        modelColorData[4 * i + 0] = r;
        modelColorData[4 * i + 1] = g;
        modelColorData[4 * i + 2] = b;
        modelColorData[4 * i + 3] = a;
        buildItemModelMat(item, modelMatrixData, i);
        // gl.uniformMatrix4fv(uniforms.basic.mat.model, false, buildItemModelMat(item));
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_MATRIX_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelMatrixData, 0, items.length * 16);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_COLOR_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelColorData, 0, items.length * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawElementsInstanced(gl.LINE_STRIP, model.indices.length, indexType, 0, items.length);
    gl.bindVertexArray(null);
}

/**
 * @type {Model}
 */
let boxModel = {
    vertices: new Float32Array([
        -1, 1, 1, // front
        -1,-1, 1,
         1,-1, 1,
         1, 1, 1,

        1, 1, -1, // back
        1, -1, -1,
        -1, -1, -1,
        -1, 1, -1,

        -1, 1, -1, // left
        -1, -1, -1,
        -1, -1, 1,
        -1, 1, 1,

        1, 1, 1, // right
        1, -1, 1,
        1, -1, -1,
        1, 1, -1,

        -1, 1, -1, // top
        -1, 1, 1,
        1, 1, 1,
        1, 1, -1,

        -1, -1, 1, // bottom
        -1, -1, -1,
        1, -1, -1,
        1, -1, 1,
    ]),
    normals: new Float32Array([
        0.0, 0.0, 1.0, // front
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        0.0, 0.0, -1.0, // back
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,

        -1.0, 0.0, 0.0, // left
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,

        1.0, 0.0, 0.0, // right
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        0.0, 1.0, 0.0, // top
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        0.0, -1.0, 0.0, // bottom
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
    ]),
    indices: new Uint32Array([
        0 + 0, 1 + 0,   1 + 0, 2 + 0,   2 + 0, 3 + 0,  3 + 0, 0 + 0,
        0 + 4, 1 + 4,   1 + 4, 2 + 4,   2 + 4, 3 + 4,  3 + 4, 0 + 4,
        0 + 8, 1 + 8,   1 + 8, 2 + 8,   2 + 8, 3 + 8,  3 + 8, 0 + 8,
        0 +12, 1 +12,   1 +12, 2 +12,   2 +12, 3 +12,  3 +12, 0 +12,
        0 +16, 1 +16,   1 +16, 2 +16,   2 +16, 3 +16,  3 +16, 0 +16,
        0 +20, 1 +20,   1 +20, 2 +20,   2 +20, 3 +20,  3 +20, 0 +20, // line model

        0 + 0, 1 + 0, 2 + 0, 0 + 0, 2 + 0, 3 + 0,
        0 + 4, 1 + 4, 2 + 4, 0 + 4, 2 + 4, 3 + 4,
        0 + 8, 1 + 8, 2 + 8, 0 + 8, 2 + 8, 3 + 8,
        0 +12, 1 +12, 2 +12, 0 +12, 2 +12, 3 +12,
        0 +16, 1 +16, 2 +16, 0 +16, 2 +16, 3 +16,
        0 +20, 1 +20, 2 +20, 0 +20, 2 +20, 3 +20, // box model
    ])
};

/**
 * 
 * @param {Camera} viewCamera Camera to view the scene
 * @param {Camera} frustumCamera Camera whose frustum is drawn
 */
let drawCameraFrustum = (viewCamera, frustumCamera) => {
    if(!boxModel._VAO){
        boxModel._VAO = buildVAO(boxModel, MODEL_MATRIX_BUFFER, MODEL_COLOR_BUFFER);
    }
    
    gl.useProgram(basicProgram);
    gl.uniformMatrix4fv(uniforms.basic.mat.aspect, false, aspectMatrix);
    gl.uniformMatrix4fv(uniforms.basic.mat.projection, false, projectionPerspectiveFOV(viewCamera.fieldOfView, viewCamera.near, viewCamera.far));
    gl.uniformMatrix4fv(uniforms.basic.mat.view, false, getCameraMatrix(viewCamera));
    // gl.uniformMatrix4fv(uniforms.basic.mat.model, false, getInverseViewProjectionAspectMatrix(frustumCamera));
    gl.bindVertexArray(boxModel._VAO);
    // gl.uniform4fv(uniforms.basic.color, [0, 1, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_MATRIX_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(getInverseViewProjectionAspectMatrix(frustumCamera)));
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_COLOR_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([0, 1, 1, 1]));
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    gl.drawElementsInstanced(gl.LINES, 8 * 6, gl.UNSIGNED_INT, 0, 1);

    gl.disable(gl.CULL_FACE);
    gl.depthMask(false);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_COLOR_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([1, 1, 0, 0.2]));
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawElementsInstanced(gl.TRIANGLES, boxModel.indices.length  - (8 * 6), gl.UNSIGNED_INT, 8 * 6 * boxModel.indices.BYTES_PER_ELEMENT, 1);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);

};

/**
 * @typedef GenericTreeNode
 * @property {GenericTreeNode[] | null} children
 * @property {import("../engine/item.js").Item[]} items
 * @property {number[]} boundingBox
 */
 
/**
 * @param {GenericTreeNode} node
 */
let getNodeModelMatrix = (node) => {
    let boxCenter = [
        (node.boundingBox[AABBMax_X] + node.boundingBox[AABBMin_X]) * 0.5,
        (node.boundingBox[AABBMax_Y] + node.boundingBox[AABBMin_Y]) * 0.5,
        (node.boundingBox[AABBMax_Z] + node.boundingBox[AABBMin_Z]) * 0.5,
    ];
    let boxExtents = [
        node.boundingBox[AABBMax_X] - boxCenter[0],
        node.boundingBox[AABBMax_Y] - boxCenter[1],
        node.boundingBox[AABBMax_Z] - boxCenter[2],
    ];

    let m = getIdenity4x4Matricies(1);
    translate(m, boxCenter[0], boxCenter[1], boxCenter[2]);
    scaleMatrix4x4(m, boxExtents[0], boxExtents[1], boxExtents[2]);
    return m;
};

/**
 * Draws node outlines using the basic shader
 * @param {GenericTreeNode[]} nodes 
 * @param {Camera} camera
 * @param {number[]} color
 */
let drawTreeNodes = (nodes, camera, color) => {
    gl.useProgram(basicProgram);
    gl.uniformMatrix4fv(uniforms.basic.mat.view, false, getCameraMatrix(camera));
    gl.uniformMatrix4fv(uniforms.basic.mat.aspect, false, aspectMatrix);
    gl.uniformMatrix4fv(uniforms.basic.mat.projection, false, projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far));
    if(!boxModel._VAO){
        boxModel._VAO = buildVAO(boxModel, MODEL_MATRIX_BUFFER, MODEL_COLOR_BUFFER);
    }
    if(modelArraySize < nodes.length){
        resizeModelData(nodes.length);
    }
    gl.bindVertexArray(boxModel._VAO);
    for(let n = 0; n < nodes.length; n++){
        let node = nodes[n];
        let subMat = new Float32Array(modelMatrixData.buffer, n * 16 * 4, 16);
        modelColorData[n * 4 + 0] = color[0];
        modelColorData[n * 4 + 1] = color[1];
        modelColorData[n * 4 + 2] = color[2];
        modelColorData[n * 4 + 3] = color[3];
        copyMatrix4x4(getNodeModelMatrix(node), subMat);
        
        // gl.drawElements(gl.TRIANGLES, boxModel.indices.length  - (8 * 6), gl.UNSIGNED_INT, 8 * 6 * boxModel.indices.BYTES_PER_ELEMENT);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_MATRIX_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelMatrixData, 0, nodes.length * 16);
    gl.bindBuffer(gl.ARRAY_BUFFER, MODEL_COLOR_BUFFER);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelColorData, 0, nodes.length * 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawElementsInstanced(gl.LINES, 8 * 6, gl.UNSIGNED_INT, 0, nodes.length);
    gl.bindVertexArray(null);
}

viewPanelManager.currentView = viewPanelIds.mini;

let GraphicsAPI = {
    clear,
    getInverseViewProjectionAspectMatrix,
    drawItems,
    drawItemOutlines,
    drawCameraFrustum,
    drawTreeNodes,
    viewPanelManager,
};

export { GraphicsAPI as Graphics }