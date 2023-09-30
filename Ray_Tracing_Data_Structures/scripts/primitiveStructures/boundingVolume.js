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
 * @typedef BVHNode
 * @property {BVHNode[] | null} children
 * @property {number} triangleStart
 * @property {number} triangleCount
 * @property {number[]} boundingBox
 */


/**
 * @param {primitiveData} data
 * @param {Uint32Array} triangleIndex
 * @param {BVHNode} node
 */
let computeBoundingBox = (data, triangleIndex, node) => {
    let box = [
        Infinity,
        Infinity,
        Infinity,
        -Infinity,
        -Infinity,
        -Infinity,
    ];

    for(let face = 0; face < node.triangleCount; face ++){
        let indexIndex = face + node.triangleStart;
        let triangle = triangleIndex[indexIndex]; // which face in the indices array
        
        let Ax = data.vertices[data.indices[triangle * 3 + 0] * 3 + 0];
        let Ay = data.vertices[data.indices[triangle * 3 + 0] * 3 + 1];
        let Az = data.vertices[data.indices[triangle * 3 + 0] * 3 + 2];

        let Bx = data.vertices[data.indices[triangle * 3 + 1] * 3 + 0];
        let By = data.vertices[data.indices[triangle * 3 + 1] * 3 + 1];
        let Bz = data.vertices[data.indices[triangle * 3 + 1] * 3 + 2];

        let Cx = data.vertices[data.indices[triangle * 3 + 2] * 3 + 0];
        let Cy = data.vertices[data.indices[triangle * 3 + 2] * 3 + 1];
        let Cz = data.vertices[data.indices[triangle * 3 + 2] * 3 + 2];

        box[AABBMax_X] = Math.max(box[AABBMax_X], Ax, Bx, Cx);
        box[AABBMax_Y] = Math.max(box[AABBMax_Y], Ay, By, Cy);
        box[AABBMax_Z] = Math.max(box[AABBMax_Z], Az, Bz, Cz);

        box[AABBMin_X] = Math.min(box[AABBMin_X], Ax, Bx, Cx);
        box[AABBMin_Y] = Math.min(box[AABBMin_Y], Ay, By, Cy);
        box[AABBMin_Z] = Math.min(box[AABBMin_Z], Az, Bz, Cz);
    }

    return box;
}

/**
 * @param {primitiveData} data
 */
let computeCentroids = (data) => {
    let centroids = new Float32Array(data.indices.length);
    for(let triangle = 0; triangle < data.indices.length / 3; triangle++){
        let Ax = data.vertices[data.indices[triangle * 3 + 0] * 3 + 0];
        let Ay = data.vertices[data.indices[triangle * 3 + 0] * 3 + 1];
        let Az = data.vertices[data.indices[triangle * 3 + 0] * 3 + 2];
    
        let Bx = data.vertices[data.indices[triangle * 3 + 1] * 3 + 0];
        let By = data.vertices[data.indices[triangle * 3 + 1] * 3 + 1];
        let Bz = data.vertices[data.indices[triangle * 3 + 1] * 3 + 2];
    
        let Cx = data.vertices[data.indices[triangle * 3 + 2] * 3 + 0];
        let Cy = data.vertices[data.indices[triangle * 3 + 2] * 3 + 1];
        let Cz = data.vertices[data.indices[triangle * 3 + 2] * 3 + 2];
        
        centroids[triangle * 3 + 0] = (Ax + Bx + Cx) / 3;
        centroids[triangle * 3 + 1] = (Ay + By + Cy) / 3;
        centroids[triangle * 3 + 2] = (Az + Bz + Cz) / 3;
    }
    return centroids;
}

/**
 * Picks the longest axis to split on
 * @param {BVHNode} node 
 */
let chooseSplitPlane = (node) => {    
    if(!node.boundingBox){
        throw "node did not have BB for some reason"
    }
    let bbWidth = node.boundingBox[AABBMax_X] - node.boundingBox[AABBMin_X];
    let bbHeight = node.boundingBox[AABBMax_Y] - node.boundingBox[AABBMin_Y];
    let bbDepth = node.boundingBox[AABBMax_Z] - node.boundingBox[AABBMin_Z];

    if(bbWidth >= bbHeight && bbWidth >= bbDepth){
        return {
            axis: 0,
            value: node.boundingBox[AABBMin_X] + bbWidth / 2,
        }
    } else if (bbHeight >= bbDepth) {
        return {
            axis: 1,
            value: node.boundingBox[AABBMin_Y] + bbHeight / 2,
        }
    }
    return {
        axis: 2,
        value: node.boundingBox[AABBMin_Z] + bbDepth / 2,
    }
}

/**
 * 
 * @param {primitiveData} data 
 * @param {BVHNode} node 
 * @param {Uint32Array} triangleIndex 
 * @param {number} minPrimitiveForSplit
 * @param {Float32Array} centroids
 */
let splitNode = (data, node, triangleIndex, minPrimitiveForSplit, centroids) => {
    if(node.triangleCount < minPrimitiveForSplit){
        return;
    }
    let splitPlane = chooseSplitPlane(node);
    // do a partition similar to quick sort
    let i = node.triangleStart;
    let j = i + node.triangleCount - 1;

    while(i <= j){
        if(centroids[ triangleIndex[i] * 3 + splitPlane.axis] < splitPlane.value){
            i++;
        }else{
            let temp = triangleIndex[i];
            triangleIndex[i] = triangleIndex[j];
            triangleIndex[j] = temp;
            j--;
        }
    }

    let leftStart = node.triangleStart;
    let leftCount = i - node.triangleStart;
    if(leftCount == 0 || leftCount == node.triangleCount){
        return;
    }
    /** @type {BVHNode} */
    let leftChild = {
        children: null,
        triangleStart: leftStart,
        triangleCount: leftCount,
        // @ts-ignore
        boundingBox: null,
    }
    /** @type {BVHNode} */
    let rightChild = {
        children: null,
        triangleStart: i,
        triangleCount: node.triangleCount - leftCount,
        // @ts-ignore
        boundingBox: null,
    }

    leftChild.boundingBox = computeBoundingBox(data, triangleIndex, leftChild);
    rightChild.boundingBox = computeBoundingBox(data, triangleIndex, rightChild);
    splitNode(data, leftChild, triangleIndex, minPrimitiveForSplit, centroids);
    splitNode(data, rightChild, triangleIndex, minPrimitiveForSplit, centroids);
    node.children = [leftChild, rightChild];

}

/**
 * @typedef BVHIntersection
 * @prop {number} t
 * @prop {number} face
 * @prop {BVHNode[]} testedNodes
 * @prop {BVHNode[]} hitNodes
 * @prop {BVHNode[]} leafNodes
 * @prop {BVHNode | null} finalNode
 * @prop {number} time
 * @prop {number} primitiveTestCount
 */

/**
 * @typedef BVH
 *  @prop {(ray: import("../math/geometry.js").Ray) => BVHIntersection} findIntersection
 *  @prop {BVHNode} root 
 *  @prop {number} nodeCount
 *  @prop {number} maxDepth
 */

/**
 * @param {primitiveData} data
 * @param {number} minPrimitiveForSplit
 */
let buildHierarchy = (data, minPrimitiveForSplit, extraInfo=false) => {
    let buildStartTime = performance.now();
    let faceCount = data.indices.length  / 3;
    let centroids = computeCentroids(data);
    // Initialize face refrences in order
    let faces = new Uint32Array(faceCount);
    for(let i = 0; i < faceCount; i++){
        faces[i] = i;
    }

    /** @type {BVHNode} */
    let root = {
        children: null,
        triangleStart: 0,
        triangleCount: faceCount,
        // @ts-ignore
        boundingBox: null,
    };
    root.boundingBox = computeBoundingBox(data, faces, root);
    splitNode(data, root, faces, minPrimitiveForSplit, centroids);
    //traverse tree to get count
    let nodeCount = 0;
    let maxDepth = 0;
    let countNodes = (node, depth)=>{
        if(!node)
            return;
        maxDepth = Math.max(depth, maxDepth);
        nodeCount++;
        if(!node.children){
            return;
        }
        countNodes(node.children[0], depth + 1);
        countNodes(node.children[1], depth + 1);
    }
    countNodes(root, 0);
    
    /**
     * 
     * @param {import("../math/geometry.js").Ray} ray 
     * @returns 
     */
    let findIntersection = (ray) => {
        /** @type {BVHIntersection} */
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
         * @param {BVHNode | null} node 
         */
        let traverse = (node)=>{
            if(node && extraInfo){
                hitTriangle.testedNodes.push(node);
            }
            if(!node || !intersectionOp.rayBox([ray.point.x, ray.point.y, ray.point.z, ray.dir.x, ray.dir.y, ray.dir.z], node.boundingBox)){
                return;
            }
            if(extraInfo){
                hitTriangle.hitNodes.push(node);
            }
            if(node.children === null){
                if(extraInfo){
                    hitTriangle.leafNodes.push(node);
                }
                for(let i = 0; i < node.triangleCount; i++){
                    let face = faces[node.triangleStart + i];
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
                traverse(node.children[0]);
                traverse(node.children[1]);
            }

        }
        traverse(root);
        hitTriangle.primitiveTestCount = testCount;
        hitTriangle.time = performance.now() - startTime;
        return hitTriangle;
    };
    let buildTime = performance.now() - buildStartTime;
    console.log(`\tBuilt BVH in ${buildTime} ms`)
    return {
        findIntersection,
        root,
        nodeCount,
        maxDepth,
        buildTime,
    }
}

export {buildHierarchy};