// @ts-check

import { cross, dot, normalize } from "./vector.js";

/**
 * @typedef Quaternion
 * @prop {number} w
 * @prop {number} i
 * @prop {number} j
 * @prop {number} k
 */

/**
 * 
 * @param {Quaternion} q1
 * @param {Quaternion} q2
 */
let multiplyQuaternion = (q1, q2) => {
    return {
        w: (q1.w * q2.w - q1.i * q2.i - q1.j * q2.j - q1.k * q2.k),
        i: (q1.w * q2.i + q1.i * q2.w + q1.j * q2.k - q1.k * q2.j),
        j: (q1.w * q2.j - q1.i * q2.k + q1.j * q2.w + q1.k * q2.i),
        k: (q1.w * q2.k + q1.i * q2.j - q1.j * q2.i + q1.k * q2.w),
    }
}

/**
 * 
 * @param {number} angle 
 * @param {number[]} axis 
 */
let quaternionFromAngle = (angle, axis) => {
    let sin = Math.sin(angle / 2);
    let mag = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);
    let inverseMagnitude = mag ? 1 / mag : 1;
    let normalizedAxis = [axis[0] * inverseMagnitude, axis[1] * inverseMagnitude, axis[2] * inverseMagnitude];
    return {
        w: Math.cos(angle / 2),
        i: normalizedAxis[0] * sin,
        j: normalizedAxis[1] * sin,
        k: normalizedAxis[2] * sin,
    }
}

/**
 * 
 * @param {Quaternion} q 
 * @returns 
 */
let unitQuaternionInverse = (q) => {
    return {
        w: q.w,
        i: -q.i,
        j: -q.j,
        k: -q.k,
    }
}

/**
 * 
 * @param {Quaternion} q 
 */
let matrixFromQuaternion = (q) => {
    let m = [
        1 - 2 * (q.j ** 2 + q.k ** 2), 2 * (q.i * q.j - q.k * q.w), 2 * (q.i * q.k + q.j * q.w), 0,
        2 * (q.i * q.j + q.k * q.w), 1 - 2 * (q.i ** 2 + q.k ** 2), 2 * (q.j * q.k - q.i * q.w), 0,
        2 * (q.i * q.k - q.j * q.w), 2 * (q.j * q.k + q.i * q.w), 1 - 2 * (q.i ** 2 + q.j ** 2), 0,
        0, 0, 0, 1
    ]
    return m;
}

/**
 * Calculates a quaternion that rotates a to b
 * Uses the method described here: https://gamedev.stackexchange.com/questions/15070/orienting-a-model-to-face-a-target
 * @param {import("./vector.js").Vector} a 
 * @param {import("./vector.js").Vector} b 
 * @param {import("./vector.js").Vector} up 
 * @returns 
 */
let quaternionLookat = (a, b, up={x:0, y:1, z:0}) =>
{   
    let aNormalized = normalize(a);
    let bNormalized = normalize(b);

    let dotProduct = dot(aNormalized, bNormalized);   
    // test for dot -1
    if(dotProduct == -1)
    {
        // vector a and b point exactly in the opposite direction, 
        // so it is a 180 degrees turn around the up-axis
        return quaternionFromAngle(Math.PI, [up.x, up.y, up.z]);
    }
    // test for dot 1
    else if(dotProduct == 1)
    {
        // vector a and b point exactly in the same direction
        // so we return the identity quaternion
        return quaternionFromAngle(0, [up.x, up.y, up.z]);
    }

    let rotAngle = Math.acos(dotProduct);
    let rotAxis = cross(a, b);
    rotAxis = normalize(rotAxis);
    return quaternionFromAngle(rotAngle, [rotAxis.x, rotAxis.y, rotAxis.z]);
}

export {matrixFromQuaternion, quaternionFromAngle, multiplyQuaternion, quaternionLookat}
    