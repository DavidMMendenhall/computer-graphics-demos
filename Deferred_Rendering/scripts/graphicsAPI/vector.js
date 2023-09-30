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
 * @param {number[]} v
 * @param {Float32Array | number[]} m Matrix4x4
 */
let transformVector = (m, v) => {
    let w = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15];
    return [
        (m[0] * v[0] + m[4] * v[1] + m[8] * v[2]+ m[12])/w,
        (m[1] * v[0] + m[5] * v[1] + m[9] * v[2]+ m[13])/w,
        (m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14])/w,
    ]
}

export {subtract, normalize, magnitude, cross, dot, transformVector}