// @ts-check
import { createItem, updateItem } from "./engine/item.js";
import { Graphics } from "./engine/render.js";
import { loadPLY } from "./modelLoader/modelLoader.js";
import { buildOctTree } from "./trees/octree.js";
import { Input, KeyboardEventType, KeyboardListener } from "./controls/input.js";

// Build UI
let overlay = document.createElement('div');
document.body.appendChild(overlay);
overlay.id = 'overlay';

let buildSlider = (id, text, min, max, value) => {
    let slider = document.createElement('input');
    let label = document.createElement('label');
    label.textContent = text;
    slider.id = id;
    slider.type = 'range';
    slider.step = '0.0001';
    // @ts-ignore
    slider.max = max
    // @ts-ignore
    slider.min = min;
    // @ts-ignore
    slider.value = value;
    overlay.appendChild(label);
    overlay.appendChild(slider);
    overlay.appendChild(document.createElement('br'));
    return slider;
}

/**
 * 
 * @param {string} id 
 * @param {string} text 
 * @param {{text:string, value:string}[]} options 
 * @returns 
 */
let buildDropDown = (id, text, options) => {
    let dropDown = document.createElement('select');
    let label = document.createElement('label');
    label.textContent = text;
    dropDown.id = id;
    for(let o = 0; o < options.length; o++){
        let optionElement = document.createElement('option');
        let option = options[o];
        optionElement.text = option.text;
        optionElement.value = option.value;
        dropDown.appendChild(optionElement);
    }
    overlay.appendChild(label);
    overlay.appendChild(dropDown);
    overlay.appendChild(document.createElement('br'));
    return dropDown;
}

overlay.appendChild(document.createElement('br'));
let viewMode = buildDropDown('vewDropDown', 'Main View:', [
    {text:'Camera', value:'camera'},
    {text:'Bird\'s Eye', value:'bird'},
    {text:'Camera Only', value:'camera_only'},
    {text:'Bird\'s Eye Only', value:'bird_only'},
]);
overlay.appendChild(document.createElement('br'));

let fovSlider = buildSlider('fovSlider', 'Camera FOV', 0, Math.PI/2, Math.PI/4);
overlay.appendChild(document.createElement('br'));

let farSlider = buildSlider('farSlider', 'Camera Far', 1, 20, 10);
overlay.appendChild(document.createElement('br'));

let treeMode = buildDropDown('treeDropDown', 'Tree Render Mode:', [
    {text:'None', value:'none'},
    {text:'All nodes', value:'all'},
    {text:'Tested nodes', value:'tested'},
    {text:'Intersected nodes', value:'intersected'},
    {text:'Leaf nodes', value:'leaf'},
]);
overlay.appendChild(document.createElement('br'));

let frustumCullMode = buildDropDown('frustumDropDown', 'Frustum Culling:', [
    {text:'Enabled', value:'enabled'},
    {text:'Disabled', value:'disabled'},
]);
overlay.appendChild(document.createElement('br'));

let birdEyeRenderedItems = buildDropDown('birdEyeItemDropDown', 'Bird\'s Eye Items:', [
    {text:'Only Rendered', value:'visible'},
    {text:'All (AABB outline)', value:'all'},
]);
overlay.appendChild(document.createElement('br'));


let birdEyeModelRenderMode = buildDropDown('birdEyeModelDropDown', 'Bird\'s Eye Model:', [
    {text:'Box', value:'box'},
    {text:'PLY Model', value:'model'},
]);
overlay.appendChild(document.createElement('br'));

let itemCountEntry = document.createElement('input');
itemCountEntry.type = 'Number';
itemCountEntry.min = '0';
itemCountEntry.max = '10000';
itemCountEntry.value = '1000';
let itemCountLabel = document.createElement('label');
itemCountLabel.textContent = 'Item Count:';
overlay.appendChild(itemCountLabel);
overlay.appendChild(itemCountEntry);
itemCountEntry.addEventListener('change', () => itemCount = parseInt(itemCountEntry.value));
overlay.appendChild(document.createElement('br'));


let itemCountDisplay = document.createElement('span');
overlay.appendChild(itemCountDisplay);
overlay.appendChild(document.createElement('br'));

let renderedItemCountDisplay = document.createElement('span');
overlay.appendChild(renderedItemCountDisplay);
overlay.appendChild(document.createElement('br'));

let fpsDisplay = document.createElement('span');
overlay.appendChild(fpsDisplay);
overlay.appendChild(document.createElement('br'));

const CUBE_MODEL = {
    vertices: new Float32Array([
        -0.5, 0.5, 0.5, // front
        -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,

        0.5, 0.5, -0.5, // back
        0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, 0.5, -0.5,

        -0.5, 0.5, -0.5, // left
        -0.5, -0.5, -0.5,
        -0.5, -0.5, 0.5,
        -0.5, 0.5, 0.5,

        0.5, 0.5, 0.5, // right
        0.5, -0.5, 0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,

        -0.5, 0.5, -0.5, // top
        -0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, -0.5,

        -0.5, -0.5, 0.5, // bottom
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5, 0.5,
    ]),
    normals: new Float32Array([
        0.0, 0.0, 1.0, // front
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        0.0, 0.0, -1.0, // back
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,

        -1.0, 0.0, 0.0, // left
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,

        1.0, 0.0, 0.0, // right
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        0.0, 1.0, 0.0, // top
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        0.0, -1.0, 0.0, // bottom
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
    ]),
    indices: new Uint32Array([
        0 + 0, 1 + 0, 2 + 0, 0 + 0, 2 + 0, 3 + 0,
        0 + 4, 1 + 4, 2 + 4, 0 + 4, 2 + 4, 3 + 4,
        0 + 8, 1 + 8, 2 + 8, 0 + 8, 2 + 8, 3 + 8,
        0 + 12, 1 + 12, 2 + 12, 0 + 12, 2 + 12, 3 + 12,
        0 + 16, 1 + 16, 2 + 16, 0 + 16, 2 + 16, 3 + 16,
        0 + 20, 1 + 20, 2 + 20, 0 + 20, 2 + 20, 3 + 20, // box model
    ])
};

// const ITEM_MODEL = await loadPLY('./assets/models/bun_zipper_res4.ply');
const ITEM_MODEL = await loadPLY('./assets/models/bun_zipper.ply');
// const ITEM_MODEL = await loadPLY('./assets/models/dragon_vrip_res4.ply');
// const ITEM_MODEL = await loadPLY('./assets/models/dragon_vrip.ply');

let worldSize = 15;
let hs = worldSize / 2;

/** @type {import("./engine/render.js").Camera} */
let cameraA = {
    position: {x: 0, y:0, z:0},
    target: {x: 0, y:0, z:5},
    up: {x:0, y:1, z:0},
    fieldOfView: Math.PI/6,
    near: -1,
    far: -5, 
}

/** @type {import("./engine/render.js").Camera} */
let cameraB = {
    position: {x: hs * 2, y: hs * 1.5, z:hs * 1.9},
    target: {x: 0, y:0, z:0},
    up: {x:0, y:1, z:0},
    fieldOfView: Math.PI/4,
    near: -1,
    far: -(worldSize ** 2), 
}

let items = [];
let extraSize = 0.25;
let baseSize = 0.25;
let itemCount = 1000;


let randomColor = () => {
    let color = [
        Math.random(),
        Math.random(),
        Math.random(),
    ]
    let inverseMagnitude = 1/Math.sqrt(color[0] ** 2 + color[1] ** 2 + color[2] ** 2);
    color[0] *= inverseMagnitude;
    color[1] *= inverseMagnitude;
    color[2] *= inverseMagnitude;
    return color;
}

let randomUnitVector = () => {
    let vector = [
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
    ]
    let inverseMagnitude = 1/Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
    vector[0] *= inverseMagnitude;
    vector[1] *= inverseMagnitude;
    vector[2] *= inverseMagnitude;
    return vector;
}

let addItem = () => {
    items.push(createItem({
        velocity:randomUnitVector(),
        color:randomColor(),
        position: [Math.random() * worldSize - hs, Math.random() * worldSize - hs, Math.random() * worldSize - hs],
        scale: [baseSize + Math.random() * extraSize, baseSize + Math.random() * extraSize, baseSize + Math.random() * extraSize,]
    }));
};

Input.setState('main');
let cameraSpeed = 5;
let cameraRotationSpeed = Math.PI / 3;

let cameraMovement = {
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
};

let cameraAngle = {
    x: 0,
    y: 0,
}

let moveForwardListener = new KeyboardListener('moveForward', new Set(['w', 'ArrowUp']), 'main', KeyboardEventType.HELD, () => {
    let speed2 = Math.cos(cameraAngle.x) * cameraSpeed;
    cameraMovement.y += Math.sin(cameraAngle.x) * cameraSpeed;
    cameraMovement.x += Math.sin(cameraAngle.y) * speed2;
    cameraMovement.z -= Math.cos(cameraAngle.y) * speed2;
});
let moveBackListener = new KeyboardListener('moveBack', new Set(['s', 'ArrowDown']), 'main', KeyboardEventType.HELD, () => {
    let speed2 = Math.cos(cameraAngle.x) * cameraSpeed;
    cameraMovement.y -= Math.sin(cameraAngle.x) * cameraSpeed;
    cameraMovement.x -= Math.sin(cameraAngle.y) * speed2;
    cameraMovement.z += Math.cos(cameraAngle.y) * speed2;
});
let moveLeftListener = new KeyboardListener('moveLeft', new Set(['a', 'ArrowLeft']), 'main', KeyboardEventType.HELD, () => {
    cameraMovement.x += Math.sin(cameraAngle.y - Math.PI/2) * cameraSpeed;
    cameraMovement.z -= Math.cos(cameraAngle.y - Math.PI/2) * cameraSpeed;
});

let moveRightListener = new KeyboardListener('moveRight', new Set(['d', 'ArrowRight']), 'main', KeyboardEventType.HELD, () => {
    cameraMovement.x += Math.sin(cameraAngle.y + Math.PI/2) * cameraSpeed;
    cameraMovement.z -= Math.cos(cameraAngle.y + Math.PI/2) * cameraSpeed;
});

let moveDownListener = new KeyboardListener('moveDown', new Set(['c']), 'main', KeyboardEventType.HELD, () => {
    let speed2 = Math.cos(cameraAngle.x - Math.PI/2) * cameraSpeed;
    cameraMovement.y += Math.sin(cameraAngle.x - Math.PI/2) * cameraSpeed;
    cameraMovement.x += Math.sin(cameraAngle.y) * speed2;
    cameraMovement.z -= Math.cos(cameraAngle.y) * speed2;
});

let moveUpListener = new KeyboardListener('moveUp', new Set(['e']), 'main', KeyboardEventType.HELD, () => {
    let speed2 = Math.cos(cameraAngle.x + Math.PI/2) * cameraSpeed;
    cameraMovement.y += Math.sin(cameraAngle.x + Math.PI/2) * cameraSpeed;
    cameraMovement.x += Math.sin(cameraAngle.y) * speed2;
    cameraMovement.z -= Math.cos(cameraAngle.y) * speed2;
});

let panUpListener = new KeyboardListener('panUp', new Set(['k']), 'main', KeyboardEventType.HELD, () => {
    cameraMovement.rx += cameraRotationSpeed;
});
let panDownListener = new KeyboardListener('panDown', new Set(['i']), 'main', KeyboardEventType.HELD, () => {
    cameraMovement.rx -= cameraRotationSpeed;
});

let panLeftListener = new KeyboardListener('panLeft', new Set(['j']), 'main', KeyboardEventType.HELD, () => {
    cameraMovement.ry -= cameraRotationSpeed;
});
let panRightListener = new KeyboardListener('panRight', new Set(['l']), 'main', KeyboardEventType.HELD, () => {
    cameraMovement.ry += cameraRotationSpeed;
});


Input.registerListener(moveLeftListener);
Input.registerListener(moveRightListener);
Input.registerListener(moveForwardListener);
Input.registerListener(moveBackListener);
Input.registerListener(moveUpListener);
Input.registerListener(moveDownListener);

Input.registerListener(panLeftListener);
Input.registerListener(panRightListener);
Input.registerListener(panUpListener);
Input.registerListener(panDownListener);


let oldTime = performance.now();

let renderCameraPOV = (testResults, tree) => {
    Graphics.clear([0, 0, 0.1, 1]);
    switch(frustumCullMode.value){
        case 'enabled':
            Graphics.drawItems(testResults.items, cameraA, ITEM_MODEL);
            break;
        case 'disabled':
            Graphics.drawItems(items, cameraA, ITEM_MODEL);
            break;
    }
}

let renderBirdsEyeView = (testResults, tree) => {
    Graphics.clear([0, 0.1, 0, 1]);
    switch(treeMode.value){
        case 'all':
            Graphics.drawTreeNodes(tree.nodes, cameraB, [0,1,0,1]);
            break;
        case 'tested':
            Graphics.drawTreeNodes(testResults.testedNodes, cameraB, [0,1,0,1]);
            break;
        case 'intersected':
            Graphics.drawTreeNodes(testResults.intersectedNodes, cameraB, [0,1,0,1]);
            break;
        case 'leaf':
            Graphics.drawTreeNodes(testResults.leafNodes, cameraB, [0,1,0,1]);
            break;

    }

    if(birdEyeRenderedItems.value === 'all'){
        Graphics.drawItemOutlines(items, cameraB, CUBE_MODEL, [1,0,0,1]);
        Graphics.drawItemOutlines(testResults.items, cameraB, CUBE_MODEL, [1,1,1,1]);
    }
    let model = birdEyeModelRenderMode.value === 'model' ? ITEM_MODEL : CUBE_MODEL;
    switch(frustumCullMode.value){
        case 'enabled':
            Graphics.drawItems(testResults.items, cameraB, model);
            break;
        case 'disabled':
            Graphics.drawItems(items, cameraB, model);
            break;
    }

    Graphics.drawCameraFrustum(cameraB, cameraA);
}

let fpsTimer = 0.25;
let fpsCounter = 0;
let frame = (time) => {
    Input.processInputs();
    let delta = (time - oldTime) * 0.001;
    if(delta > 1){
        delta = 1;// don't simulate over a second per frame
    }

    while(items.length < itemCount){
        addItem();
    }
    if(items.length > itemCount && itemCount >= 0){
        items.length = itemCount;
    }

    for(let i = 0; i < items.length;i++){
        updateItem(items[i], delta, [-hs, -hs, -hs, hs, hs, hs]);
    }

    cameraA.position.x += cameraMovement.x * delta;
    cameraA.position.y += cameraMovement.y * delta;
    cameraA.position.z += cameraMovement.z * delta;

    cameraAngle.x += cameraMovement.rx * delta;
    cameraAngle.y += cameraMovement.ry * delta;
    if(cameraAngle.x > Math.PI / 2){
        cameraAngle.x = Math.PI / 2;
    }

    if(cameraAngle.x < -Math.PI / 2){
        cameraAngle.x = -Math.PI / 2;
    }

    let radius = 5;// from camera to target
    let xzRadius = Math.cos(cameraAngle.x) * radius;
    cameraA.target.x = cameraA.position.x + Math.sin(cameraAngle.y) * xzRadius;
    cameraA.target.z = cameraA.position.z - Math.cos(cameraAngle.y) * xzRadius;
    cameraA.target.y = cameraA.position.y + Math.sin(cameraAngle.x) * radius;

    xzRadius = Math.cos(cameraAngle.x + 0.001);
    cameraA.up.x = Math.sin(cameraAngle.y) * xzRadius;
    cameraA.up.z = -Math.cos(cameraAngle.y) * xzRadius;
    cameraA.up.y = Math.sin(cameraAngle.x + 0.001);
    
    cameraMovement.x = 0;
    cameraMovement.y = 0;
    cameraMovement.z = 0;
    cameraMovement.rx = 0;
    cameraMovement.ry = 0;

    cameraA.fieldOfView = parseFloat(fovSlider.value);
    cameraA.far = -parseFloat(farSlider.value);

    let tree = buildOctTree(items, 3, [-hs, -hs, -hs, hs, hs, hs], true);
    let testResults = tree.findCameraIntersections(cameraA);
    

    Graphics.viewPanelManager.currentView = 0;
    switch(viewMode.value){
        case 'camera_only':// fall through
        case 'camera': 
            renderCameraPOV(testResults, tree);
            break;
        case 'bird': // fall through
        case 'bird_only':
            renderBirdsEyeView(testResults, tree);
            break;
    }
    // second pane rendering
    Graphics.viewPanelManager.currentView = 1;
    switch(viewMode.value){
        case 'bird': 
            renderCameraPOV(testResults, tree);
            break;
        case 'camera':
            renderBirdsEyeView(testResults, tree);
            break;
    }
    fpsTimer -= delta;
    fpsCounter ++;
    if(fpsTimer < 0){
        fpsTimer += 0.25;
        fpsDisplay.textContent = `FPS: ${fpsCounter * 4}`;
        fpsCounter = 0;
        renderedItemCountDisplay.textContent = `Rendered Objects:${frustumCullMode.value === 'enabled' ? testResults.items.length : items.length}`;
    }


    oldTime = time;
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
