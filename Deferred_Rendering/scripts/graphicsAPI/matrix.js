// @ts-check
import { cross, normalize } from "./vector.js";
/**
 * Copies 16 elements from src to dest.
 * @param {ArrayLike} src
 * @param {*} dest
 */
function copyMatrix4x4(src, dest) {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
    dest[3] = src[3];

    dest[4] = src[4];
    dest[5] = src[5];
    dest[6] = src[6];
    dest[7] = src[7];

    dest[8] = src[8];
    dest[9] = src[9];
    dest[10] = src[10];
    dest[11] = src[11];

    dest[12] = src[12];
    dest[13] = src[13];
    dest[14] = src[14];
    dest[15] = src[15];
}

function copyMatrix3x3(src, dest) {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];

    dest[3] = src[3];
    dest[4] = src[4];
    dest[5] = src[5];

    dest[6] = src[6];
    dest[7] = src[7];
    dest[8] = src[8];
}

/**
 * Multiplies two 4 by 4 matrices.
 * @param {Float32Array|number[]} m1
 * @param {Float32Array|number[]} m2
 * @param {Float32Array|number[]|null} dest
 */
function multiplyMatrix4x4(m1, m2, dest = null) {
    let r = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // "Optimized" manual multiplication
    r[0] = m1[0] * m2[0] + m1[1] * m2[4] + m1[2] * m2[8] + m1[3] * m2[12];
    r[1] = m1[0] * m2[1] + m1[1] * m2[5] + m1[2] * m2[9] + m1[3] * m2[13];
    r[2] = m1[0] * m2[2] + m1[1] * m2[6] + m1[2] * m2[10] + m1[3] * m2[14];
    r[3] = m1[0] * m2[3] + m1[1] * m2[7] + m1[2] * m2[11] + m1[3] * m2[15];

    r[4] = m1[4] * m2[0] + m1[5] * m2[4] + m1[6] * m2[8] + m1[7] * m2[12];
    r[5] = m1[4] * m2[1] + m1[5] * m2[5] + m1[6] * m2[9] + m1[7] * m2[13];
    r[6] = m1[4] * m2[2] + m1[5] * m2[6] + m1[6] * m2[10] + m1[7] * m2[14];
    r[7] = m1[4] * m2[3] + m1[5] * m2[7] + m1[6] * m2[11] + m1[7] * m2[15];

    r[8] = m1[8] * m2[0] + m1[9] * m2[4] + m1[10] * m2[8] + m1[11] * m2[12];
    r[9] = m1[8] * m2[1] + m1[9] * m2[5] + m1[10] * m2[9] + m1[11] * m2[13];
    r[10] = m1[8] * m2[2] + m1[9] * m2[6] + m1[10] * m2[10] + m1[11] * m2[14];
    r[11] = m1[8] * m2[3] + m1[9] * m2[7] + m1[10] * m2[11] + m1[11] * m2[15];

    r[12] = m1[12] * m2[0] + m1[13] * m2[4] + m1[14] * m2[8] + m1[15] * m2[12];
    r[13] = m1[12] * m2[1] + m1[13] * m2[5] + m1[14] * m2[9] + m1[15] * m2[13];
    r[14] = m1[12] * m2[2] + m1[13] * m2[6] + m1[14] * m2[10] + m1[15] * m2[14];
    r[15] = m1[12] * m2[3] + m1[13] * m2[7] + m1[14] * m2[11] + m1[15] * m2[15];

    if (dest) {
        copyMatrix4x4(r, dest);
        return dest;
    }

    return r;
}

/**
 * Transpose a matrix.
 * Reference: https://jsperf.com/transpose-2d-array
 *
 * @param {Float32Array|number[]} m
 * @param {boolean} inplace
 * @returns
 */
function transposeMatrix4x4(m, inplace = false) {
    let t = [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]];
    if (inplace) {
        copyMatrix4x4(t, m);
        return m;
    }
    return t;
}

/**
 * Creates an identity matrix
 * @param {Float32Array | number[] | null} m if supplied, will be converted to identity matrix
 * @returns
 */
function identityMatrix4x4(m = null) {
    if (m) {
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 1;
        m[6] = 0;
        m[7] = 0;

        m[8] = 0;
        m[9] = 0;
        m[10] = 1;
        m[11] = 0;

        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;

        return m;
    }
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 *
 * @param {number[] | Float32Array} m
 * @param {number} scale
 * @param {number[] | Float32Array | null} dest
 * @returns
 */
let scalarMultiplyMatrix4x4 = (m, scale, dest = null) => {
    if (dest) {
        for (let i = 0; i < 16; i++) {
            dest[i] = m[i] * scale;
        }
        return dest;
    } else {
        let t = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 16; i++) {
            t[i] = m[i] * scale;
        }
        return t;
    }
};

/**
 *
 * @param {Float32Array | number[]} m
 * @param {Float32Array | number[] | null} dest
 * @returns
 */
let inverseMatrix4x4 = (m, dest = null) => {
    let a00 = m[0 * 4 + 0];
    let a01 = m[0 * 4 + 1];
    let a02 = m[0 * 4 + 2];
    let a03 = m[0 * 4 + 3];
    let a10 = m[1 * 4 + 0];
    let a11 = m[1 * 4 + 1];
    let a12 = m[1 * 4 + 2];
    let a13 = m[1 * 4 + 3];
    let a20 = m[2 * 4 + 0];
    let a21 = m[2 * 4 + 1];
    let a22 = m[2 * 4 + 2];
    let a23 = m[2 * 4 + 3];
    let a30 = m[3 * 4 + 0];
    let a31 = m[3 * 4 + 1];
    let a32 = m[3 * 4 + 2];
    let a33 = m[3 * 4 + 3];

    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    let t = [
        a11 * b11 - a12 * b10 + a13 * b09,
        a02 * b10 - a01 * b11 - a03 * b09,
        a31 * b05 - a32 * b04 + a33 * b03,
        a22 * b04 - a21 * b05 - a23 * b03,
        a12 * b08 - a10 * b11 - a13 * b07,
        a00 * b11 - a02 * b08 + a03 * b07,
        a32 * b02 - a30 * b05 - a33 * b01,
        a20 * b05 - a22 * b02 + a23 * b01,
        a10 * b10 - a11 * b08 + a13 * b06,
        a01 * b08 - a00 * b10 - a03 * b06,
        a30 * b04 - a31 * b02 + a33 * b00,
        a21 * b02 - a20 * b04 - a23 * b00,
        a11 * b07 - a10 * b09 - a12 * b06,
        a00 * b09 - a01 * b07 + a02 * b06,
        a31 * b01 - a30 * b03 - a32 * b00,
        a20 * b03 - a21 * b01 + a22 * b00,
    ];
    if (dest) {
        return scalarMultiplyMatrix4x4(t, 1.0 / det, dest);
    } else {
        return scalarMultiplyMatrix4x4(t, 1.0 / det);
    }
};

/**
 * Rotates a 4x4 matrix, represented as an array in column major order, by the specified amount in place.
 * @param {number[] | Float32Array} matrix
 * @param {number} radians
 */
let rotateX = (matrix, radians) => {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    let matRotation = [1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1];
    multiplyMatrix4x4(transposeMatrix4x4(matRotation, true), matrix, matrix);
};

/**
 * Rotates a 4x4 matrix, represented as an array in column major order, by the specified amount in place.
 * @param {number[] | Float32Array} matrix
 * @param {number} radians
 */
let rotateY = (matrix, radians) => {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    let matRotation = [cos, 0, sin, 0, 0, 1, 0, 0, -sin, 0, cos, 0, 0, 0, 0, 1];
    multiplyMatrix4x4(transposeMatrix4x4(matRotation, true), matrix, matrix);
};

/**
 * Rotates a 4x4 matrix, represented as an array in column major order, by the specified amount in place.
 * @param {number[] | Float32Array} matrix
 * @param {number} radians
 */
let rotateZ = (matrix, radians) => {
    // mat_r_c
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    let matRotation = [cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    multiplyMatrix4x4(transposeMatrix4x4(matRotation, true), matrix, matrix);
};

/**
 * Translates a 4x4 matrix represented as an array in column major order in place
 * @param {number[] | Float32Array} matrix
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
let translate = (matrix, x, y, z) => {
    // mat_r_c

    let matTranslation = [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
    multiplyMatrix4x4(transposeMatrix4x4(matTranslation, true), matrix, matrix);
};

/**
 * Scales a 4x4 matrix represented as an array in column major order in place
 * @param {number[] | Float32Array} matrix
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
let scaleMatrix4x4 = (matrix, x, y, z) => {
    let matScale = [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
    multiplyMatrix4x4(transposeMatrix4x4(matScale, true), matrix, matrix);
};

let getIdentity4x4Matrices = (count) => {
    let m = new Float32Array(16 * count);
    for (let offset = 0; offset < m.length; offset += 16) {
        m[offset + 0] = 1;
        m[offset + 1] = 0;
        m[offset + 2] = 0;
        m[offset + 3] = 0;

        m[offset + 4] = 0;
        m[offset + 5] = 1;
        m[offset + 6] = 0;
        m[offset + 7] = 0;

        m[offset + 8] = 0;
        m[offset + 9] = 0;
        m[offset + 10] = 1;
        m[offset + 11] = 0;

        m[offset + 12] = 0;
        m[offset + 13] = 0;
        m[offset + 14] = 0;
        m[offset + 15] = 1;
    }
    return m;
};

let getIdentity3x3Matrices = (count) => {
    let m = new Float32Array(9 * count);
    for (let offset = 0; offset < m.length; offset += 9) {
        m[offset + 0] = 1;
        m[offset + 1] = 0;
        m[offset + 2] = 0;

        m[offset + 3] = 0;
        m[offset + 4] = 1;
        m[offset + 5] = 0;

        m[offset + 6] = 0;
        m[offset + 7] = 0;
        m[offset + 8] = 1;
    }
    return m;
};

/**
 * taken from https://webgl2fundamentals.org/webgl/lessons/webgl-3d-camera.html
 * @param {{x:number, y:number, z:number}} position
 * @param {{x:number, y:number, z:number}} target
 * @param {{x:number, y:number, z:number}} up
 */
let lookAt = (position, target, up = { x: 0, y: 1, z: 0 }) => {
    let zAxis = normalize({ x: position.x - target.x, y: position.y - target.y, z: position.z - target.z });
    let xAxis = normalize(cross(up, zAxis));
    let yAxis = normalize(cross(zAxis, xAxis));
    return [
        xAxis.x,
        xAxis.y,
        xAxis.z,
        0,
        yAxis.x,
        yAxis.y,
        yAxis.z,
        0,
        zAxis.x,
        zAxis.y,
        zAxis.z,
        0,
        position.x,
        position.y,
        position.z,
        1,
    ];
};

export {
    lookAt,
    getIdentity4x4Matrices,
    getIdentity3x3Matrices,
    scaleMatrix4x4,
    scalarMultiplyMatrix4x4,
    translate,
    copyMatrix4x4,
    copyMatrix3x3,
    multiplyMatrix4x4,
    transposeMatrix4x4,
    identityMatrix4x4,
    inverseMatrix4x4,
    rotateX,
    rotateY,
    rotateZ,
};
