// @ts-check
import { multiplyQuaternion, quaternionFromAngle } from "./graphicsAPI/quaternion.js";

const MIN_X = 0;
const MIN_Y = 1;
const MIN_Z = 2;

const MAX_X = 3;
const MAX_Y = 4;
const MAX_Z = 5;

const X = 0;
const Y = 1;
const Z = 2;
const ROTATION = 3;

const R = 0;
const G = 1;
const B = 2;

let idGen = (() => {
    let i = 0;
    return {
        get next(){return i++},
    }
})();
/** 
 * @typedef Item 
 * @prop {number[]} position
 * @prop {import("./graphicsAPI/quaternion").Quaternion} quaternion
 * @prop {number[]} scale
 * @prop {number[]} velocity x, y, z, rotation
 * @prop {number[]} axis axis of rotation
 * @prop {number[]} color
 * @prop {number[]} material
 * @prop {number} id
*/

/** 
 * @typedef ItemDef
 * @prop {number[]} [position]
 * @prop {number[]} [scale]
 * @prop {number[]} [velocity]
 * @prop {number[]} [color]
 * @prop {import("./graphicsAPI/quaternion").Quaternion} [quaternion]
 * @prop {number[]} [material]
 * @prop {number[]} [axis]
*/

/**
 * @param {ItemDef} [def]
 * @returns {Item}
 */
let createItem = (def) => {
    let id = idGen.next;
    return {
        position: def?.position ? [def.position[X], def.position[Y], def.position[Z]] : [0, 0, 0],
        quaternion: def?.quaternion ? def.quaternion : quaternionFromAngle(0, [0,1,0]),
        scale: def?.scale ? [def.scale[X], def.scale[Y], def.scale[Z]] : [1, 1, 1],
        velocity: def?.velocity ? [def.velocity[X], def.velocity[Y], def.velocity[Z], def.velocity[ROTATION]] : [0, 0, 0, 0],
        color: def?.color ? [def.color[R], def.color[G], def.color[B]] : [1, 1, 1],
        material: def?.material ? [def.material[0], def.material[1], def.material[2]] : [1, 1, 1],
        axis: def?.axis ? [def.axis[X], def.axis[Y], def.axis[Z]] : [0, 1, 0],
        get id(){return id},
    }
};

/**
 * 
 * @param {Item} item 
 * @param {number} delta (in seconds)
 * @param {number[]}  worldBox bounding box of world
 */
let updateItem = (item, delta, worldBox) => {
    item.position[X] += delta * item.velocity[X];
    item.position[Y] += delta * item.velocity[Y];
    item.position[Z] += delta * item.velocity[Z];
    let rotor = quaternionFromAngle(delta * item.velocity[ROTATION], item.axis);
    item.quaternion = multiplyQuaternion(item.quaternion, rotor);

    if(item.position[X] > worldBox[MAX_X]){
        item.velocity[X] = -Math.abs(item.velocity[X]);
    }
    if(item.position[X] < worldBox[MIN_X]){
        item.velocity[X] = Math.abs(item.velocity[X]);
    }

    if(item.position[Y] > worldBox[MAX_Y]){
        item.velocity[Y] = -Math.abs(item.velocity[Y]);

    }
    if(item.position[Y] < worldBox[MIN_Y]){
        item.velocity[Y] = Math.abs(item.velocity[Y]);
    }

    if(item.position[Z] > worldBox[MAX_Z]){
        item.velocity[Z] = -Math.abs(item.velocity[Z]);
    }
    if(item.position[Z] < worldBox[MIN_Z]){
        item.velocity[Z] = Math.abs(item.velocity[Z]);
    }
}
export { createItem, updateItem }