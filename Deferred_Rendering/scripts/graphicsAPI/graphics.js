// @ts-check
import { createItem } from "../item.js";
import {
    addItemToBatch,
    addLightToBatch,
    bufferItemBatch,
    bufferLightBatch,
    createItemBatch,
    createLightBatch,
    prepareItemBatch,
    prepareLightBatch,
} from "./batch.js";
import { getCameraMatrix, getInverseViewProjectionAspectMatrix } from "./camera.js";
import { getIdentity4x4Matrices } from "./matrix.js";
import { buildModelRenderData, createDiskModel, createFloorModel, createScreenModel } from "./model.js";
import { projectionPerspectiveFOV } from "./projection.js";
import { loadShader } from "./shader.js";
const BYTES_PER_FLOAT = 4;

// webGPU initialization code
if (!navigator.gpu) {
    throw "WebGPU not supported on this browser";
}

const device = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" }).then((adapter) => {
    if (!adapter) {
        throw "Could not obtain webGPU adapter";
    }
    return adapter.requestDevice();
});

/**
 * Creates a canvas and configures it with our WebGPU device
 * @param {number} width
 * @param {number} height
 * @param {string} [id] id to set on canvas element
 * @param {string} [title] Title text
 * @returns Canvas and context
 */
let createCanvas = (width, height, id, title) => {
    const canvas = document.createElement("canvas");
    if (id) {
        canvas.id = id;
    }
    canvas.width = width;
    canvas.height = height;
    canvas.title = title || "";
    // set up our gpu device to render to the canvas
    let context = canvas.getContext("webgpu");
    if (!context) {
        throw "Unable to get webGPU context from canvas";
    }
    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
    });
    return {
        canvas,
        context,
    };
};

// Create canvas elements
const canvasSize = 400;
const finalCanvas = createCanvas(canvasSize, canvasSize, "main_canvas", "Final Result");
const colorCanvas = createCanvas(canvasSize, canvasSize, "color_canvas", "Base Color");
const materialCanvas = createCanvas(canvasSize, canvasSize, "material_canvas", "Material");
const normalCanvas = createCanvas(canvasSize, canvasSize, "normal_canvas", "Normals");
const lightCanvas = createCanvas(canvasSize, canvasSize, "light_canvas", "Lighting result");
const depthCanvas = createCanvas(canvasSize, canvasSize, "depth_canvas", "Depth");
const canvasGrid = document.createElement("div");
canvasGrid.id = "canvas_grid";
document.body.appendChild(canvasGrid);
canvasGrid.appendChild(finalCanvas.canvas);
canvasGrid.appendChild(lightCanvas.canvas);
canvasGrid.appendChild(colorCanvas.canvas);
canvasGrid.appendChild(materialCanvas.canvas);
canvasGrid.appendChild(normalCanvas.canvas);
canvasGrid.appendChild(depthCanvas.canvas);

// load shaders
const gShader = await loadShader("./assets/shaders/gBuffer.wgsl", device);
const lightShader = await loadShader("./assets/shaders/light.wgsl", device);
const combineShader = await loadShader("./assets/shaders/final.wgsl", device);
const depthShader = await loadShader("./assets/shaders/depth.wgsl", device);

const shaderLocations = {
    attributes: {
        modelMatrix: 4,
        normalMatrix: 8,
        position: 0,
        normal: 1,
        color: 2,
        material: 3,
        texture: 11,
        lightRadius: 12,
        lightPosition: 13,
    },
    uniforms: {
        matrices: 0,
        eye: 1,
        sampler: 0,
        depthTexture: 1,
        colorTexture: 2,
        normalTexture: 3,
        materialTexture: 4,
        lightTexture: 5,
    },
};

// attribute pointers
/** @type {Object.<string, GPUVertexBufferLayout>} */
const vertexBufferDescriptors = {
    vertex: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.position, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32x3", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 12, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "vertex", // The data used from this buffer changes for every vertex
    },
    normal: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.normal, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32x3", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 12, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "vertex", // The data used from this buffer changes for every vertex
    },
    material: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.material, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32x3", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 12, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "instance", // The data used from this buffer changes for every vertex
    },
    color: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.color, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32x3", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 12, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "instance", // The data used from this buffer changes for every vertex
    },
    texture: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.texture, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32x2", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 8, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "vertex", // The data used from this buffer changes for every vertex
    },
    radius: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.lightRadius, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 4, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "instance",
    },
    lightPosition: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.lightPosition, // maps to position marked with @location(0) in the input of vertex_main
                offset: 0, // how far (in bytes) into the buffer to start
                format: "float32x3", // Expect a vector of 3 32 bit floats (vec3f in wgsl)
            },
        ],
        arrayStride: 12, // How large (in bytes) is the jump between sets of vertex data, we have 8 32 bit floats per vertex,
        stepMode: "instance",
    },
    modelMatrix: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.modelMatrix + 0, // col0
                offset: 0 * 4 * BYTES_PER_FLOAT,
                format: "float32x4",
            },
            {
                shaderLocation: shaderLocations.attributes.modelMatrix + 1, // col1
                offset: 1 * 4 * BYTES_PER_FLOAT,
                format: "float32x4",
            },
            {
                shaderLocation: shaderLocations.attributes.modelMatrix + 2, // col2
                offset: 2 * 4 * BYTES_PER_FLOAT,
                format: "float32x4",
            },
            {
                shaderLocation: shaderLocations.attributes.modelMatrix + 3, // col3
                offset: 3 * 4 * BYTES_PER_FLOAT,
                format: "float32x4",
            },
        ],
        arrayStride: 16 * BYTES_PER_FLOAT,
        stepMode: "instance",
    },
    normalMatrix: {
        attributes: [
            {
                shaderLocation: shaderLocations.attributes.normalMatrix + 0, // col0
                offset: 0 * 3 * BYTES_PER_FLOAT,
                format: "float32x3",
            },
            {
                shaderLocation: shaderLocations.attributes.normalMatrix + 1, // col1
                offset: 1 * 3 * BYTES_PER_FLOAT,
                format: "float32x3",
            },
            {
                shaderLocation: shaderLocations.attributes.normalMatrix + 2, // col2
                offset: 2 * 3 * BYTES_PER_FLOAT,
                format: "float32x3",
            },
        ],
        arrayStride: 9 * BYTES_PER_FLOAT,
        stepMode: "instance",
    },
};

// build pipelines
/** @type {GPURenderPipelineDescriptor} */
const gBufferPipelineDescriptor = {
    label: "gBuffer Pipeline",
    vertex: {
        module: gShader,
        entryPoint: "vertex_main",
        buffers: [
            vertexBufferDescriptors.vertex,
            vertexBufferDescriptors.normal,
            vertexBufferDescriptors.color,
            vertexBufferDescriptors.material,
            vertexBufferDescriptors.modelMatrix,
            vertexBufferDescriptors.normalMatrix,
        ],
    },
    fragment: {
        module: gShader,
        entryPoint: "fragment_main",
        targets: [
            {
                format: "bgra8unorm",
            },
            {
                format: "bgra8unorm",
            },
            {
                format: "bgra8unorm",
            },
        ],
    },
    primitive: {
        topology: "triangle-list",
        cullMode: "back",
    },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less-equal",
        format: "depth32float",
    },
    layout: "auto",
};
/** @type {GPURenderPipelineDescriptor} */
const lightPipelineDescriptor = {
    label: "Light Pipeline",
    vertex: {
        module: lightShader,
        entryPoint: "vertex_main",
        buffers: [
            vertexBufferDescriptors.vertex,
            vertexBufferDescriptors.color,
            vertexBufferDescriptors.radius,
            vertexBufferDescriptors.lightPosition,
            vertexBufferDescriptors.modelMatrix,
        ],
    },
    fragment: {
        module: lightShader,
        entryPoint: "fragment_main",
        targets: [
            {
                format: "bgra8unorm",
                blend: {
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one",
                        operation: "add",
                    },
                    color: {
                        srcFactor: "one",
                        dstFactor: "one",
                        operation: "add",
                    },
                },
            },
        ],
    },
    primitive: {
        topology: "triangle-list",
        cullMode: "back",
    },
    layout: "auto",
};
/** @type {GPURenderPipelineDescriptor} */
const combinePipelineDescriptor = {
    label: "Combine Pipeline",
    vertex: {
        module: combineShader,
        entryPoint: "vertex_main",
        buffers: [vertexBufferDescriptors.vertex],
    },
    fragment: {
        module: combineShader,
        entryPoint: "fragment_main",
        targets: [
            {
                format: "bgra8unorm",
            },
        ],
    },
    primitive: {
        topology: "triangle-list",
    },
    layout: "auto",
};

/** @type {GPURenderPipelineDescriptor} */
const depthPipelineDescriptor = {
    label: "Depth Buffer pipeline",
    vertex: {
        module: depthShader,
        entryPoint: "vertex_main",
        buffers: [vertexBufferDescriptors.vertex],
    },
    fragment: {
        module: depthShader,
        entryPoint: "fragment_main",
        targets: [
            {
                format: "bgra8unorm",
            },
        ],
    },
    primitive: {
        topology: "triangle-list",
    },
    layout: "auto",
};

const gBufferPipeline = device.createRenderPipeline(gBufferPipelineDescriptor);
const lightPipeline = device.createRenderPipeline(lightPipelineDescriptor);
const combinePipeline = device.createRenderPipeline(combinePipelineDescriptor);
const depthPipeline = device.createRenderPipeline(depthPipelineDescriptor);

/**
 * Creates a texture for use as a render attachment
 * @param {number} width
 * @param {number} height
 * @param {GPUTextureFormat} format
 */
let createFrameTexture = (width, height, format) => {
    return device.createTexture({
        size: [width, height],
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
};

/**
 * @typedef GBuffer
 * @prop {GPUTexture} depth
 * @prop {GPUTexture} color
 * @prop {GPUTexture} normal
 * @prop {GPUTexture} material
 * @prop {GPUTexture} light
 */
const gBuffer = ((width, height) => {
    return {
        depth: createFrameTexture(width, height, "depth32float"),
        color: createFrameTexture(width, height, "bgra8unorm"),
        normal: createFrameTexture(width, height, "bgra8unorm"),
        material: createFrameTexture(width, height, "bgra8unorm"),
        light: createFrameTexture(width, height, "bgra8unorm"),
    };
})(canvasSize, canvasSize);

// setup uniform buffers
const sharedUniformBuffers = {
    gBufferMatrix: device.createBuffer({
        size: 16 * BYTES_PER_FLOAT * 3,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    lightMatrix: device.createBuffer({
        size: 16 * BYTES_PER_FLOAT * 4, // needs room for one additional matrix;
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
    eye: device.createBuffer({
        size: 4 * BYTES_PER_FLOAT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }),
};

const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
});

// Set up uniform Bind Groups
const sharedUniformBindGroup = device.createBindGroup({
    layout: gBufferPipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: shaderLocations.uniforms.matrices,
            resource: {
                buffer: sharedUniformBuffers.gBufferMatrix,
                offset: 0,
                size: 3 * 16 * BYTES_PER_FLOAT,
            },
        },
    ],
});
const lightUniformBindGroups = [
    device.createBindGroup({
        layout: lightPipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: shaderLocations.uniforms.sampler,
                resource: sampler,
            },
            {
                binding: shaderLocations.uniforms.depthTexture,
                resource: gBuffer.depth.createView(),
            },
            {
                binding: shaderLocations.uniforms.colorTexture,
                resource: gBuffer.color.createView(),
            },
            {
                binding: shaderLocations.uniforms.normalTexture,
                resource: gBuffer.normal.createView(),
            },
            {
                binding: shaderLocations.uniforms.materialTexture,
                resource: gBuffer.material.createView(),
            },
        ],
    }),
    device.createBindGroup({
        layout: lightPipeline.getBindGroupLayout(1),
        entries: [
            {
                binding: shaderLocations.uniforms.matrices,
                resource: {
                    buffer: sharedUniformBuffers.lightMatrix,
                    offset: 0,
                    size: 4 * 16 * BYTES_PER_FLOAT,
                },
            },
            {
                binding: shaderLocations.uniforms.eye,
                resource: {
                    buffer: sharedUniformBuffers.eye,
                    offset: 0,
                    size: 4 * BYTES_PER_FLOAT,
                },
            },
        ],
    }),
];

const combineUniformBindGroup = device.createBindGroup({
    layout: combinePipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: shaderLocations.uniforms.sampler,
            resource: sampler,
        },
        {
            binding: shaderLocations.uniforms.colorTexture,
            resource: gBuffer.color.createView(),
        },
        {
            binding: shaderLocations.uniforms.lightTexture,
            resource: gBuffer.light.createView(),
        },
        {
            binding: shaderLocations.uniforms.materialTexture,
            resource: gBuffer.material.createView(),
        },
    ],
});
const depthUniformBindGroup = device.createBindGroup({
    layout: depthPipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: shaderLocations.uniforms.depthTexture,
            resource: gBuffer.depth.createView(),
        },
    ],
});

const lightDiskResolution = 10;
const LIGHT_DISK_RENDER_DATA = buildModelRenderData(createDiskModel(lightDiskResolution, 1), device);
const SCREEN_RENDER_DATA = buildModelRenderData(createScreenModel(), device);

/** @type {import("./batch.js").ItemBatch[]} */
let itemBatches = [];
let lightBatch = createLightBatch(1, device);

/**
 * @param {import("./camera.js").Camera} camera
 * */
let updateUniforms = (camera) => {
    let uniformMats = getIdentity4x4Matrices(4);
    let aspect = new Float32Array(uniformMats.buffer, 0, 16);
    let projection = new Float32Array(uniformMats.buffer, 16 * BYTES_PER_FLOAT * 1, 16);
    let view = new Float32Array(uniformMats.buffer, 16 * BYTES_PER_FLOAT * 2, 16);
    let inverseViewProjectionAspectMatrix = new Float32Array(uniformMats.buffer, 16 * BYTES_PER_FLOAT * 3, 16);
    if (camera.aspect > 1) {
        aspect[0] = 1 / camera.aspect;
    } else {
        aspect[5] = camera.aspect;
    }
    projectionPerspectiveFOV(camera.fieldOfView, camera.near, camera.far, projection);
    getCameraMatrix(camera, view);
    getInverseViewProjectionAspectMatrix(camera, inverseViewProjectionAspectMatrix);
    device.queue.writeBuffer(sharedUniformBuffers.gBufferMatrix, 0, uniformMats, 0, 16 * 3);
    device.queue.writeBuffer(sharedUniformBuffers.lightMatrix, 0, uniformMats);
    device.queue.writeBuffer(
        sharedUniformBuffers.eye,
        0,
        new Float32Array([camera.position.x, camera.position.y, camera.position.z, 1.0])
    );
};

/**
 *
 * @param {GBuffer} gBuffer
 * @param {GPUCommandEncoder} commandEncoder
 * @param {import("./batch.js").LightBatch[]} batches
 */
let renderLights = (gBuffer, commandEncoder, batches, debug = false) => {
    /** @type {GPURenderPassDescriptor} */
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: debug ? lightCanvas.context.getCurrentTexture().createView() : gBuffer.light.createView(),
            },
        ],
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(lightPipeline);
    passEncoder.setBindGroup(0, lightUniformBindGroups[0]);
    passEncoder.setBindGroup(1, lightUniformBindGroups[1]);
    // Model buffers
    passEncoder.setVertexBuffer(0, LIGHT_DISK_RENDER_DATA.buffers.vertex);
    passEncoder.setIndexBuffer(LIGHT_DISK_RENDER_DATA.buffers.index, "uint32");
    // Instance Buffers
    for (let b = 0; b < batches.length; b++) {
        let batch = batches[b];
        passEncoder.setVertexBuffer(1, batch.instanceBuffers.color);
        passEncoder.setVertexBuffer(2, batch.instanceBuffers.radius);
        passEncoder.setVertexBuffer(3, batch.instanceBuffers.position);
        passEncoder.setVertexBuffer(4, batch.instanceBuffers.matrix.model);
        passEncoder.drawIndexed(LIGHT_DISK_RENDER_DATA.indexCount, batch.lightCount);
    }
    passEncoder.end();
};

/**
 * Renders items to the gBuffer textures
 * @param {GBuffer} gBuffer
 * @param {GPUCommandEncoder} commandEncoder
 * @param {{batch:import("./batch.js").ItemBatch, renderData:import("./model.js").RenderData|undefined}[]} batches
 */
let renderGBuffer = (gBuffer, commandEncoder, batches, debug = false) => {
    /** @type {GPURenderPassDescriptor} */
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.38, g: 0.56, b: 0.9, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: debug ? colorCanvas.context.getCurrentTexture().createView() : gBuffer.color.createView(),
            },
            {
                clearValue: { r: 0.5, g: 0.5, b: 1, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: debug ? normalCanvas.context.getCurrentTexture().createView() : gBuffer.normal.createView(),
            },
            {
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: debug ? materialCanvas.context.getCurrentTexture().createView() : gBuffer.material.createView(),
            },
        ],
        depthStencilAttachment: {
            view: gBuffer.depth.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(gBufferPipeline);
    passEncoder.setBindGroup(0, sharedUniformBindGroup);
    for (let b = 0; b < batches.length; b++) {
        let renderData = batches[b].renderData;
        let batch = batches[b].batch;
        if (!renderData) {
            continue;
        }
        // model buffers
        let buffers = renderData.buffers;
        passEncoder.setIndexBuffer(buffers.index, "uint32");
        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.normal);
        // Instance buffers
        passEncoder.setVertexBuffer(2, batch.instanceBuffers.color);
        passEncoder.setVertexBuffer(3, batch.instanceBuffers.material);
        passEncoder.setVertexBuffer(4, batch.instanceBuffers.matrix.model);
        passEncoder.setVertexBuffer(5, batch.instanceBuffers.matrix.normal);
        passEncoder.drawIndexed(renderData.indexCount, batch.itemCount);
    }
    passEncoder.end();
};

/**
 * Renders the combination of color and light buffers
 * @param {GBuffer} gBuffer
 * @param {GPUCommandEncoder} commandEncoder
 */
let renderCombine = (gBuffer, commandEncoder) => {
    /** @type {GPURenderPassDescriptor} */
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.38, g: 0.0, b: 0.9, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: finalCanvas.context.getCurrentTexture().createView(),
            },
        ],
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(combinePipeline);
    passEncoder.setBindGroup(0, combineUniformBindGroup);
    passEncoder.setVertexBuffer(0, SCREEN_RENDER_DATA.buffers.vertex);
    passEncoder.setIndexBuffer(SCREEN_RENDER_DATA.buffers.index, "uint32");
    passEncoder.drawIndexed(SCREEN_RENDER_DATA.indexCount, 1);
    passEncoder.end();
};

/**
 * Renders the depth texture to the depth canvas
 * @param {GBuffer} gBuffer
 * @param {GPUCommandEncoder} commandEncoder
 */
let renderDepth = (gBuffer, commandEncoder) => {
    /** @type {GPURenderPassDescriptor} */
    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: { r: 0.38, g: 0.0, b: 0.9, a: 1.0 },
                loadOp: "clear",
                storeOp: "store",
                view: depthCanvas.context.getCurrentTexture().createView(),
            },
        ],
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(depthPipeline);
    passEncoder.setBindGroup(0, depthUniformBindGroup);
    passEncoder.setVertexBuffer(0, SCREEN_RENDER_DATA.buffers.vertex);
    passEncoder.setIndexBuffer(SCREEN_RENDER_DATA.buffers.index, "uint32");
    passEncoder.drawIndexed(SCREEN_RENDER_DATA.indexCount, 1);
    passEncoder.end();
};
/**
 * @typedef Light
 * @prop {number[]} position
 * @prop {number[]} color
 * @prop {number} radius
 */
let floorBatch = createItemBatch(1, device);
let floorItem = createItem({ material: [1, 1, 0], position: [0, -0.5, 0] });
prepareItemBatch([floorItem], floorBatch);
/**
 * Renders items and lights
 * @param {import("./camera").Camera} camera
 * @param {{items:import("../item").Item[], model:import("./model.js").Model}[]} renderList
 * @param {Light[]} lights
 */
let renderFrame = (camera, renderList, lights) => {
    // Update uniform matrices
    updateUniforms(camera);
    let batches = [];
    // Prepare batch data
    for (let i = 0; i < renderList.length; i++) {
        let model = renderList[i].model;
        if (!model.renderData) {
            model.renderData = buildModelRenderData(model, device);
        }

        let batch = itemBatches[i] || createItemBatch(renderList[i].items.length, device);
        itemBatches[i] = prepareItemBatch(renderList[i].items, batch);
        batches.push({
            batch,
            renderData: renderList[i].model.renderData,
        });
    }
    lightBatch = prepareLightBatch(lights, lightBatch, camera);
    // Create commands for GPU
    const commandEncoder = device.createCommandEncoder();
    renderGBuffer(gBuffer, commandEncoder, batches);
    renderGBuffer(gBuffer, commandEncoder, batches, true);
    renderDepth(gBuffer, commandEncoder);
    renderLights(gBuffer, commandEncoder, [lightBatch]);
    renderLights(gBuffer, commandEncoder, [lightBatch], true);
    renderCombine(gBuffer, commandEncoder);
    device.queue.submit([commandEncoder.finish()]);
};

export { renderFrame };
