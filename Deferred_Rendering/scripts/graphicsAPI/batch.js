// @ts-check
import { copyMatrix3x3, copyMatrix4x4, getIdenity4x4Matricies, inverseMatrix4x4, lookAt, multiplyMatrix4x4, scaleMatrix4x4, translate, transposeMatrix4x4 } from "./matrix.js";
import { matrixFromQuaternion } from "./quaternion.js";

/**
 * @typedef ItemBatch
 * @prop {{color:Float32Array, material:Float32Array, matrix:{normal:Float32Array, model:Float32Array}}} arrays 
 * @prop {{color:GPUBuffer, material:GPUBuffer, matrix:{normal:GPUBuffer, model:GPUBuffer}}} instanceBuffers
 * @prop {number} allocatedItemCount
 * @prop {number} itemCount
 * @prop {GPUDevice} device
 */

/**
 * @typedef LightBatch
 * @prop {{color:Float32Array, radius:Float32Array, position:Float32Array, matrix:{model:Float32Array}}} arrays 
 * @prop {{color:GPUBuffer, radius:GPUBuffer, position:GPUBuffer, matrix:{model:GPUBuffer}}} instanceBuffers
 * @prop {number} allocatedLightCount
 * @prop {number} lightCount
 * @prop {GPUDevice} device
 */

/** 
 * 
 * @param {number} size
 * @param {GPUDevice} device
*/
let createBuffer = (size, device) => {
    return device.createBuffer({usage:GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX, size})
}

const BYTES_PER_FLOAT = 4;
/**
 * Creates and allocates memory for rendering items
 * @param {number} itemCount Number of items to allocate for batch
 * @param {GPUDevice} device 
 * @returns {ItemBatch}
 */
let createItemBatch = (itemCount, device) => {
    return {
        arrays:{
            color: new Float32Array(3 * itemCount),
            material: new Float32Array(3 * itemCount),
            matrix: {
                normal: new Float32Array(9 * itemCount),
                model: new Float32Array(16 * itemCount),
            }
        },
        instanceBuffers:{
            color: createBuffer(3 * itemCount * BYTES_PER_FLOAT, device),
            material: createBuffer(3 * itemCount * BYTES_PER_FLOAT, device),
            matrix: {
                normal: createBuffer(9 * itemCount * BYTES_PER_FLOAT, device),
                model: createBuffer(16 * itemCount * BYTES_PER_FLOAT, device),
            }
        },
        get allocatedItemCount() {return itemCount},
        itemCount: 0,
        get device() {return device},
    }
}

/**
 * Creates and allocates memory for rendering lights
 * @param {number} lightCount Number of items to allocate for batch
 * @param {GPUDevice} device 
 * @returns {LightBatch}
 */
let createLightBatch = (lightCount, device) => {
    return {
        arrays:{
            color: new Float32Array(3 * lightCount),
            radius: new Float32Array(lightCount),
            position: new Float32Array(3 * lightCount),
            matrix: {
                model: new Float32Array(16 * lightCount),
            }
        },
        instanceBuffers:{
            color: createBuffer(3 * lightCount * BYTES_PER_FLOAT, device),
            position: createBuffer(3 * lightCount * BYTES_PER_FLOAT, device),
            radius: createBuffer(lightCount * BYTES_PER_FLOAT, device),
            matrix: {
                model: createBuffer(16 * lightCount * BYTES_PER_FLOAT, device),
            }
        },
        get allocatedLightCount() {return lightCount},
        lightCount: 0,
        get device() {return device},
    }
}

/**
 * Adds an item to a batch
 * @param {import("../item").Item} item 
 * @param {ItemBatch} batch 
 */
let addItemToBatch = (item, batch) => {
    if(batch.allocatedItemCount <= batch.itemCount){
        throw "Batch full";
    }
    let index = batch.itemCount++;
    let rotationMatrix = new Float32Array(matrixFromQuaternion(item.quaternion));
    transposeMatrix4x4(rotationMatrix, true);
    scaleMatrix4x4(rotationMatrix, item.scale[0], item.scale[1], item.scale[2])
    let translationMatrix = getIdenity4x4Matricies(1);
    translate(translationMatrix, item.position[0], item.position[1], item.position[2]);

    let modelMatrix = multiplyMatrix4x4(rotationMatrix, translationMatrix);
    let normalMatrix = transposeMatrix4x4(inverseMatrix4x4(modelMatrix));
    normalMatrix = new Float32Array([
        normalMatrix[0], normalMatrix[1], normalMatrix[2],
        normalMatrix[4], normalMatrix[5], normalMatrix[6],
        normalMatrix[8], normalMatrix[9], normalMatrix[10],
    ])

    copyMatrix4x4(modelMatrix, new Float32Array(batch.arrays.matrix.model.buffer, 16 * 4 * index, 16));
    copyMatrix3x3(normalMatrix, new Float32Array(batch.arrays.matrix.normal.buffer, 9 * 4 * index, 9));
    batch.arrays.color[index * 3 + 0] = item.color[0];
    batch.arrays.color[index * 3 + 1] = item.color[1];
    batch.arrays.color[index * 3 + 2] = item.color[2];

    batch.arrays.material[index * 3 + 0] = item.material[0];
    batch.arrays.material[index * 3 + 1] = item.material[1];
    batch.arrays.material[index * 3 + 2] = item.material[2];
}

/**
 * Adds a light to a batch
 * @param {import("./graphics.js").Light} light 
 * @param {LightBatch} batch 
 * @param {import("./camera.js").Camera} camera needed so light gemoetry can face camera
 */
let addLightToBatch = (light, batch, camera) => {
    if(batch.allocatedLightCount <= batch.lightCount){
        throw "Batch full";
    }
    let index = batch.lightCount++;
    let m = lookAt({x:light.position[0], y:light.position[1], z:light.position[2]}, camera.position, camera.up);
    scaleMatrix4x4(m, light.radius, light.radius, light.radius);

    copyMatrix4x4(m, new Float32Array(batch.arrays.matrix.model.buffer, 16 * 4 * index, 16));
    batch.arrays.color[index * 3 + 0] = light.color[0];
    batch.arrays.color[index * 3 + 1] = light.color[1];
    batch.arrays.color[index * 3 + 2] = light.color[2];

    batch.arrays.position[index * 3 + 0] = light.position[0];
    batch.arrays.position[index * 3 + 1] = light.position[1];
    batch.arrays.position[index * 3 + 2] = light.position[2];

    batch.arrays.radius[index] = light.radius;
}

/**
 * Buffers the data added with addItemToBatch to batch's buffers
 * @param {ItemBatch} batch 
 */
let bufferItemBatch = (batch) => {
    let count = batch.itemCount;
    let buffers = batch.instanceBuffers;
    let device = batch.device;
    let arrays = batch.arrays;
    device.queue.writeBuffer(buffers.matrix.model, 0, arrays.matrix.model, 0, count * 16);
    device.queue.writeBuffer(buffers.matrix.normal, 0, arrays.matrix.normal, 0, count * 9);
    device.queue.writeBuffer(buffers.color, 0, arrays.color, 0, count * 3);
    device.queue.writeBuffer(buffers.material, 0, arrays.material, 0, count * 3);
}

/**
 * Buffers the data added with addLightToBatch to batch's buffers
 * @param {LightBatch} batch 
 */
let bufferLightBatch = (batch) => {
    let count = batch.lightCount;
    let buffers = batch.instanceBuffers;
    let device = batch.device;
    let arrays = batch.arrays;
    device.queue.writeBuffer(buffers.matrix.model, 0, arrays.matrix.model, 0, count * 16);
    device.queue.writeBuffer(buffers.color, 0, arrays.color, 0, count * 3);
    device.queue.writeBuffer(buffers.position, 0, arrays.position, 0, count * 3);
    device.queue.writeBuffer(buffers.radius, 0, arrays.radius, 0, count);
}

/**
 * Sets up batch with items
 * @param {import("../item").Item[]} items 
 * @param {import("./batch.js").ItemBatch} batch 
 * @returns New batch if given batch was too small, otherwise same batch
 */
let prepareItemBatch = (items, batch) => {
    let resultBatch = batch;
    if(items.length > batch.allocatedItemCount){
        resultBatch = createItemBatch(items.length, batch.device);
    }
    resultBatch.itemCount = 0;
    for(let i = 0; i < items.length; i++){
        addItemToBatch(items[i], resultBatch);
    }
    bufferItemBatch(resultBatch);
    return resultBatch;
}

/**
 * Set up batch with lights
 * @param {import("./graphics.js").Light[]} lights 
 * @param {import("./batch.js").LightBatch} batch 
 * @param {import("./camera.js").Camera} camera
 * @returns New batch if given batch was too small, otherwise same batch
 */
let prepareLightBatch = (lights, batch, camera) => {
    let resultBatch = batch;
    if(lights.length > batch.allocatedLightCount){
        resultBatch = createLightBatch(lights.length, batch.device);
    }
    resultBatch.lightCount = 0;
    for(let i = 0; i < lights.length; i++){
        addLightToBatch(lights[i], resultBatch, camera);
    }
    bufferLightBatch(resultBatch);
    return resultBatch;
}


export { 
    createItemBatch,
    createLightBatch,
    addItemToBatch,
    addLightToBatch,
    bufferItemBatch,
    bufferLightBatch,
    prepareItemBatch, 
    prepareLightBatch,
}