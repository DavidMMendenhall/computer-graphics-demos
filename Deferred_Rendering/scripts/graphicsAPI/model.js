// @ts-check

const BYTES_PER_FLOAT = 4;
/**
 * @typedef BufferSet
 * @prop {GPUBuffer} vertex
 * @prop {GPUBuffer} normal
 * @prop {GPUBuffer} texture
 * @prop {GPUBuffer} index
 */

/**
 * @typedef RenderData
 * @prop {BufferSet} buffers
 * @prop {number} indexCount
 */

/**
 * @typedef Model
 * @prop {Float32Array} vertices
 * @prop {Float32Array} [normals]
 * @prop {Float32Array} [texture]
 * @prop {Uint16Array | Uint32Array} indices
 * @prop {RenderData} [renderData]
 */
/**
 *
 * @param {Model} model
 * @param {GPUDevice} device
 * @returns {RenderData}
 */
let buildModelRenderData = (model, device) => {
    let vertexCount = model.vertices.length / 3;
    let vertexBuffer = device.createBuffer({
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        size: vertexCount * 3 * BYTES_PER_FLOAT,
    });
    let normalBuffer = device.createBuffer({
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        size: vertexCount * 3 * BYTES_PER_FLOAT,
    });
    let textureBuffer = device.createBuffer({
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        size: vertexCount * 2 * BYTES_PER_FLOAT,
    });
    let indexBuffer = device.createBuffer({
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        size: model.indices.length * model.indices.BYTES_PER_ELEMENT,
    });

    device.queue.writeBuffer(vertexBuffer, 0, model.vertices);
    device.queue.writeBuffer(normalBuffer, 0, model.normals || new Float32Array(vertexCount * 3));
    device.queue.writeBuffer(textureBuffer, 0, model.texture || new Float32Array(vertexCount * 2));
    device.queue.writeBuffer(indexBuffer, 0, model.indices);
    return {
        buffers: {
            vertex: vertexBuffer,
            normal: normalBuffer,
            texture: textureBuffer,
            index: indexBuffer,
        },
        indexCount: model.indices.length,
    };
};

/**
 *
 * @returns
 */
let createScreenModel = () => {
    let verts = new Float32Array([-1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0]);
    let index = new Uint32Array([0, 1, 2, 0, 2, 3]);

    return {
        vertices: verts,
        indices: index,
    };
};

/**
 * @param {number} size
 * @returns
 */
let createFloorModel = (size) => {
    let verts = new Float32Array([
        -size / 2,
        0,
        -size / 2,
        -size / 2,
        0,
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        0,
        -size / 2,
    ]);
    let normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
    let index = new Uint32Array([0, 1, 2, 0, 2, 3]);

    return {
        vertices: verts,
        indices: index,
        normals,
    };
};

/**
 * Creates a disk model of a given size
 * @param {number} resolution
 * @param {number} radius
 * @returns
 */
let createDiskModel = (resolution, radius, z = 0) => {
    if (resolution < 3) {
        throw "resolution must be 3 or greater";
    }
    let step = (Math.PI * 2) / resolution;
    let vertices = [0, 0, z];
    let normals = [0, 0, -1];
    let index = [];

    // calculate radius scale needed to inscribe circle
    let p1 = [Math.cos(0) * radius, Math.sin(0) * radius];
    let p2 = [Math.cos(step) * radius, Math.sin(step) * radius];
    let p3 = [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5];
    let p3Magnitude = Math.sqrt(p3[0] ** 2 + p3[1] ** 2);
    let radiusScale = radius / p3Magnitude;
    radius *= radiusScale;

    for (let i = 1; i <= resolution; i++) {
        vertices.push(Math.cos(-i * step) * radius, Math.sin(-i * step) * radius, z);
        index.push(0, i, i + 1);
        normals.push(0, 0, -1);
    }
    index[index.length - 1] = 1;

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        indices: new Uint32Array(index),
    };
};
export { buildModelRenderData, createDiskModel, createFloorModel, createScreenModel };
