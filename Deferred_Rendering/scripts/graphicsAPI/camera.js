// @ts-check
/**
 * @typedef Camera
 * @prop {{x:number, y:number, z:number}} position
 * @prop {{x:number, y:number, z:number}} target
 * @prop {{x:number, y:number, z:number}} up
 * @prop {number} fieldOfView Radians
 * @prop {number} near
 * @prop {number} far
 * @prop {number} aspect Width/Height
*/

import { copyMatrix4x4, getIdentity4x4Matrices, inverseMatrix4x4, lookAt, multiplyMatrix4x4 } from "./matrix.js";
import { projectionPerspectiveFOV } from "./projection.js";

/**
 * Builds a projection matrix for a camera
 * @param {Camera} camera
 * @param {Float32Array} [destination]
*/
let getCameraMatrix = (camera, destination) => {
    if(destination){
        return inverseMatrix4x4(lookAt(camera.position, camera.target, camera.up), destination);
    }
    return inverseMatrix4x4(lookAt(camera.position, camera.target, camera.up));
};

/**
 * 
 * @param {Camera} camera 
 * @param {Float32Array} [destination]
 * @returns 
 */
let getInverseViewProjectionAspectMatrix = (camera, destination) => {
    let projection = projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far);
    let view = getCameraMatrix(camera);
    let aspect = getIdentity4x4Matrices(1);
    if(camera.aspect > 1){
        aspect[0] = 1/camera.aspect;
    }else{
        aspect[5] = camera.aspect;
    }
    let result = inverseMatrix4x4(multiplyMatrix4x4(view, multiplyMatrix4x4(projection, aspect)));
    if(destination){
        copyMatrix4x4(result, destination);
    }
    return result;
}


export {getCameraMatrix, getInverseViewProjectionAspectMatrix}