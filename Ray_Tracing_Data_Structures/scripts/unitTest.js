// @ts-check

import { intersection } from "./math/geometry.js";


let runTests = () => {
    console.log('Running tests');
    // Smoke Check
    let t1 = {
        A: {x:-1, y:-1, z:-2},
        B: {x: 1, y:-1, z:-2},
        C: {x: 0, y: 1, z:-2},
    }
    let r1 = {
        point:{x:0, y:0, z:0},
        dir:{x:0, y:0, z:-1},
    }
    let res = intersection.rayTriangle(r1, t1);
    
    console.assert(res !== null);
    console.assert(res?.x === 0);
    console.assert(res?.y === 0);
    console.assert(res?.z === -2);
    // Backwards face check
    let t2 = {
        B: {x:-1, y:-1, z:-2},
        A: {x: 1, y:-1, z:-2},
        C: {x: 0, y: 1, z:-2},
    }
    let r2 = {
        point:{x:0, y:0, z:0},
        dir:{x:0, y:0, z:-1},
    }
    
    console.assert(intersection.rayTriangle(r2, t2) === null);
    console.log('Tests passed');

    // Box Test
    let b1 = {
        max: {
            x: 1,
            y: 1,
            z: -2,
        },
        min: {
            x: 0,
            y: 0,
            z: -3,
        }
    }

    let b2 = {
        max: {
            x: 1,
            y: 1,
            z: 2,
        },
        min: {
            x: 0,
            y: 0,
            z: 1,
        }
    }
    
    let b3 = {
        max: {
            x: 1,
            y: 1,
            z: 2,
        },
        min: {
            x: 0,
            y: 0,
            z:-1,
        }
    }

    let b4 = {
        max: {
            x: 1,
            y: 1,
            z: -2,
        },
        min: {
            x: 0.5,
            y: 0,
            z: -3,
        }
    }
    console.assert(intersection.rayBox(r1, b1));// right on edge
    console.assert(!intersection.rayBox(r1, b2));// behind ray
    console.assert(intersection.rayBox(r1, b3));// ray in box
    console.assert(!intersection.rayBox(r1, b4));// to side of box

    let t5 = {
        A: {x:-2, y:-2, z:-2},
        B: {x: 2, y:-2, z:-2},
        C: {x: 0, y: 2, z:-2},
    }

    let t6 = {
        A: {x:-2, y:-2, z:2},
        B: {x: 2, y:-2, z:2},
        C: {x: 0, y: 2, z:2},
    }

    let t7 = {
        A: {x:-2, y:-2, z:0},
        B: {x: 2, y:-2, z:0},
        C: {x: 0, y: 2, z:0},
    }
    
    let b5 = {
        max: {
            x: 1,
            y: 1,
            z: 1,
        },
        min: {
            x: -1,
            y: -1,
            z: -1,
        }
    }
    // box triangle smoke test
    
    console.assert(!intersection.triangleBox(t5, b5));
    console.assert(!intersection.triangleBox(t6, b5));
    console.assert(intersection.triangleBox(t7, b5));
}

export {runTests}