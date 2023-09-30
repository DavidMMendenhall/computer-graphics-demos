// @ts-check
// @ts-check
import { Collision } from "../math/collisoin.js";

const AABBMin_X = 0;
const AABBMin_Y = 1;
const AABBMin_Z = 2;

const AABBMax_X = 3;
const AABBMax_Y = 4;
const AABBMax_Z = 5;

/**
 * @typedef OTNode
 * @property {OTNode[] | null} children
 * @property {import("../engine/item.js").Item[]} items
 * @property {number[]} boundingBox
 */

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
            items: [],
            boundingBox: box0,
        },{
            children: null,
            items: [],
            boundingBox: box1,
        },{
            children: null,
            items: [],
            boundingBox: box2,
        },{
            children: null,
            items: [],
            boundingBox: box3,
        },{
            children: null,
            items: [],
            boundingBox: box4,
        },{
            children: null,
            items: [],
            boundingBox: box5,
        },{
            children: null,
            items: [],
            boundingBox: box6,
        },{
            children: null,
            items: [],
            boundingBox: box7,
        },
    ]

    return children;
}

/**
 * 
 * @param {OTNode} parentNode 
 */
let populateChildren = (parentNode) => {
    if(!parentNode.children){
        return;
    }
    for(let t = 0; t < parentNode.items.length; t++){
        let item = parentNode.items[t];
     
        for(let c = 0; c < parentNode.children.length; c++){
            let child = parentNode.children[c];
            if(Collision.AABB_AABB(item.AABB, child.boundingBox)){
                child.items.push(item);
            }
        }
    }
}
const MIN_SIZE = 0.0005; // for your saftey and that of the computer, do not lower this :)
const MAX_DEPTH = 10; // allows for 8^10 nodes, for your saftey and that of the computer, do not lower this
/**
 * 
 * @param {OTNode} node 
 * @param {number} minPrimitiveForSplit
 */
let splitNode = (node, minPrimitiveForSplit, d=0) => {
    if(node.items.length < minPrimitiveForSplit || 
        (node.boundingBox[AABBMax_X] - node.boundingBox[AABBMin_X] < MIN_SIZE || 
            node.boundingBox[AABBMax_Y] - node.boundingBox[AABBMin_Y] < MIN_SIZE ||
            node.boundingBox[AABBMax_Z] - node.boundingBox[AABBMin_Z] < MIN_SIZE) || d >= MAX_DEPTH){
        return;
    }

    node.children = createChildren(node);
    populateChildren(node);
    let sameCount = 0; // prevent possibility of dividing with no progress, infinite recursion is bad
    for(let c = 0; c < node.children.length; c++){
        if(node.children[c].items.length == node.items.length){
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
        splitNode(node.children[c], minPrimitiveForSplit, d+1);
    }
}

/**
 * @typedef OTIntersections
 * @prop {import("../engine/item.js").Item[]} items
 * @prop {OTNode[]} testedNodes
 * @prop {OTNode[]} intersectedNodes
 * @prop {OTNode[]} leafNodes
 * @prop {number} time
 * @prop {number} itemTestCount
 */

/**
 * @typedef OctTree
 *  @prop {OTNode} root 
 *  @prop {OTNode[]} nodes
 *  @prop {number} nodeCount
 *  @prop {number} maxDepth
 */

/**
 * @param {import("../engine/item.js").Item[]} items
 * @param {number} minPrimitiveForSplit
 * @param {number[]} worldBox
 */
let buildOctTree = (items, minPrimitiveForSplit, worldBox, extraInfo=false) => {
    let buildStartTime = performance.now();
    let itemsCopy = [];
    let itemIds = [];
    for(let i = 0; i < items.length; i++){
        itemsCopy.push(items[i]);
    }
    let box = [
        worldBox[0],  worldBox[1], worldBox[2], worldBox[3], worldBox[4], worldBox[5],
    ];
    
    /** @type {OTNode} */
    let root = {
        items: itemsCopy,
        children: null,
        boundingBox: box,
    };
    splitNode(root, minPrimitiveForSplit);
    //traverse tree to get count
    let nodeCount = 0;
    let maxDepth = 0;
    let allNodes = [];
    /**
     * 
     * @param {OTNode} node 
     * @param {*} depth 
     * @returns 
     */
    let countNodes = (node, depth)=>{
        maxDepth = Math.max(depth, maxDepth);
        allNodes.push(node);
        nodeCount++;
        if(!node.children){
            return;
        }
        for(let c = 0; c < 8; c++){
            countNodes(node.children[c], depth + 1);
        }
    }
    countNodes(root, 0);
    
    /**
     * 
     * @param {number[]} box AABB
     * @returns 
     */
    let findAABBIntersections = (box) => {
        /** @type {OTIntersections} */
        let intersections = {
            items: [],
            testedNodes: [],
            intersectedNodes: [],
            leafNodes: [],
            itemTestCount: 0,
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
                intersections.testedNodes.push(node);
            }
            if(node===null || !Collision.AABB_AABB(node.boundingBox, box)){
                return;
            }
            if(extraInfo){
                intersections.intersectedNodes.push(node);
            }
            if(node.children === null){
                if(extraInfo){
                    intersections.leafNodes.push(node);
                }
                for(let i = 0; i < node.items.length; i++){
                    let item = node.items[i];
                    testCount ++;
                    if(Collision.AABB_AABB(item.AABB, box)){
                        intersections.items.push(item);
                    }
                }
            }else{
                for(let c=0; c < node.children.length; c++){
                    traverse(node.children[c]);
                }
            }

        }
        traverse(root);
        intersections.itemTestCount = testCount;
        intersections.time = performance.now() - startTime;
        return intersections;
    };

       /**
     * 
     * @param {import("../engine/render.js").Camera} camera
     * @returns 
     */
       let findCameraIntersections = (camera) => {
        let hitItemIds = new Set();
        /** @type {OTIntersections} */
        let intersections = {
            items: [],
            testedNodes: [],
            intersectedNodes: [],
            leafNodes: [],
            itemTestCount: 0,
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
                intersections.testedNodes.push(node);
            }
            if(node===null || !Collision.AABB_Camera(node.boundingBox, camera)){
                return;
            }
            if(extraInfo){
                intersections.intersectedNodes.push(node);
            }
            if(node.children === null){
                if(extraInfo){
                    intersections.leafNodes.push(node);
                }
                for(let i = 0; i < node.items.length; i++){
                    let item = node.items[i];
                    testCount ++;
                    if(!hitItemIds.has(item.id) && Collision.AABB_Camera(item.AABB, camera)){
                        intersections.items.push(item);
                        hitItemIds.add(item.id)
                    }
                }
            }else{
                for(let c=0; c < node.children.length; c++){
                    traverse(node.children[c]);
                }
            }

        }
        traverse(root);
        intersections.itemTestCount = testCount;
        intersections.time = performance.now() - startTime;
        return intersections;
    };
    let buildTime = performance.now() - buildStartTime;
    // console.log(`\tBuilt Octree in ${buildTime} ms`);
    return {
        findAABBIntersections,
        findCameraIntersections,
        root,
        nodes: allNodes,
        nodeCount,
        maxDepth,
        buildTime,
    }
}

export {buildOctTree};