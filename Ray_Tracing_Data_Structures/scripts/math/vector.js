// @ts-check

/**
 * @typedef Vector
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * 
 * @param {Vector} a 
 * @param {Vector} b 
*/
let dot = (a, b)=>{
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 *  
 * @param {Vector} a 
 * @param {Vector} b 
 * @returns {Vector}
*/
let cross = (a, b) => {
    return {
        x: a.y * b.z - b.y * a.z,
        y: b.x * a.z - a.x * b.z,
        z: a.x * b.y - b.x * a.y,
    };
}

/**
 * 
 * @param {Vector} vector 
 * @returns 
*/
let magnitude = (vector) => {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

/**
 * @param {Vector} vector
 * @returns {Vector} normalized vector
 */
let normalize = (vector) => {
    let mag = magnitude(vector);
    let iMag = mag === 0 ? 1 : 1 / mag;
    return {
        x: vector.x * iMag,
        y: vector.y * iMag,
        z: vector.z * iMag,
    };
};

/**
 * 
 * @param {Vector} a 
 * @param {Vector} b 
 * @returns {Vector} a - b
 */
let subtract = (a, b)=>{
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    }
}

/**
 * 
 * @param {Vector} v
 * @param {Float32Array | number[]} m Matrix4x4
 */
let transformVector = (m, v) => {
    let w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
    return {
        x: (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12])/w,
        y: (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13])/w,
        z: (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14])/w,
    }
}

export {subtract, normalize, magnitude, cross, dot, transformVector}