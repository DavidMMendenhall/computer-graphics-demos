// @ts-check

import { createItem } from "../engine/item.js";
import { Graphics } from "../engine/render.js";
import { transformVector } from "./vector.js";

const AABBMin_X = 0;
const AABBMin_Y = 1;
const AABBMin_Z = 2;

const AABBMax_X = 3;
const AABBMax_Y = 4;
const AABBMax_Z = 5;

const PlaneNormal_X = 0;
const PlaneNormal_Y = 1;
const PlaneNormal_Z = 2;
const Plane_D = 3;

/**
 * Computes the dot product of 2 3d vectors
 * @param {number[]} a 
 * @param {number[]} b 
 */
let dot = (a, b) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 *  
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number[]}
*/
let cross = (a, b) => {
    return [
        a[1] * b[2] - b[1] * a[2],
        b[0] * a[2] - a[0] * b[2],
        a[0] * b[1] - b[0] * a[1],
    ];
};

/**
 * 
 * @param {number[]} vector 
 * @returns 
*/
let magnitude = (vector) => {
    return Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
}

/**
 * @param {number[]} vector
 * @returns {number[]} normalized vector
 */
let normalize = (vector) => {
    let mag = magnitude(vector);
    let iMag = mag === 0 ? 1 : 1 / mag;
    return [
        vector[0] * iMag,
        vector[1] * iMag,
        vector[2] * iMag,
    ];
};

/**
 * 
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number[]} a - b
 */
let subtract = (a, b)=>{
    return [
        a[0] - b[0],
        a[1] - b[1],
        a[2] - b[2],
    ]
}

/**
 * 
 * @param {number[]} p0 
 * @param {number[]} p1 
 * @param {number[]} p2 
 */
let calculatePlane = (p0, p1, p2) => {
    let normal = normalize(
        cross(
            subtract(p1, p0), 
            subtract(p2, p0)
        )
    );

    let d = normal[0] * p0[0] + normal[1] * p0[1] + normal[2] * p0[2];
    normal.push(d);
    return normal;
}

/**
 * Intersection between an Axis Aligned Bounding Box and a plane
 * Uses the method described here: https://gdbooks.gitbooks.io/3dcollisions/content/Chapter2/static_aabb_plane.html
 * @param {number[]} box 
 * @param {number[]} plane 
 */
let AABB_Plane = (box, plane) => {
    let boxCenter = [
        (box[AABBMax_X] + box[AABBMin_X]) * 0.5,
        (box[AABBMax_Y] + box[AABBMin_Y]) * 0.5,
        (box[AABBMax_Z] + box[AABBMin_Z]) * 0.5,
    ];
    let boxExtents = [
        box[AABBMax_X] - boxCenter[0],
        box[AABBMax_Y] - boxCenter[1],
        box[AABBMax_Z] - boxCenter[2],
    ];

    // computes the radius of projection of the box onto the plane's normal
    let boxProjectionRadius = 
        boxExtents[0] * Math.abs(plane[PlaneNormal_X]) + 
        boxExtents[1] * Math.abs(plane[PlaneNormal_Y]) + 
        boxExtents[2] * Math.abs(plane[PlaneNormal_Z]);

    let boxCenterPlaneDistance = dot(plane, boxCenter) - plane[Plane_D];

    return Math.abs(boxCenterPlaneDistance) <= boxProjectionRadius;
}

/**
 * Intersection between 2 Axis Aligned Bounding Boxes
 * @param {number[]} box1 
 * @param {number[]} box2 
 */
let AABB_AABB = (box1, box2) => {
    return box1[AABBMax_X] > box2[AABBMin_X] && box1[AABBMin_X] < box2[AABBMax_X] &&
            box1[AABBMax_Y] > box2[AABBMin_Y] && box1[AABBMin_Y] < box2[AABBMax_Y] &&
            box1[AABBMax_Z] > box2[AABBMin_Z] && box1[AABBMin_Z] < box2[AABBMax_Z];
}

/**
 * Intersection between an Axis Aligned Bounding Box and a camera's view frustum.
 * @param {number[]} box 
 * @param {import("../engine/render").Camera} camera 
 */
let AABB_Camera = (box, camera) => {
    // Describe the points in clip space, then use inverse matrix to place them in world
    let points = [
        [-1, -1, -1],// lower left front point (will end up at front)
        [ 1, -1, -1],
        [ 1,  1, -1],
        [-1,  1, -1],
        
        [-1, -1,  1],
        [ 1, -1,  1],
        [ 1,  1,  1],
        [-1,  1,  1],
    ];

    let matrix = Graphics.getInverseViewProjectionAspectMatrix(camera);
    for(let p = 0; p < points.length; p++){
        points[p] = transformVector(matrix, points[p]);
    };

    // each plane, with normal pointing inwards
    let near = calculatePlane(points[0], points[2], points[1]);
    let far = calculatePlane(points[4], points[5], points[6]);
    let left = calculatePlane(points[7], points[3], points[0]);
    let right = calculatePlane(points[2], points[6], points[5]);
    let top = calculatePlane(points[6], points[2], points[3]);
    let bottom = calculatePlane(points[5], points[4], points[0]);

    let planes = [
        near,
        far,
        left,
        right,
        top,
        bottom,
    ];

    let boxCenter = [
        (box[AABBMax_X] + box[AABBMin_X]) * 0.5,
        (box[AABBMax_Y] + box[AABBMin_Y]) * 0.5,
        (box[AABBMax_Z] + box[AABBMin_Z]) * 0.5,
    ];
    for(let p = 0; p < planes.length; p++){
        let plane = planes[p];
        // check if box center is on right side of plane
        let value = plane[PlaneNormal_X] * boxCenter[0] + plane[PlaneNormal_Y] * boxCenter[1] + plane[PlaneNormal_Z] * boxCenter[2] - plane[Plane_D]
        if(value >= 0){
            continue;
        }
        // If box doesn't intersect the plane when it's center is not in frustum, it is not in the frustum
        if(!AABB_Plane(box, plane)){
            return false;
        }
    };
    return true;
}


let Collision = {
    AABB_AABB,
    AABB_Plane,
    AABB_Camera,
}

export { Collision }