// @ts-check
import { copyMatrix4x4, transposeMatrix4x4 } from "./matrix.js";
/**
 * Creates a Parallel Projection matrix.  The matrix results in
 * the vertices in Normalized Device Coordinates...that is why
 * the near and far planes are negated.
 * @param {number} left 
 * @param {number} right 
 * @param {number} top 
 * @param {number} bottom 
 * @param {number} near 
 * @param {number} far 
 * @param {ArrayLike|null} dest If provided, resutling matrix will be stored in this matrix.
 * @returns 
 */
function projectionParallel(left, right, top, bottom, near, far, dest=null) {
    near = -near;
    far = -far;

    let m = [
        2/(right - left), 0.0, 0.0, -(left + right) / (right - left),
        0.0, 2/(top - bottom), 0.0, -(top + bottom) / (top - bottom),
        0.0, 0.0, -1/(far - near), -(near) / (far - near), // Note this line is different from webGL due to our clip space going from [0, 1] and not [-1, 1]
        0.0, 0.0, 0.0, 1.0
    ];
    if(dest){
        transposeMatrix4x4(m, true);
        copyMatrix4x4(m, dest);
        return dest;
    }
    return transposeMatrix4x4(m);
}

/**
 * Creates a Perspective Projection matrix.  The matrix results in
 * the vertices in Normalized Device Coordinates...that is why
 * the near and far planes are negated.
 * @param {number} left 
 * @param {number} right 
 * @param {number} top 
 * @param {number} bottom 
 * @param {number} near 
 * @param {number} far 
 * @param {number[] | Float32Array | null} dest 
 * @returns 
 */
function projectionPerspective(left, right, top, bottom, near, far, dest=null) {
    near = -near;
    far = -far;
    // see https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/building-basic-perspective-projection-matrix.html
    let m = [
        near/right, 0.0, 0.0, 0.0,
        0.0, near/top, 0.0, 0.0,
        0.0, 0.0, -far  / (far - near), -(far * near) / (far - near), // Note this line is different from webGL due to our clip space going from [0, 1] and not [-1, 1]
        0.0, 0.0, -1, 0
    ];
    if(dest){
        transposeMatrix4x4(m, true);
        copyMatrix4x4(m, dest);
        return dest;
    }
    return transposeMatrix4x4(m);
}

/**
 * Creates a Perspective Projection matrix based on a requested FOV.
 * The matrix results in the vertices in Normalized Device Coordinates...
 * that is why the near and far planes are negated.
 * @param {number} fov 
 * @param {number} near 
 * @param {number} far 
 * @param {number[] | Float32Array| null} dest 
 * @returns 
 */
function projectionPerspectiveFOV(fov, near, far, dest=null) {
    near = -near;
    far = -far;

    let scale = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    // see https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/building-basic-perspective-projection-matrix.html
    let m = [
        scale, 0.0, 0.0, 0.0,
        0.0, scale, 0.0, 0.0,
        0.0, 0.0, -far  / (far - near), -(far * near) / (far - near), // Note this line is different due to our clip space going from [0, 1] and not [-1, 1]
        0.0, 0.0, -1, 0
    ];
    if(dest){
        transposeMatrix4x4(m, true);
        copyMatrix4x4(m, dest);
        return dest;
    }
    return transposeMatrix4x4(m);
}

export {projectionParallel, projectionPerspective, projectionPerspectiveFOV}