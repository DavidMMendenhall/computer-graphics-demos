// @ts-check
import { renderFrame } from "./graphicsAPI/graphics.js";
import { createDiskModel, createFloorModel } from "./graphicsAPI/model.js";
import { quaternionFromAngle, quaternionLookat } from "./graphicsAPI/quaternion.js";
import { createItem, updateItem } from "./item.js";
import { loadPLY } from "./modelLoader/modelLoader.js";
let randomColor = (mod=1) => {
    let color = [
        Math.random(),
        Math.random(),
        Math.random(),
    ]
    let inverseMagnitude = 1/Math.sqrt(color[0] ** 2 + color[1] ** 2 + color[2] ** 2);
    color[0] *= inverseMagnitude * mod;
    color[1] *= inverseMagnitude * mod;
    color[2] *= inverseMagnitude * mod;
    return color;
}

let randomVector = (magnitude=1) => {
    let vector = [
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
    ]
    let inverseMagnitude = 1/Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
    vector[0] *= inverseMagnitude * magnitude;
    vector[1] *= inverseMagnitude * magnitude;
    vector[2] *= inverseMagnitude * magnitude;
    return vector;
}

let camera = {
    position: {x: 0, y:3, z:5},
    target: {x: 0, y:0, z:0},
    up: {x:0, y:1, z:0},
    fieldOfView: Math.PI/6,
    near: -1,
    far: -10,
    aspect: 1,
}
let worldSize = 5;
let halfSize = worldSize / 2;
let worldAABB = [-halfSize, -halfSize, -halfSize, halfSize, halfSize, halfSize];
const modelA = await loadPLY('./assets/models/bun_zipper.ply');
const modelB = await loadPLY('./assets/models/dragon_vrip.ply');
const reflectorModel = createDiskModel(10, 0.01, 0.05);
const floorModel = createFloorModel(worldSize);

/** @type {import("./item.js").Item[]} */
let modelAItems = [];
/** @type {import("./item.js").Item[]} */
let modelBItems = [];
/** @type {import("./item.js").Item[]} */
let reflectors = [];

let floorItems = [
    createItem({material:[1,0,0], position:[0, -0.5, 0]}),
    //walls
    createItem({material:[0.2,0,0], position:[halfSize, 0, 0], quaternion:quaternionFromAngle(Math.PI/2, [0,0,1])}),
    createItem({material:[0.2,0,0], position:[-halfSize, 0, 0], quaternion:quaternionFromAngle(Math.PI/2, [0,0,-1])}),
    createItem({material:[0.2,0,0], position:[0, 0, halfSize], quaternion:quaternionFromAngle(Math.PI/2, [-1,0,0])}),
    createItem({material:[0.2,0,0], position:[0, 0, -halfSize], quaternion:quaternionFromAngle(Math.PI/2, [1,0,0])}),
];


// Add lights, and add a reflector for every light
let lights = [];
let addLight = () => {
    lights.push({
        position: [Math.random() * worldSize - halfSize, Math.random() - 0.5, Math.random() * worldSize - halfSize],
        radius: 0.5,
        color: randomColor(0.75),
        velocity: randomVector(0.5),
    });
    reflectors.push(createItem({material:[0,0,1]}));
}

// set up the models in a grid
let rowCount = 4;
let colCount = 4;
let rowStep = worldSize / rowCount;
let colStep = worldSize / colCount;
let rowStart = -halfSize + rowStep / 2;
let colStart = -halfSize + colStep / 2;
for(let row = 0; row < rowCount; row ++){
    for(let col = 0; col < colCount; col ++){
        let list = Math.random() < 0.5 ? modelAItems : modelBItems;
        list.push(createItem({
            position:[rowStart + row * rowStep, -0.25, colStart + col * colStep],
            velocity:[0,0,0,Math.random()],
            color:randomColor(),
            material:[(row + col)/(colCount + rowCount) + 0.05,0,0]}));
    }
}

while(lights.length < 100){
    addLight();
}

let updateLight = (light, delta) => {
    light.position[0] += light.velocity[0] * delta;
    light.position[1] += light.velocity[1] * delta;
    light.position[2] += light.velocity[2] * delta;
    

    if(light.position[0] > halfSize){
        light.velocity[0] = - Math.abs(light.velocity[0]);
    }
    if(light.position[0] < -halfSize){
        light.velocity[0] = Math.abs(light.velocity[0]);
    }

    if(light.position[1] > 0.5){
        light.velocity[1] = - Math.abs(light.velocity[1]);
    }
    if(light.position[1] < -0.5){
        light.velocity[1] = Math.abs(light.velocity[1]);
    }

    if(light.position[2] > halfSize){
        light.velocity[2] = - Math.abs(light.velocity[2]);
    }
    if(light.position[2] < -halfSize){
        light.velocity[2] = Math.abs(light.velocity[2]);
    }
    
}

let oldtime = performance.now();
let frame = (time) => {
    let delta = (time - oldtime) * 0.001;
    if(delta > 1){
        // don't over simulate when there is no frame for a while
        delta = 1;
    }

    let cameraDistance = 5;
    camera.position.x = Math.cos(time * 0.0002) * cameraDistance;
    camera.position.z = Math.sin(time * 0.0002) * cameraDistance;

    for(let i = 0; i < modelAItems.length; i++){
        updateItem(modelAItems[i], delta, worldAABB);
    }
    for(let i = 0; i < modelBItems.length; i++){
        updateItem(modelBItems[i], delta, worldAABB);
    }
    for(let i = 0; i < lights.length; i++){
        updateLight(lights[i], delta);
        reflectors[i].position = lights[i].position;
        let itemToCam = {
            x: camera.position.x - reflectors[i].position[0],
            y: camera.position.y - reflectors[i].position[1],
            z: camera.position.z - reflectors[i].position[2],
        }
        reflectors[i].quaternion = quaternionLookat({x:0, y:0, z:-1}, itemToCam);
    }

    let itemsToRender = [
        {items: modelAItems, model:modelA},
        {items: modelBItems, model:modelB},
        {items:reflectors, model:reflectorModel},
        {items:floorItems, model:floorModel},
    ];
    renderFrame(camera, itemsToRender, lights);
    oldtime = time;
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
