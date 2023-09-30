// @ts-check
import { loadPLY } from "./modelLoader/modelLoader.js";
import { runTests } from "./unitTest.js";
import { buildHierarchy } from "./primitiveStructures/boundingVolume.js";
import { Graphics } from "./graphics/render.js"
import { Input, KeyboardEventType, KeyboardListener } from "./controls/input.js";
import { subtract, transformVector } from "./math/vector.js";
import { buildOctTree } from "./primitiveStructures/octTree.js";
import { Output } from "./output.js";

runTests();
let start = async () => {
    let oldTime = performance.now();

    let mx = 0;
    let my = 0;
    let cameraTargetMode = 'center';
    let lastIntersection = {
        x:0,
        y:0,
        z:0,
    }
    
    Graphics.canvas.addEventListener('click', (e) => {
        if(e.target){
            // @ts-ignore
            let rect = e.target.getBoundingClientRect();
            mx = (e.clientX - rect.left)/(rect.right - rect.left) * 2 - 1;
            my = -(e.clientY - rect.top)/(rect.bottom - rect.top) * 2 + 1;

            let p1 = {
                x: mx,
                y: my,
                z: 0,
            }

            let p2 = {
                x: mx,
                y: my,
                z: 1,
            }

            let m = Graphics.getInverseViewProjectionAspectMatrix();
            p1 = transformVector(m, p1);
            p2 = transformVector(m, p2);
            let ray = {
                point: {
                    x: p1.x,
                    y: p1.y,
                    z: p1.z
                },
                dir: subtract(p2, p1),
            };
           
            let intersection =  bvh.findIntersection(ray);
            let intersectionOT = oct.findIntersection(ray);
            console.assert(intersection.t === intersectionOT.t);
            let t = intersection.t < Infinity ? intersection.t : 1;
            if(intersection.finalNode){
                lastIntersection.x = ray.point.x + ray.dir.x * t;
                lastIntersection.y = ray.point.y + ray.dir.y * t;
                lastIntersection.z = ray.point.z + ray.dir.z * t;
            }
            Graphics.setRay(ray, intersection, intersectionOT);
            Output.addMessage('BVH Ray Cast Stats:', `
            &emsp; Nodes Tested: ${intersection.testedNodes.length}<br>
            &emsp; Nodes Intersected: ${intersection.hitNodes.length}<br>
            &emsp; Leaf Nodes Intersected: ${intersection.leafNodes.length}<br>
            &emsp; Triangles Tested: ${intersection.primitiveTestCount}<br>
            &emsp; Triangle Intersected: ${intersection.face}<br>
            &emsp; Time (ms): ${intersection.time}<br>
            `, 'rgba(0,0,255,0.25)');
            Output.addMessage('Octree Ray Cast Stats:', `
            &emsp; Nodes Tested: ${intersectionOT.testedNodes.length}<br>
            &emsp; Nodes Intersected: ${intersectionOT.hitNodes.length}<br>
            &emsp; Leaf Nodes Intersected: ${intersectionOT.leafNodes.length}<br>
            &emsp; Triangles Tested: ${intersectionOT.primitiveTestCount}<br>
            &emsp; Triangle Intersected: ${intersectionOT.face}<br>
            &emsp; Time (ms): ${intersectionOT.time}<br>
            `, 'rgba(200,0,200,0.25)');
        }
        
    });


    Input.setState('main');

    let cameraRotation = {
        x: 0,
        y: 0,
    };

    let zoom = {
        in: false,
        out: false,
    }

    let movmentSpeed = 1.0;
    let cameraRotationSpeed = {
        x: 0,
        y: 0,
    };

    let updateCameraTarget = () => {
        if(cameraTargetMode === 'center'){
            Graphics.camera.target.x = 0;
            Graphics.camera.target.y = 0;
            Graphics.camera.target.z = 0;
        }else{
            Graphics.camera.target.x = lastIntersection.x;
            Graphics.camera.target.y = lastIntersection.y;
            Graphics.camera.target.z = lastIntersection.z;
        }
    }

    let upListener = new KeyboardListener('rotateUp', new Set(['w']), 'main', KeyboardEventType.HELD, () => {cameraRotationSpeed.y = movmentSpeed;})
    let downListener = new KeyboardListener('rotateDown', new Set(['s']), 'main', KeyboardEventType.HELD, () => {cameraRotationSpeed.y = -movmentSpeed;})
    let leftListener = new KeyboardListener('rotateLeft', new Set(['a']), 'main', KeyboardEventType.HELD, () => {cameraRotationSpeed.x = movmentSpeed;})
    let rightListener = new KeyboardListener('rotateRight', new Set(['d']), 'main', KeyboardEventType.HELD, () => {cameraRotationSpeed.x = -movmentSpeed;})
    let zoomInListener = new KeyboardListener('zoomIn', new Set(['z']), 'main', KeyboardEventType.HELD, () => {zoom.in = true})
    let zoomOutListener = new KeyboardListener('zoomOut', new Set(['x']), 'main', KeyboardEventType.HELD, () => {zoom.out = true})
    Input.registerListener(upListener);
    Input.registerListener(downListener);
    Input.registerListener(leftListener);
    Input.registerListener(rightListener);
    Input.registerListener(zoomInListener);
    Input.registerListener(zoomOutListener);

    let overlayListener = new KeyboardListener('transparencyToggle', new Set(['o']), 'main', KeyboardEventType.UP, () => {Graphics.settings.boxRendering.transparency = !Graphics.settings.boxRendering.transparency})
    let lineListener = new KeyboardListener('lineToggle', new Set(['l']), 'main', KeyboardEventType.UP, () => {Graphics.settings.boxRendering.outline = !Graphics.settings.boxRendering.outline})
    let modeListener = new KeyboardListener('modeChange', new Set(['m']), 'main', KeyboardEventType.UP, () => {
        switch(Graphics.settings.boxMode){
            case 'all':
                Graphics.settings.boxMode = 'tested';
                break;
            case 'tested':
                Graphics.settings.boxMode = 'intersected';
                break;
            case 'intersected':
                Graphics.settings.boxMode = 'leaf';
                break;
            case 'leaf':
                Graphics.settings.boxMode = 'final';
                break;
            default:
                Graphics.settings.boxMode = 'all';
        }
        Output.addMessage('', `Showing ${Graphics.settings.boxMode} nodes`, 'rgba(255, 255, 255, 0.1)');
        //console.log(`Nodes shown: ${Graphics.settings.boxMode}`)
    });
    let targetListener = new KeyboardListener('target', new Set(['t']), 'main', KeyboardEventType.UP, () => {
        cameraTargetMode = 'intersection'
        updateCameraTarget();
    })
    let resetListener = new KeyboardListener('reset', new Set(['r']), 'main', KeyboardEventType.UP, () => {
        cameraTargetMode = 'center'
        updateCameraTarget();
    })
    Input.registerListener(overlayListener);
    Input.registerListener(lineListener);
    Input.registerListener(modeListener);
    Input.registerListener(targetListener);
    Input.registerListener(resetListener);


    Graphics.canvas.addEventListener('wheel', (ev)=>{
        if(ev.deltaY > 0){
            Graphics.camera.fieldOfView /= 1.1;
        }else if(ev.deltaY < 0){
            Graphics.camera.fieldOfView *= 1.1;
        }
        if(Graphics.camera.fieldOfView >= Math.PI){
            Graphics.camera.fieldOfView = Math.PI / 1.1;
        }
        if(Graphics.camera.fieldOfView <= 0.00000001){
            Graphics.camera.fieldOfView = 0.00000001;
        }
    })

    let frame = (time) => {
        let delta = (time - oldTime)/1000;
        oldTime = time;
        Input.processInputs();
        cameraRotation.x += cameraRotationSpeed.x * delta;
        cameraRotation.y += cameraRotationSpeed.y * delta;

        cameraRotationSpeed.x = 0;
        cameraRotationSpeed.y = 0;

        let radius = 5;
        let radius2 = Math.cos(cameraRotation.y) * radius;
        Graphics.camera.position.y = Math.sin(cameraRotation.y) * radius + Graphics.camera.target.y;
        Graphics.camera.position.x = Math.sin(cameraRotation.x) * radius2 + Graphics.camera.target.x;
        Graphics.camera.position.z = Math.cos(cameraRotation.x) * radius2 + Graphics.camera.target.z;

        radius2 = Math.cos(cameraRotation.y + 0.001) * radius;
        let pointAboveCamera = {
            x: Math.sin(cameraRotation.x) * radius2 + Graphics.camera.target.x,
            y: Math.sin(cameraRotation.y + 0.001) * radius + Graphics.camera.target.y,
            z: Math.cos(cameraRotation.x) * radius2 + Graphics.camera.target.z,
        }

        Graphics.camera.up.x = pointAboveCamera.x - Graphics.camera.position.x;
        Graphics.camera.up.y = pointAboveCamera.y - Graphics.camera.position.y;
        Graphics.camera.up.z = pointAboveCamera.z - Graphics.camera.position.z;

        if(zoom.in){
            Graphics.camera.fieldOfView /= 2.5 ** (delta);
        }

        if(zoom.out){
            Graphics.camera.fieldOfView *= 2.5 ** (delta);

        }
        if(Graphics.camera.fieldOfView >= Math.PI){
            Graphics.camera.fieldOfView = Math.PI / 2.5;
        }
        if(Graphics.camera.fieldOfView <= 0.00000001){
            Graphics.camera.fieldOfView = 0.00000001;
        }

        zoom.in = false;
        zoom.out = false;

        Graphics.draw();
        requestAnimationFrame(frame);

    }

    console.log("Loading Model");
    // let myModel = await loadPLY('./assets/models/bun_zipper.ply');
    // let myModel = await loadPLY('./assets/models/bun_zipper_res4.ply');
    let myModel = await loadPLY('./assets/models/dragon_vrip.ply');
    // let myModel = await loadPLY('./assets/models/dragon_vrip_res4.ply');
    // let myModel = await loadPLY('./assets/models/xyzrgb_dragon.ply');
    Graphics.model = myModel;
    console.log("\tModel Loaded");

    requestAnimationFrame(frame);

    let buildBVH = async () => {
        // @ts-ignore
        let count = document.getElementById('node_primitive_count')?.value;
        console.log("Building BVH tree");
        bvh = buildHierarchy(myModel, count ,true);
        console.log("BVH statistics:")
        console.log(`\tNode Count: ${bvh.nodeCount}\n\tMax Depth: ${bvh.maxDepth}`);
        console.log('Building box models')
        Graphics.bvh = bvh;
        console.log('\tComplete')

        Output.addMessage('BVH Build Stats:', `&emsp;Node Count: ${bvh.nodeCount}<br>&emsp;Max Depth: ${bvh.maxDepth}<br>&emsp; Build Time (ms): ${bvh.buildTime} `, 'rgba(200, 200, 0, 0.25)');

    }

    let buildOT = async () => {
        // @ts-ignore
        let count = document.getElementById('node_primitive_count')?.value;
        console.log("Building octree");
        oct = buildOctTree(myModel, count ,true);
        console.log("Octree statistics:")
        console.log(`\tNode Count: ${oct.nodeCount}\n\tMax Depth: ${oct.maxDepth}`);
        console.log('Building box models')
        Graphics.octree = oct;
        console.log('\tComplete')
        Output.addMessage('Octree Build Stats:', `&emsp;Node Count: ${oct.nodeCount}<br>&emsp;Max Depth: ${oct.maxDepth}<br>&emsp; Build Time (ms): ${oct.buildTime} `, 'rgba(200, 20, 0, 0.25)');

    }

    document.getElementById('generate_bvh')?.addEventListener('click', buildBVH);
    document.getElementById('generate_ot')?.addEventListener('click', buildOT);
    document.getElementById('tree_select')?.addEventListener('change', function(){
        // @ts-ignore
        Graphics.settings.treeMode = this.value;
    } )

    let bvh = null;
    let oct = null;
    buildBVH();
    buildOT();
}

start();

