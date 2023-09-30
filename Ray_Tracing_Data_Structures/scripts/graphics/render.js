// @ts-check
import { getIdenity4x4Matricies, inverseMatrix4x4, lookAt, scaleMatrix4x4, translate } from "../math/matrix.js";
import { projectionPerspectiveFOV } from "../math/projection.js";
import { multiplyMatrix4x4 } from "../modelLoader/utilities.js";
import { buildProgramFromFiles } from "./graphicsUtil.js";

const AABBMin_X = 0;
const AABBMin_Y = 1;
const AABBMin_Z = 2;

const AABBMax_X = 3;
const AABBMax_Y = 4;
const AABBMax_Z = 5;

/**
 * @typedef GenNode Generic node
 * @property {GenNode[] | null} children
 * @property {number[]} boundingBox
 */

/**
 * @typedef GenTree
 *  @prop {(ray: import("../math/geometry.js").Ray) => GenIntersection} findIntersection
 *  @prop {GenNode} root 
 *  @prop {number} nodeCount
 *  @prop {number} maxDepth
 */

/**
 * @typedef GenIntersection
 * @prop {number} t
 * @prop {number} face
 * @prop {GenNode[]} testedNodes
 * @prop {GenNode[]} hitNodes
 * @prop {GenNode[]} leafNodes
 * @prop {GenNode | null} finalNode
 * @prop {number} time
 * @prop {number} primitiveTestCount
 */

let canvas = document.createElement('canvas');
canvas.id = 'canvas';
/** @type {WebGL2RenderingContext} */
// @ts-ignore
let gl = canvas.getContext('webgl2');
if(!gl){
    throw "Unable to get webgl2 context";
}
document.querySelector('#screen_container')?.appendChild(canvas);

/**
 * @typedef Model
 * @prop {Float32Array} vertices
 * @prop {Float32Array} normals
 * @prop {Float32Array} colors
 * @prop {Float32Array} textures
 * @prop {Uint32Array} indices
 */

/**
 * @typedef Camera
 * @prop {import("../math/geometry").Point} position
 * @prop {import("../math/geometry").Point} target
 * @prop {import("../math/vector").Vector} up
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

let aspectNeedsUpdate = true;
let resize = () => {
    let cRect = canvas.getBoundingClientRect();
    canvas.width = cRect.width;
    canvas.height = cRect.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspectNeedsUpdate = true;
}
window.addEventListener('resize', resize);
resize();

let clear = () => {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, true, true, false);// dont wirte alpha data
}

/**
 * 
 * @param {Float32Array | Uint16Array | Uint32Array} data 
 * @param {number} type
 * @param {number} [usage]
 */
let writeNewBuffer = (data, type, usage=gl.STATIC_DRAW) => {
    let buffer = gl.createBuffer();
    if(!buffer){
        throw "failed to create webgl buffer";
    }
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, usage);
    gl.bindBuffer(type, null);
    return buffer;
}

/**
 * 
 * @param {Model} model
 * @param {number} instanceCount
 */
let bufferModelData = (model, instanceCount) => {
    return {
        vertex: writeNewBuffer(model.vertices, gl.ARRAY_BUFFER),
        color: writeNewBuffer(model.colors, gl.ARRAY_BUFFER),
        normal: writeNewBuffer(model.normals, gl.ARRAY_BUFFER), 
        texture: writeNewBuffer(model.textures, gl.ARRAY_BUFFER),
        matrix:writeNewBuffer(getIdenity4x4Matricies(instanceCount), gl.ARRAY_BUFFER, gl.STATIC_DRAW),
        index: writeNewBuffer(model.indices, gl.ELEMENT_ARRAY_BUFFER),
    }
}

/**
 * 
 * @param {{vertex:WebGLBuffer, color:WebGLBuffer, normal:WebGLBuffer, texture:WebGLBuffer, matrix:WebGLBuffer, index:WebGLBuffer}} buffers 
 */
let createAttribArray = (buffers, attributes) => {
    let vao = gl.createVertexArray();
    if(!vao){
        throw "Failed to create Vertex Array";
    }

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 4 * 3, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.enableVertexAttribArray(attributes.color);
    gl.vertexAttribPointer(attributes.color, 3, gl.FLOAT, false, 4 * 3, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 4 * 3, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
    gl.enableVertexAttribArray(attributes.texture);
    gl.vertexAttribPointer(attributes.texture, 2, gl.FLOAT, false, 4 * 2, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.matrix);
    for(let col = 0; col < 4; col ++){
        let colLocation = attributes.matrix + col;
        gl.enableVertexAttribArray(colLocation);
        gl.vertexAttribPointer(colLocation, 4, gl.FLOAT, false, 4 * 16, col * 4 * 4);
        gl.vertexAttribDivisor(colLocation, 1);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

    gl.bindVertexArray(null);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return vao;
};

const CUBE_MODEL = {
    vertices: new Float32Array([
        -0.5, 0.5, 0.5, // front
        -0.5,-0.5, 0.5,
         0.5,-0.5, 0.5,
         0.5, 0.5, 0.5,

        0.5, 0.5,-0.5, // back
        0.5,-0.5,-0.5,
       -0.5,-0.5,-0.5,
       -0.5, 0.5,-0.5,

       -0.5, 0.5,-0.5, // left
       -0.5,-0.5,-0.5,
       -0.5,-0.5, 0.5,
       -0.5, 0.5, 0.5,

        0.5, 0.5, 0.5, // right
        0.5,-0.5, 0.5,
        0.5,-0.5,-0.5,
        0.5, 0.5,-0.5,

       -0.5, 0.5,-0.5, // top
       -0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5,-0.5,

        -0.5,-0.5, 0.5, // bottom
        -0.5,-0.5,-0.5,
         0.5,-0.5,-0.5,
         0.5,-0.5, 0.5,
    ]),
    normals: new Float32Array([
       0.0, 0.0, 1.0, // front
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0,
       0.0, 0.0, 1.0,

       0.0, 0.0,-1.0, // back
       0.0, 0.0,-1.0,
       0.0, 0.0,-1.0,
       0.0, 0.0,-1.0,

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

       0.0,-1.0, 0.0, // bottom
       0.0,-1.0, 0.0,
       0.0,-1.0, 0.0,
       0.0,-1.0, 0.0,
   ]),
   colors: new Float32Array(6 * 4 * 3),
    textures: new Float32Array(6 * 4 * 2), // 6 faces with 4 points, each with 2 coordinates
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
}

const RAY_MODEL = {
    vertices: new Float32Array([
        0, 0, 0,
        0, 0, 1,
    ]),
    colors: new Float32Array([
        0, 0, 5,
        5, 0, 0
    ]),
    normals: new Float32Array([
        0, 0, 1,
        0, 0, 1,
    ]),
    textures: new Float32Array([
        0, 0,
        0, 1,
    ]),
    indices: new Uint32Array([
        0, 1
    ]),
}

let Graphics = await (async () => {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);

    const settings = {
        boxRendering: {
            outline: true,
            transparency: true,
        },
        boxMode: 'all', // options: 'all', 'tested', 'intersected', 'final'
        treeMode: 'bvh', // options: 'oct', 'bvh'
    }
    let program = await buildProgramFromFiles(gl, './scripts/graphics/shaders/main.vert', './scripts/graphics/shaders/main.frag');
    let attributes = {
        position: gl.getAttribLocation(program, 'aPosition'),
        normal: gl.getAttribLocation(program, 'aNormal'),
        texture: gl.getAttribLocation(program, 'aTexture'),
        matrix: gl.getAttribLocation(program, 'aModel'),
        color: gl.getAttribLocation(program, 'aColor'),
    };
    let uniforms = {
        matrix: {
            aspect: gl.getUniformLocation(program, 'uAspect'),
            projection: gl.getUniformLocation(program, 'uProjection'),
            view: gl.getUniformLocation(program, 'uView'),
        },
        eye: gl.getUniformLocation(program, 'uEye'),
        opacity: gl.getUniformLocation(program, 'opacity'),
        highlight: gl.getUniformLocation(program, 'highlight'),
    };


    /** @type {WebGLVertexArrayObject | null} */
    let modelVAO = null;

    /** @type {Camera} */
    const camera = {
        position: {x: 0, y:0, z:5},
        target: {x: 0, y:0, z:0},
        up: {x:0, y:1, z:0},
        fieldOfView: Math.PI / 12,
        near: -1,
        far: -10,
    }
    /** @type {Model | null} */
    let model = null;
    /** @type {import("../primitiveStructures/boundingVolume.js").BVH | null} */
    let bvh = null;
    /** @type {import("../primitiveStructures/octTree.js").OctTree | null} */
    let octree = null;
    /** @type {{vertex:WebGLBuffer, color:WebGLBuffer, normal:WebGLBuffer, texture:WebGLBuffer, matrix:WebGLBuffer, index:WebGLBuffer} | null} */
    let buffers = null;

    let bvhBuffers = {
        cube: bufferModelData(CUBE_MODEL, 1),
        hitCube: bufferModelData(CUBE_MODEL, 1),
        testedCube: bufferModelData(CUBE_MODEL, 1),
        leafCube: bufferModelData(CUBE_MODEL, 1),
        finalCube: bufferModelData(CUBE_MODEL, 1),
    }
    let bvhVAOs = {
        cube: createAttribArray(bvhBuffers.cube, attributes),
        hitCube: createAttribArray(bvhBuffers.hitCube, attributes),
        testedCube: createAttribArray(bvhBuffers.testedCube, attributes),
        leafCube: createAttribArray(bvhBuffers.leafCube, attributes),
        finalCube: createAttribArray(bvhBuffers.finalCube, attributes),
    }

    let otBuffers = {
        cube: bufferModelData(CUBE_MODEL, 1),
        hitCube: bufferModelData(CUBE_MODEL, 1),
        testedCube: bufferModelData(CUBE_MODEL, 1),
        leafCube: bufferModelData(CUBE_MODEL, 1),
        finalCube: bufferModelData(CUBE_MODEL, 1),
    }
    let otVAOs = {
        cube: createAttribArray(otBuffers.cube, attributes),
        hitCube: createAttribArray(otBuffers.hitCube, attributes),
        testedCube: createAttribArray(otBuffers.testedCube, attributes),
        leafCube: createAttribArray(otBuffers.leafCube, attributes),
        finalCube: createAttribArray(otBuffers.finalCube, attributes),
    }
    /** @type {import("../primitiveStructures/boundingVolume.js").BVHIntersection | null} */
    let bvhIntersection = null;
    /** @type {import("../primitiveStructures/octTree.js").OTIntersection | null} */
    let otIntersection = null;
    let intersectedFace = -1;

    let rayBuffers = bufferModelData(RAY_MODEL, 1);
    let rayVAO = createAttribArray(rayBuffers, attributes);

    gl.useProgram(program);
    
    const aspect = [
        1, 0, 0, 0,
        0, 1, 0, 0, 
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
    let updateAspect = () => {
        if (canvas.width > canvas.height) {
            aspect[0] = canvas.height / canvas.width;
        } else {
            aspect[5] = canvas.width / canvas.height;
        }
        gl.uniformMatrix4fv(uniforms.matrix.aspect, false, aspect);
        aspectNeedsUpdate = false;
    }

    /**
     * 
     * @param {WebGLVertexArrayObject} vao 
     * @param {number} count 
     */
    let drawCubes = (vao, count)=>{
        gl.bindVertexArray(vao);
        if(settings.boxRendering.outline){
            gl.uniform1f(uniforms.opacity, 1);        
            // set forced color
            gl.uniform4fv(uniforms.highlight, [0,5,0,1]);
            gl.drawElementsInstanced(gl.LINES, 8 * 6, gl.UNSIGNED_INT, 0, count);
        }
        if(settings.boxRendering.transparency){
            gl.depthMask(false);
            gl.uniform1f(uniforms.opacity, 0.05);
            // set forced color
            gl.uniform4fv(uniforms.highlight, [5,5,5,1]);
            gl.drawElementsInstanced(gl.TRIANGLES, CUBE_MODEL.indices.length - (8 * 6), gl.UNSIGNED_INT, 8 * 6 * CUBE_MODEL.indices.BYTES_PER_ELEMENT, count);
        }
        gl.uniform4fv(uniforms.highlight, [0,0,0,0]); // disable forced color
        gl.bindVertexArray(null);
    }


    let draw = () => {
        gl.disable(gl.BLEND);
        gl.depthMask(true);
        clear();
        gl.useProgram(program);
        if(aspectNeedsUpdate){
            updateAspect();
        }

        const projection = projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far);
        gl.uniformMatrix4fv(uniforms.matrix.projection, false, projection);
        gl.uniformMatrix4fv(uniforms.matrix.view, false, getCameraMatrix(camera));
        gl.uniform3f(uniforms.eye, camera.position.x, camera.position.y, camera.position.z);
        gl.enable(gl.BLEND);
        gl.uniform4fv(uniforms.highlight, [0,0,0,0]);
        if(model){
            gl.depthMask(true);
            gl.uniform1f(uniforms.opacity, 1);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.bindVertexArray(modelVAO);
            gl.drawElementsInstanced(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_INT, 0, 1);
            if(intersectedFace >= 0){
                // draws the intersected triangle
                gl.uniform4fv(uniforms.highlight, [1,0.4,0.2,1]);
                gl.drawElementsInstanced(gl.TRIANGLES, 3, gl.UNSIGNED_INT, model.indices.BYTES_PER_ELEMENT * 3 * intersectedFace, 1);
                gl.uniform4fv(uniforms.highlight, [4,1.6,0.8,1]);
                gl.drawElementsInstanced(gl.LINE_LOOP, 3, gl.UNSIGNED_INT, model.indices.BYTES_PER_ELEMENT * 3 * intersectedFace, 1);
                gl.uniform4fv(uniforms.highlight, [0,0,0,0]);
            }
            gl.bindVertexArray(null);
        }
        gl.bindVertexArray(rayVAO);
        gl.uniform1f(uniforms.opacity, 1);
        gl.depthMask(true);
        gl.drawElementsInstanced(gl.LINES, RAY_MODEL.indices.length, gl.UNSIGNED_INT, 0, 1);
        gl.bindVertexArray(null);
        let VAOs = settings.treeMode === 'oct' ? otVAOs : bvhVAOs;
        let nodes = settings.treeMode === 'oct' ? otIntersection : bvhIntersection;
        let tree = settings.treeMode === 'oct'? octree : bvh;

        if(tree && settings.boxMode == 'all'){
            drawCubes(VAOs.cube, tree.nodeCount);
        }
        if(nodes?.hitNodes.length && settings.boxMode == 'intersected'){
            drawCubes(VAOs.hitCube, nodes.hitNodes.length);
        }
        if(nodes?.testedNodes.length && settings.boxMode == 'tested'){
            drawCubes(VAOs.testedCube, nodes.testedNodes.length);
        }
        if(nodes?.leafNodes.length && settings.boxMode == 'leaf'){
            drawCubes(VAOs.leafCube, nodes.leafNodes.length);
        }
        if(nodes?.finalNode && settings.boxMode == 'final'){
            drawCubes(VAOs.finalCube, 1);
        }

    }
    
    let getInverseViewProjectionAspectMatrix = () => {
        
        let projection = projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far);
        let view = getCameraMatrix(camera);
        return inverseMatrix4x4(multiplyMatrix4x4(view, multiplyMatrix4x4(projection, aspect)));

    }
    /**
     * Sets the transform for the ray
     * @param {number[] | Float32Array} m 
     */
    let setRayTransform = (m) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffers.matrix);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0,new Float32Array(m));
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Calculates and buffers a model matrix for a given node, buffer must be pre bound
     * @param {GenNode} node 
     * @param {number} nIndex the index of the node in list of nodes, selects the matrix to buffer
     */
    let createNodeMatrix = (node, nIndex) => {
        let width = node.boundingBox[AABBMax_X] - node.boundingBox[AABBMin_X];
        let height = node.boundingBox[AABBMax_Y] - node.boundingBox[AABBMin_Y];
        let depth = node.boundingBox[AABBMax_Z] - node.boundingBox[AABBMin_Z];
        
        let x = node.boundingBox[AABBMin_X] + width/2;
        let y = node.boundingBox[AABBMin_Y] + height/2;
        let z = node.boundingBox[AABBMin_Z] + depth/2;
        
        let m = new Float32Array( [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        translate(m, x, y, z);
        scaleMatrix4x4(m, width, height, depth);
        gl.bufferSubData(gl.ARRAY_BUFFER, nIndex * 16 * 4, m);
    }

    /**
     * Builds the buffers for a given list of nodes
     * @param {GenNode[]} nodes 
     * @param {string} name 
     * @param {Object.<string, {vertex:WebGLBuffer, color:WebGLBuffer, normal:WebGLBuffer, texture:WebGLBuffer, matrix:WebGLBuffer, index:WebGLBuffer}>} buffers
     * @param {Object.<string,  WebGLVertexArrayObject>} VAOs
     */
    let buildNodeTreeBuffers = (nodes, name, buffers, VAOs) => {
        
        buffers[name] = bufferModelData(CUBE_MODEL, nodes.length);
        VAOs[name] = createAttribArray(buffers[name], attributes);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name].matrix);
        
        for(let i = 0; i < nodes.length; i++){
            createNodeMatrix(nodes[i], i);
        }
    }

    /**
     * Builds the buffers for a given intersection
     * @param {GenIntersection} intersection
     * @param {Object.<string, {vertex:WebGLBuffer, color:WebGLBuffer, normal:WebGLBuffer, texture:WebGLBuffer, matrix:WebGLBuffer, index:WebGLBuffer}>} buffers
     * @param {Object.<string,  WebGLVertexArrayObject>} VAOs
     */
    let buildIntersectionBuffers = (intersection, buffers, VAOs) => {
        buildNodeTreeBuffers(intersection.hitNodes, 'hitCube', buffers, VAOs);
        buildNodeTreeBuffers(intersection.testedNodes, 'testedCube', buffers, VAOs);
        buildNodeTreeBuffers(intersection.leafNodes, 'leafCube', buffers, VAOs);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.finalCube.matrix);
        if(intersection.finalNode){
            createNodeMatrix(intersection.finalNode, 0);
        }else{
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(16));
        }
    }

    /**
     * Sets the points of a ray, as well as nodes for any intersections
     * @param {import("../math/geometry").Ray} ray 
     * @param {import("../primitiveStructures/boundingVolume.js").BVHIntersection} _bvhIntersection
     * @param {import("../primitiveStructures/octTree.js").OTIntersection} _otIntersection
     */
    let setRay = (ray, _bvhIntersection, _otIntersection) => {
        // buffer the new ray position
        let t = _bvhIntersection.t < Infinity ? _bvhIntersection.t : 1;
        gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffers.vertex);
        
        gl.bufferSubData(gl.ARRAY_BUFFER, 0,new Float32Array([
            ray.point.x, ray.point.y, ray.point.z,
            ray.point.x + ray.dir.x * t, ray.point.y + ray.dir.y * t, ray.point.z + ray.dir.z * t,
        ]));
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        // build new model buffers for interseciton boxes
        buildIntersectionBuffers(_bvhIntersection, bvhBuffers, bvhVAOs);
        buildIntersectionBuffers(_otIntersection, otBuffers, otVAOs);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        otIntersection = _otIntersection;
        bvhIntersection = _bvhIntersection;
        intersectedFace = _bvhIntersection.face;
    }

    /**
     * Builds buffers for a given tree
     * @param {GenTree} tree 
     */
    let buildTreeBuffer = (tree) => {
        let cubeBuffers = bufferModelData(CUBE_MODEL, tree.nodeCount);
        let cubeVAO = createAttribArray(cubeBuffers, attributes);
        let nIndex = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffers.matrix);
        /**
         * creates matricies for node and all of its children
         * @param {GenNode} node 
         */
        let createNodeMatrixRecursive = (node) => {
            if(node.children){
                for(let c = 0; c < node.children.length; c++){
                    createNodeMatrixRecursive(node.children[c]);
                }
            }
            createNodeMatrix(node, nIndex++);
        }
        createNodeMatrixRecursive(tree.root);
        return {
            cubeBuffers,
            cubeVAO,
        }
    }

    return {
        get model() {return model},
        set model(val){
            if (val){
                model = val;
                buffers = bufferModelData(model, 1);
                modelVAO = createAttribArray(buffers, attributes);
            }
        },
        draw,
        get bvh() {return bvh},
        set bvh(val) {
            if(val){
                bvh = val;
                let results = buildTreeBuffer(bvh);
                bvhBuffers.cube = results.cubeBuffers;
                bvhVAOs.cube = results.cubeVAO;
            }
        },
        get octree() {return octree},
        set octree(val) {
            if(val){
                octree = val;
                let results = buildTreeBuffer(octree);
                otBuffers.cube = results.cubeBuffers;
                otVAOs.cube = results.cubeVAO;
            }
        },
        camera,
        settings,
        canvas,
        getInverseViewProjectionAspectMatrix,
        setRayTransform,
        setRay
    }
})();


export { Graphics }