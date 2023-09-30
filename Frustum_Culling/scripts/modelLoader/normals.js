
// @ts-check

/**
 * populates the normal values of a triangle
 * @param {{vertices: Float32Array, normals: Float32Array, textures: Float32Array, indices: Uint32Array, colors: Float32Array}} model 
 */
let computeNormals = (model) => {
    let vertexFaces = computeSharedFaces(model);
    let faceNormals = computeFaceNormals(model);

    let normal = {x:0, y:0, z:0};
    for(let vertex = 0; vertex < model.vertices.length / 3; vertex++){
        normal.x = 0;
        normal.y = 0;
        normal.z = 0;
        for(let face of vertexFaces[vertex]){
            normal.x += faceNormals[face * 3 + 0];
            normal.y += faceNormals[face * 3 + 1];
            normal.z += faceNormals[face * 3 + 2];
        }
        normalize(normal);
        model.normals[vertex * 3 + 0] = normal.x;
        model.normals[vertex * 3 + 1] = normal.y;
        model.normals[vertex * 3 + 2] = normal.z;
    }
    return model;
}

/**
 * Finds all 
 * @param {{vertices: Float32Array, normals: Float32Array, textures:Float32Array, indices: Uint32Array, colors: Float32Array}} model 
 */
let computeSharedFaces = (model) => {
    /** @type {Set<number>[]} */
    let vertexFaces = [];
    for(let i = 0; i < model.vertices.length / 3; i++){
        vertexFaces[i] = new Set();
    }

    for(let face = 0; face < model.indices.length/3; face ++){
        vertexFaces[model.indices[face * 3 + 0]].add(face);
        vertexFaces[model.indices[face * 3 + 1]].add(face);
        vertexFaces[model.indices[face * 3 + 2]].add(face);
    }
    return vertexFaces;
}


let normalize = (vector) => {
    let mag = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
    let iMag = mag === 0 ? 1 : 1 / mag;
    vector.x *= iMag;
    vector.y *= iMag;
    vector.z *= iMag;
}

/**
 * Computes the normal for each face
 * @param {{vertices: Float32Array, normals: Float32Array, textures: Float32Array, indices: Uint32Array, colors: Float32Array}} model 
 */
let computeFaceNormals = (model) => {
    let faceNormals = new Float32Array(model.indices.length);
    let p1 = {x:0, y:0, z:0};
    let p2 = {x:0, y:0, z:0};
    let p3 = {x:0, y:0, z:0};

    let u = {x:0, y:0, z:0};
    let v = {x:0, y:0, z:0};
    let UxV = {x:0, y:0, z:0};

    for(let face = 0; face < model.indices.length / 3; face ++){
        p1.x = model.vertices[model.indices[face * 3 + 0] * 3 + 0];
        p1.y = model.vertices[model.indices[face * 3 + 0] * 3 + 1];
        p1.z = model.vertices[model.indices[face * 3 + 0] * 3 + 2];

        p2.x = model.vertices[model.indices[face * 3 + 1] * 3 + 0];
        p2.y = model.vertices[model.indices[face * 3 + 1] * 3 + 1];
        p2.z = model.vertices[model.indices[face * 3 + 1] * 3 + 2];

        p3.x = model.vertices[model.indices[face * 3 + 2] * 3 + 0];
        p3.y = model.vertices[model.indices[face * 3 + 2] * 3 + 1];
        p3.z = model.vertices[model.indices[face * 3 + 2] * 3 + 2];

        u.x = p2.x - p1.x;
        u.y = p2.y - p1.y;
        u.z = p2.z - p1.z;

        v.x = p3.x - p1.x;
        v.y = p3.y - p1.y;
        v.z = p3.z - p1.z;

        UxV.x = u.y * v.z - v.y * u.z;
        UxV.y = v.x * u.z - u.x * v.z;
        UxV.z = u.x * v.y - v.x * u.y;

        normalize(UxV);

        faceNormals[face * 3 + 0] = UxV.x;
        faceNormals[face * 3 + 1] = UxV.y;
        faceNormals[face * 3 + 2] = UxV.z;

    }
    return faceNormals;
}

export { computeNormals }