// @ts-check

import { intersection } from "../math/geometry.js";
import { intersection as intersectionOp } from "../math/geometryOptimized.js";
const AABBMin_X = 0;
const AABBMin_Y = 1;
const AABBMin_Z = 2;

const AABBMax_X = 3;
const AABBMax_Y = 4;
const AABBMax_Z = 5;
/**
 * @typedef primitiveData
 * @property {ArrayLike<number>} vertices
 * @property {ArrayLike<number>} indices
 */

/**
 * @typedef OTNode
 * @property {OTNode[] | null} children
 * @property {number[]} triangles
 * @property {number[]} boundingBox
 */

/**
 * @param {primitiveData} data
 */
let computeBoundingBox = (data) => {
    let box = [
        Infinity,
        Infinity,
        Infinity,
        -Infinity,
        -Infinity,
        -Infinity,
    ]
    for(let v = 0; v < data.vertices.length / 3; v++){
        let x = data.vertices[v * 3 + 0];
        let y = data.vertices[v * 3 + 1];
        let z = data.vertices[v * 3 + 2];
        box[AABBMax_X] = Math.max(box[AABBMax_X], x);
        box[AABBMax_Y] = Math.max(box[AABBMax_Y], y);
        box[AABBMax_Z] = Math.max(box[AABBMax_Z], z);
        box[AABBMin_X] = Math.min(box[AABBMin_X], x);
        box[AABBMin_Y] = Math.min(box[AABBMin_Y], y);
        box[AABBMin_Z] = Math.min(box[AABBMin_Z], z);
    }
    return box;
}

/**
 * @param {OTNode} node
 * @returns {OTNode[]}
 */
let createChildren = (node) => {
    const X = 0;
    const Y = 1;
    const Z = 2;
    let parentCenter = [
        (node.boundingBox[AABBMax_X] + node.boundingBox[AABBMin_X]) * 0.5,
        (node.boundingBox[AABBMax_Y] + node.boundingBox[AABBMin_Y]) * 0.5,
        (node.boundingBox[AABBMax_Z] + node.boundingBox[AABBMin_Z]) * 0.5,
    ];
    //xyz
    //---
    let box0 = [
        node.boundingBox[AABBMin_X],
        node.boundingBox[AABBMin_Y],
        node.boundingBox[AABBMin_Z],
        parentCenter[X],
        parentCenter[Y],
        parentCenter[Z],
    ]
    //+--
    let box1 = [
        parentCenter[X],
        node.boundingBox[AABBMin_Y],
        node.boundingBox[AABBMin_Z],
        node.boundingBox[AABBMax_X],
        parentCenter[Y],
        parentCenter[Z],
    ]
    //-+-
    let box2 = [
        node.boundingBox[AABBMin_X],
        parentCenter[Y],
        node.boundingBox[AABBMin_Z],
        parentCenter[X],
        node.boundingBox[AABBMax_Y],
        parentCenter[Z],
    ]
    //++-
    let box3 = [
        parentCenter[X],
        parentCenter[Y],
        node.boundingBox[AABBMin_Z],
        node.boundingBox[AABBMax_X],
        node.boundingBox[AABBMax_Y],
        parentCenter[Z],
    ]
    //--+
    let box4 = [
        node.boundingBox[AABBMin_X],
        node.boundingBox[AABBMin_Y],
        parentCenter[Z],
        parentCenter[X],
        parentCenter[Y],
        node.boundingBox[AABBMax_Z],
    ]
    //+-+
    let box5 = [
        parentCenter[X],
        node.boundingBox[AABBMin_Y],
        parentCenter[Z],
        node.boundingBox[AABBMax_X],
        parentCenter[Y],
        node.boundingBox[AABBMax_Z],
    ]
    //-++
    let box6 = [
        node.boundingBox[AABBMin_X],
        parentCenter[Y],
        parentCenter[Z],
        parentCenter[X],
        node.boundingBox[AABBMax_Y],
        node.boundingBox[AABBMax_Z],   
    ]
    //+++
    let box7 = [
        parentCenter[X],
        parentCenter[Y],
        parentCenter[Z],
        node.boundingBox[AABBMax_X],
        node.boundingBox[AABBMax_Y],
        node.boundingBox[AABBMax_Z],
    ]

    /** @type {OTNode[]} */
    let children = [
        {
            children: null,
            triangles: [],
            boundingBox: box0,
        },{
            children: null,
            triangles: [],
            boundingBox: box1,
        },{
            children: null,
            triangles: [],
            boundingBox: box2,
        },{
            children: null,
            triangles: [],
            boundingBox: box3,
        },{
            children: null,
            triangles: [],
            boundingBox: box4,
        },{
            children: null,
            triangles: [],
            boundingBox: box5,
        },{
            children: null,
            triangles: [],
            boundingBox: box6,
        },{
            children: null,
            triangles: [],
            boundingBox: box7,
        },
    ]

    return children;
}

/**
 * 
 * @param {primitiveData} primitiveData 
 * @param {OTNode} node 
 */
let populateChildren = (primitiveData, node) => {
    if(!node.children){
        return;
    }
    for(let t = 0; t < node.triangles.length; t++){
        let triangle = node.triangles[t];
     
        for(let c = 0; c < node.children.length; c++){
            let child = node.children[c];
            if(intersectionOp.triangleBoxApprox(primitiveData, triangle, child.boundingBox)){
                child.triangles.push(triangle);
            }
        }
    }
}
const MIN_SIZE = 0.0005; // for your saftey and that of the computer, do not lower this :)
const MAX_DEPTH = 10; // allows for 8^10 nodes, for your saftey and that of the computer, do not lower this
/**
 * 
 * @param {primitiveData} data 
 * @param {OTNode} node 
 * @param {number} minPrimitiveForSplit
 */
let splitNode = (data, node, minPrimitiveForSplit, d=0) => {
    if(node.triangles.length < minPrimitiveForSplit || 
        (node.boundingBox[AABBMax_X] - node.boundingBox[AABBMin_X] < MIN_SIZE || 
            node.boundingBox[AABBMax_Y] - node.boundingBox[AABBMin_Y] < MIN_SIZE ||
            node.boundingBox[AABBMax_Z] - node.boundingBox[AABBMin_Z] < MIN_SIZE) || d >= MAX_DEPTH){
        return;
    }

    node.children = createChildren(node);
    populateChildren(data, node);
    let sameCount = 0; // prevent possibility of dividing with no progress, infinite recursion is bad
    for(let c = 0; c < node.children.length; c++){
        if(node.children[c].triangles.length == node.triangles.length){
            sameCount++;
        }
        if(sameCount >= 2){
            node.children = null;
            return;
        }
    }
    if(d > 100){
        debugger
    }
    for(let c = 0; c < node.children.length; c++){
        splitNode(data, node.children[c], minPrimitiveForSplit, d+1);
    }
}

/**
 * @typedef OTIntersection
 * @prop {number} t
 * @prop {number} face
 * @prop {OTNode[]} testedNodes
 * @prop {OTNode[]} hitNodes
 * @prop {OTNode[]} leafNodes
 * @prop {OTNode | null} finalNode
 * @prop {number} time
 * @prop {number} primitiveTestCount
 */

/**
 * @typedef OctTree
 *  @prop {(ray: import("../math/geometry.js").Ray) => OTIntersection} findIntersection
 *  @prop {OTNode} root 
 *  @prop {number} nodeCount
 *  @prop {number} maxDepth
 */

/**
 * @param {primitiveData} data
 * @param {number} minPrimitiveForSplit
 */
let buildOctTree = (data, minPrimitiveForSplit, extraInfo=false) => {
    let buildStartTime = performance.now();
    let faceCount = data.indices.length  / 3;
    let faces = new Array(faceCount);
    for(let i = 0; i < faceCount; i++){
        faces[i] = i;
    }

    let box = computeBoundingBox(data);
    /** @type {OTNode} */
    let root = {
        triangles: faces,
        children: null,
        boundingBox: box,
    };
    splitNode(data, root, minPrimitiveForSplit);
    //traverse tree to get count
    let nodeCount = 0;
    let maxDepth = 0;
    /**
     * 
     * @param {OTNode} node 
     * @param {*} depth 
     * @returns 
     */
    let countNodes = (node, depth)=>{
        maxDepth = Math.max(depth, maxDepth);
        nodeCount++;
        if(node.children){
            for(let c = 0; c < 8; c++){
                countNodes(node.children[c], depth + 1)
            }
        }
    }
    countNodes(root, 0);
    
    /**
     * 
     * @param {import("../math/geometry.js").Ray} ray 
     * @returns 
     */
    let findIntersection = (ray) => {
        /** @type {OTIntersection} */
        let hitTriangle = {
            t: Infinity,
            face: -1,
            testedNodes: [],
            hitNodes: [],
            leafNodes: [],
            finalNode: null,
            primitiveTestCount: 0,
            time:0,
        };
        let testCount = 0;
        let startTime = performance.now();
        /**
         * 
         * @param {OTNode | null} node 
         */
        let traverse = (node)=>{
            if(node && extraInfo){
                hitTriangle.testedNodes.push(node);
            }
            if(node===null || !intersectionOp.rayBox([
                ray.point.x,
                ray.point.y,
                ray.point.z,
                ray.dir.x,
                ray.dir.y,
                ray.dir.z,
            ], node.boundingBox)){
                return;
            }
            if(extraInfo){
                hitTriangle.hitNodes.push(node);
            }
            if(node.children === null){
                if(extraInfo){
                    hitTriangle.leafNodes.push(node);
                }
                for(let i = 0; i < node.triangles.length; i++){
                    let face = node.triangles[i];
                    let triangle = {
                        A : {
                            x: data.vertices[data.indices[face * 3 + 0] * 3 + 0],
                            y: data.vertices[data.indices[face * 3 + 0] * 3 + 1],
                            z: data.vertices[data.indices[face * 3 + 0] * 3 + 2],
                        },
                        B : {
                            x: data.vertices[data.indices[face * 3 + 1] * 3 + 0],
                            y: data.vertices[data.indices[face * 3 + 1] * 3 + 1],
                            z: data.vertices[data.indices[face * 3 + 1] * 3 + 2],
                        },
                        C : {
                            x: data.vertices[data.indices[face * 3 + 2] * 3 + 0],
                            y: data.vertices[data.indices[face * 3 + 2] * 3 + 1],
                            z: data.vertices[data.indices[face * 3 + 2] * 3 + 2],
                        },
                    }
                    let point = intersection.rayTriangle(ray, triangle);
                    testCount ++;
                    if(point){
                        if(hitTriangle && hitTriangle.t > point.t){
                            hitTriangle.t = point.t;
                            hitTriangle.face = face;
                            hitTriangle.finalNode = node;
                        }
                    }
                }
            }else{
                for(let c=0; c < node.children.length; c++){
                    traverse(node.children[c]);
                }
            }

        }
        traverse(root);
        hitTriangle.primitiveTestCount = testCount;
        hitTriangle.time = performance.now() - startTime;
        return hitTriangle;
    };
    let buildTime = performance.now() - buildStartTime;
    console.log(`\tBuilt Octree in ${buildTime} ms`);
    return {
        findIntersection,
        root,
        nodeCount,
        maxDepth,
        buildTime,
    }
}

export {buildOctTree};