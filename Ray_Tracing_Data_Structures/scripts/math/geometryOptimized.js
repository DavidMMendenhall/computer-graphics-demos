// @ts-check

/** 
 * @typedef Geometry
 * @prop {ArrayLike<number>} vertices
 * @prop {ArrayLike<number>} indices
 * @prop {Float32Array} [_faceAABB]
 * @prop {Float32Array} [_faceNormal]
 */

// Constants for indices
const rayPoint_X = 0;
const rayPoint_Y = 1;
const rayPoint_Z = 2;

const rayDir_X = 3;
const rayDir_Y = 4;
const rayDir_Z = 5;

const AABBMin_X = 0;
const AABBMin_Y = 1;
const AABBMin_Z = 2;

const AABBMax_X = 3;
const AABBMax_Y = 4;
const AABBMax_Z = 5;


/**
 * Compute the AABB for each triangle
 * @param {Geometry} geometry
 */
let computeGeometryAABBs = (geometry) => {
    let faceCount = geometry.indices.length / 3;
    let faceAABB = new Float32Array( 6 * faceCount);
    for(let face = 0; face < faceCount; face++){
        let offset = face * 6;

        let p0_x = geometry.vertices[geometry.indices[face * 3 + 0] * 3 + 0];
        let p0_y = geometry.vertices[geometry.indices[face * 3 + 0] * 3 + 1];
        let p0_z = geometry.vertices[geometry.indices[face * 3 + 0] * 3 + 2];

        let p1_x = geometry.vertices[geometry.indices[face * 3 + 1] * 3 + 0];
        let p1_y = geometry.vertices[geometry.indices[face * 3 + 1] * 3 + 1];
        let p1_z = geometry.vertices[geometry.indices[face * 3 + 1] * 3 + 2];

        let p2_x = geometry.vertices[geometry.indices[face * 3 + 2] * 3 + 0];
        let p2_y = geometry.vertices[geometry.indices[face * 3 + 2] * 3 + 1];
        let p2_z = geometry.vertices[geometry.indices[face * 3 + 2] * 3 + 2];

        faceAABB[offset + AABBMin_X] = Math.min(p0_x, p1_x, p2_x);
        faceAABB[offset + AABBMin_Y] = Math.min(p0_y, p1_y, p2_y);
        faceAABB[offset + AABBMin_Z] = Math.min(p0_z, p1_z, p2_z);

        faceAABB[offset + AABBMax_X] = Math.max(p0_x, p1_x, p2_x);
        faceAABB[offset + AABBMax_Y] = Math.max(p0_y, p1_y, p2_y);
        faceAABB[offset + AABBMax_Z] = Math.max(p0_z, p1_z, p2_z);
    }
    return faceAABB;
}

let intersection = (()=>{
    /**
     * Tells if a ray is intersecting a box or not
     * Uses the method described here:
     * https://tavianator.com/2011/ray_box.html
     * @param {ArrayLike<Number>} ray 
     * @param {ArrayLike<Number>} box 
     */
    let rayBox = (ray, box) => {
        let tmin = -Infinity;
        let tmax = Infinity;
        if(ray[rayDir_X] != 0){
            let t1x = (box[AABBMin_X] - ray[rayPoint_X])/ray[rayDir_X];
            let t2x = (box[AABBMax_X] - ray[rayPoint_X])/ray[rayDir_X];

            tmin = Math.max(tmin, Math.min(t1x, t2x));
            tmax = Math.min(tmax, Math.max(t1x, t2x));
        } else {
            if(ray[rayPoint_X] < box[AABBMin_X] || ray[rayPoint_X] > box[AABBMax_X]){
                return false;
            }
        }

        if(ray[rayDir_Y] != 0){
            let t1y = (box[AABBMin_Y] - ray[rayPoint_Y])/ray[rayDir_Y];
            let t2y = (box[AABBMax_Y] - ray[rayPoint_Y])/ray[rayDir_Y];

            tmin = Math.max(tmin, Math.min(t1y, t2y));
            tmax = Math.min(tmax, Math.max(t1y, t2y));
        } else {
            if(ray[rayPoint_Y] < box[AABBMin_Y] || ray[rayPoint_Y] > box[AABBMax_Y]){
                return false;
            }
        }

        if(ray[rayDir_Z] != 0){
            let t1z = (box[AABBMin_Z] - ray[rayPoint_Z])/ray[rayDir_Z];
            let t2z = (box[AABBMax_Z] - ray[rayPoint_Z])/ray[rayDir_Z];

            tmin = Math.max(tmin, Math.min(t1z, t2z));
            tmax = Math.min(tmax, Math.max(t1z, t2z));
        } else {
            if(ray[rayPoint_Z] < box[AABBMin_Z] || ray[rayPoint_Z] > box[AABBMax_Z]){
                return false;
            }
        }


        return tmax >= tmin && tmax >= 0;
    }

    /**
     * @param {Geometry} geometry
     * @param {number} triangle 
     * @param {ArrayLike<number>} box 
     */
    let triangleBoxApprox = (geometry, triangle, box) => {
        if(!geometry._faceAABB){
            geometry._faceAABB = computeGeometryAABBs(geometry);
        }

        let offset = triangle * 6;
        return !((geometry._faceAABB[offset + 0] >= box[3] || geometry._faceAABB[offset + 3] <= box[0]) || 
                 (geometry._faceAABB[offset + 1] >= box[4] || geometry._faceAABB[offset + 4] <= box[1]) ||
                 (geometry._faceAABB[offset + 2] >= box[5] || geometry._faceAABB[offset + 5] <= box[2]))
    }

    return {
        rayBox,
        triangleBoxApprox,
    }
})();

export {intersection}