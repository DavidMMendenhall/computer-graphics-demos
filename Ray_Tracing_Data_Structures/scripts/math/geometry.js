// @ts-check
import { cross, subtract, dot, normalize } from "./vector.js";
/**
 * @typedef Point
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef TimedPoint
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} t
 */

/**
 * @typedef Vector
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef Ray
 * @property {Vector} dir
 * @property {Point} point
 */

/**
 * @typedef Box
 * @property {Point} min
 * @property {Point} max
 */

/**
 * @typedef Triangle
 * @property {Point} A
 * @property {Point} B
 * @property {Point} C
 */

/**
 * @typedef Plane
 * @property {Point} point
 * @property {Vector} normal
 */

/**
 * 
 * @param {Triangle} triangle
 * @returns {Plane}
 */
let calculatePlane = (triangle) => {
    let normal = normalize(
        cross(
            subtract(triangle.B, triangle.A), 
            subtract(triangle.C, triangle.A)
        )
    );

    return {
        point: {
            x: triangle.A.x,
            y: triangle.A.y,
            z: triangle.A.z,
        },
        normal: normal,
    }
}

let intersection = (()=>{
    /**
     * Finds where a ray intersects a plane
     * Uses method outlined here:
     * https://courses.cs.washington.edu/courses/csep557/10au/lectures/triangle_intersection.pdf
     * @param {Ray} ray 
     * @param {Plane} plane 
     * @return {TimedPoint | null} point of intersection, null if none exists
    */
   let rayPlane = (ray, plane) => {
        let d = plane.point.x * plane.normal.x + plane.point.y * plane.normal.y + plane.point.z * plane.normal.z;
        let t = (d - dot(plane.normal, ray.point)) / dot(plane.normal, ray.dir);
        if(Number.isFinite(t) && t >= 0){
            return {
                x: ray.dir.x * t + ray.point.x,
                y: ray.dir.y * t + ray.point.y,
                z: ray.dir.z * t + ray.point.z,
                t: t,
            }
        }
        return null;
    }

    /**
     * Finds where a ray intersects the front  of a triangle, 
     * uses method outlined here
     * https://courses.cs.washington.edu/courses/csep557/10au/lectures/triangle_intersection.pdf
     * @param {Ray} ray 
     * @param {Triangle} triangle 
     * @returns {TimedPoint | null} Point of intersection, null if none exists
     */
    let rayTriangle = (ray, triangle) => {
        let plane = calculatePlane(triangle);
        let point = rayPlane(ray, plane);
        if(point && dot(plane.normal, ray.dir) <= 0){
            let sideC = dot(
                plane.normal,
                cross(subtract(triangle.B, triangle.A), subtract(point, triangle.A))
            );
            let sideA = dot(
                plane.normal,
                cross(subtract(triangle.C, triangle.B), subtract(point, triangle.B))
            );
            let sideB = dot(
                plane.normal,
                cross(subtract(triangle.A, triangle.C), subtract(point, triangle.C))
            );
            if(sideA > 0 && sideB > 0 && sideC > 0){
                return point;
            }
        }
        return null;
    }

    /**
     * Tells if a ray is intersecting a box or not
     * Uses the method described here:
     * https://tavianator.com/2011/ray_box.html
     * @param {Ray} ray 
     * @param {Box} box 
     */
    let rayBox = (ray, box) => {
        let tmin = -Infinity;
        let tmax = Infinity;
        if(ray.dir.x != 0){
            let t1x = (box.min.x - ray.point.x)/ray.dir.x;
            let t2x = (box.max.x - ray.point.x)/ray.dir.x;

            tmin = Math.max(tmin, Math.min(t1x, t2x));
            tmax = Math.min(tmax, Math.max(t1x, t2x));
        } else {
            if(ray.point.x < box.min.x || ray.point.x > box.max.x){
                return false;
            }
        }

        if(ray.dir.y != 0){
            let t1y = (box.min.y - ray.point.y)/ray.dir.y;
            let t2y = (box.max.y - ray.point.y)/ray.dir.y;

            tmin = Math.max(tmin, Math.min(t1y, t2y));
            tmax = Math.min(tmax, Math.max(t1y, t2y));
        } else {
            if(ray.point.y < box.min.y || ray.point.y > box.max.y){
                return false;
            }
        }

        if(ray.dir.z != 0){
            let t1z = (box.min.z - ray.point.z)/ray.dir.z;
            let t2z = (box.max.z - ray.point.z)/ray.dir.z;

            tmin = Math.max(tmin, Math.min(t1z, t2z));
            tmax = Math.min(tmax, Math.max(t1z, t2z));
        } else {
            if(ray.point.z < box.min.z || ray.point.z > box.max.z){
                return false;
            }
        }


        return tmax >= tmin && tmax >= 0;
    }

    /**
     * 
     * @param {Triangle} triangle 
     * @param {Box} box 
     */
    let triangleBoxApprox = (triangle, box) => {
        let tBox = {
            min: {
                x: Math.min(triangle.A.x, triangle.B.x, triangle.C.x),
                y: Math.min(triangle.A.y, triangle.B.y, triangle.C.y),
                z: Math.min(triangle.A.z, triangle.B.z, triangle.C.z),
            },
            max: {
                x: Math.max(triangle.A.x, triangle.B.x, triangle.C.x),
                y: Math.max(triangle.A.y, triangle.B.y, triangle.C.y),
                z: Math.max(triangle.A.z, triangle.B.z, triangle.C.z),
            }
        };

        return !((tBox.min.x >= box.max.x || tBox.max.x <= box.min.x) || 
                 (tBox.min.y >= box.max.y || tBox.max.y <= box.min.y) ||
                 (tBox.min.z >= box.max.z || tBox.max.z <= box.min.z))
    }

    /**
     * Tells if a triangle and box are intersecting
     * Uses the method described here:
     * https://gdbooks.gitbooks.io/3dcollisions/content/Chapter4/aabb-triangle.html
     * @param {Triangle} triangle 
     * @param {Box} box 
     */
    let triangleBox = (triangle, box) => {
        // quick throw away
        if (!triangleBoxApprox(triangle, box)){
            return false;
        }
        // Go from min, max form, to a center extent form
        let boxCenter = {
            x: (box.max.x + box.min.x) * 0.5,
            y: (box.max.y + box.min.y) * 0.5,
            z: (box.max.z + box.min.z) * 0.5,
        }
        let boxExtents = {
            x: (box.max.x - box.min.x) * 0.5,
            y: (box.max.y - box.min.y) * 0.5,
            z: (box.max.z - box.min.z) * 0.5,
        }

        // translate triangle to have box be at origin
        let tri = {
            A: subtract(triangle.A, boxCenter),
            B: subtract(triangle.B, boxCenter),
            C: subtract(triangle.C, boxCenter),
        }

        let triEdgeVectors = [
            subtract(tri.B, tri.A),
            subtract(tri.C, tri.B),
            subtract(tri.A, tri.C),
        ];

        let boxNormals = [
            {x: 1, y:0, z:0},
            {x: 0, y:1, z:0},
            {x: 0, y:0, z:1},
        ];

        // Get all axis for projection tests
        let axis = [
            // 9 axis from crossing box normals with edge vectors
            cross(boxNormals[0], triEdgeVectors[0]),
            cross(boxNormals[0], triEdgeVectors[1]),
            cross(boxNormals[0], triEdgeVectors[2]),

            cross(boxNormals[1], triEdgeVectors[0]),
            cross(boxNormals[1], triEdgeVectors[1]),
            cross(boxNormals[1], triEdgeVectors[2]),

            cross(boxNormals[2], triEdgeVectors[0]),
            cross(boxNormals[2], triEdgeVectors[1]),
            cross(boxNormals[2], triEdgeVectors[2]),
            // the normals of the box
            boxNormals[0],
            boxNormals[1],
            boxNormals[2],
            // triangle normal,
            cross(triEdgeVectors[0], triEdgeVectors[1]),
        ];

        // project the box and triangle onto each axis, see if that axis separates them
        for(let i = 0; i < axis.length; i++){
            let a = axis[i];
            // projected point of each triangle
            let p0 = dot(tri.A, a);
            let p1 = dot(tri.B, a);
            let p2 = dot(tri.C, a);

            // The projected radius of the box???
            let r = boxExtents.x * Math.abs(dot(boxNormals[0], a)) +
                    boxExtents.y * Math.abs(dot(boxNormals[1], a)) + 
                    boxExtents.z * Math.abs(dot(boxNormals[2], a));

            // test for overlap between axis projected box and triangle, if there is none then this axis separates them
            if(Math.max(-Math.max(p0, p1, p2), Math.min(p0, p1, p2)) > r){
                return false;
            }
        }

        return true;
    }

    return {
        rayPlane,
        rayTriangle,
        rayBox,
        triangleBox,
        triangleBoxApprox,
    }
})();

export {intersection}