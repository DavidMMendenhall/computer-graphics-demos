// @ts-check

import { computeNormals } from "./normals.js";
import { loadTextFile } from "./utilities.js"

/**
 * @typedef PLYProperty
 * @property {string} listIndexFormat
 * @property {string} format ex int
 * @property {string} name
 */

/**
 * @typedef PLYHeader
 * @property {number} lineCount
 * @property {number} byteCount
 * @property {number} vertexCount
 * @property {number} faceCount
 * @property {PLYProperty[]} vertex_properties
 * @property {PLYProperty[]} face_properties
 * @property {string} format
 */

/**
 * @param {string[]} file
 * @returns {PLYHeader}
 */
let parsePLYHeader = (file) => {
    let header = {
        lineCount: 0,
        byteCount: 0,
        vertexCount: 0,
        faceCount: 0,
        format: '',
        /** @type {PLYProperty[]} */
        vertex_properties: [],
        /** @type {PLYProperty[]} */
        face_properties: []
    };

    let lineNumber = 1;
    let byteCount = 4;
    let mode = '';
    for(; lineNumber < file.length; lineNumber++){
        let line = file[lineNumber];
        byteCount += 1 + line.length; // + 1 for new line character
        let strings = line.split(' ');
        if(strings[0].trim() === 'end_header'){
            break;
        }else if(strings[0].trim() == 'property'){
            if(strings[1].trim() == 'list'){
                header[`${mode}_properties`].push({
                    listIndexFormat: strings[2].trim(),
                    format: strings[3].trim(),
                    name: strings[4].trim(),
                });
            }else{
                header[`${mode}_properties`].push({
                    listIndexFormat: '',
                    format: strings[1].trim(),
                    name: strings[2].trim(),
                });
            }
        }else if(strings[0].trim() == 'element'){
            if(strings[1].trim() == 'vertex'){
                header.vertexCount = parseInt(strings[2]);
                mode = 'vertex';
            }else if(strings[1].trim() == 'face'){
                mode = 'face';
                header.faceCount = parseInt(strings[2]);
            }
        }
    }
    header.lineCount = lineNumber + 1;
    header.byteCount = byteCount;
    return header;
}

/**
 * 
 * @param {string[]} text 
 * @param {Blob} file
 * @param {PLYHeader} header 
 */
let parseGeometry = async (text, file, header, normalize=true) => {
    let vertices = new Float32Array( header.vertexCount * 3);
    let faces = new Uint32Array(header.faceCount * 3);
    let colors =  new Float32Array( header.vertexCount * 3);
    let normals =  new Float32Array( header.vertexCount * 3);
    let textures =  new Float32Array( header.vertexCount * 2);
    let minmax = [0,0,0, 0,0,0];
    
    if(header.format === 'ascii'){
        let vertexOffset = header.lineCount;
        for(let vertex = 0; vertex < header.vertexCount; vertex ++){
            let line = text[vertexOffset + vertex];
            let values = line.split(' ');
            let x=0, y=0, z=0;
            let index = 0;
            for(let i = 0; i < header.vertex_properties.length; i++){
                let property = header.vertex_properties[i];
                if(property.listIndexFormat === ''){
                    if(property.name == 'x'){
                        x = parseFloat(values[index]);
                    }
                    if(property.name == 'y'){
                        y = parseFloat(values[index]);
                    }
                    if(property.name == 'z'){
                        z = parseFloat(values[index]);
                    }
                    index ++;
                }else{
                    let itemCount = parseInt(values[index]);
                    index += itemCount + 1;// we don't care about any list properties for indecies right now
                }
            }
            minmax[0] = Math.min(minmax[0], x);
            minmax[1] = Math.min(minmax[1], y);
            minmax[2] = Math.min(minmax[2], z);

            minmax[3] = Math.max(minmax[3], x);
            minmax[4] = Math.max(minmax[4], y);
            minmax[5] = Math.max(minmax[5], z);

            vertices[vertex * 3 + 0] = x;
            vertices[vertex * 3 + 1] = y;
            vertices[vertex * 3 + 2] = z;

            colors[vertex * 3 + 0] = 1.0;
            colors[vertex * 3 + 1] = 1.0;
            colors[vertex * 3 + 2] = 1.0;
        }

        let faceOffset = header.lineCount + header.vertexCount;
        for(let face = 0; face < header.faceCount; face ++){
            let line = text[faceOffset + face];
            let values = line.split(' ');
            let index = 0;
            for(let i = 0; i < header.face_properties.length; i++){
                let property = header.face_properties[i];
                if(property.listIndexFormat === ''){
                    index ++; // we don't care about any non list properties for indecies
                }else{
                    let itemCount = parseInt(values[index]);
                    if(property.name == 'vertex_index' || property.name == 'vertex_indices'){
                        if(itemCount == 3){
                            faces[face * 3 + 0] = parseInt(values[index + 1]);
                            faces[face * 3 + 1] = parseInt(values[index + 2]);
                            faces[face * 3 + 2] = parseInt(values[index + 3]);
                        }else{
                            console.warn('Faces found with more than 3 vertices not supported yet')
                        }
                    }
                    index += itemCount + 1;
                }
            }
        }
    } else if(header.format == 'binary_big_endian' || header.format == 'binary_little_endian'){
        const bigEndian = header.format == 'binary_big_endian';
        if(!bigEndian){
            throw 'Little edian not supported'
        }
        let dataBuffer = await file.arrayBuffer();
        let data = new DataView(dataBuffer);
        let byte = header.byteCount;
        for(let vertex = 0; vertex < header.vertexCount; vertex++){
            let x=0, y=0, z=0;
            for(let i = 0; i < header.vertex_properties.length; i++){
                let property = header.vertex_properties[i];
                if(property.listIndexFormat === ''){

                    if(property.name == 'x'){
                        x = data.getFloat32(byte, !bigEndian);
                    }
                    if(property.name == 'y'){
                        y = data.getFloat32(byte, !bigEndian);
                    }
                    if(property.name == 'z'){
                        z = data.getFloat32(byte, !bigEndian);
                    }
                    byte += byteSizeTable[property.format];
                }else{
                    //
                    let itemCount = data.getInt8(byte);
                    byte += itemCount * byteSizeTable[property.format] + 1;// we don't care about any list properties for indecies right now
                }
            }
            colors[vertex * 3 + 0] = 1.0;
            colors[vertex * 3 + 1] = 1.0;
            colors[vertex * 3 + 2] = 1.0;
            minmax[0] = Math.min(minmax[0], x);
            minmax[1] = Math.min(minmax[1], y);
            minmax[2] = Math.min(minmax[2], z);

            minmax[3] = Math.max(minmax[3], x);
            minmax[4] = Math.max(minmax[4], y);
            minmax[5] = Math.max(minmax[5], z);
            vertices[vertex * 3 + 0] = x;
            vertices[vertex * 3 + 1] = y;
            vertices[vertex * 3 + 2] = z;
        }

        for(let face = 0; face < header.faceCount; face ++){
            for(let i = 0; i < header.face_properties.length; i++){
                let property = header.face_properties[i];
                if(property.listIndexFormat === ''){
                    byte += byteSizeTable[property.format]; // we don't care about any non list properties for indeices
                }else{
                    let itemCount = data.getUint8(byte);
                    if(property.name == 'vertex_index' || property.name == 'vertex_indices'){
                        if(itemCount == 3){
                            faces[face * 3 + 0] = data.getInt32(byte + 1 + 0, !bigEndian);
                            faces[face * 3 + 1] = data.getInt32(byte + 1 + 4, !bigEndian);
                            faces[face * 3 + 2] = data.getInt32(byte + 1 + 8, !bigEndian);
                        }else{
                            console.warn('Faces found with more than 3 vertices not supported yet')
                        }
                    }
                    byte += itemCount * byteSizeTable[property.format] + 1;
                }
            }
        }
        
    }
    if(normalize){
        let scale = 1/Math.max(minmax[3] - minmax[0], minmax[4] - minmax[1], minmax[5] - minmax[2]);
        let shift = [
            -0.5 * (minmax[3] + minmax[0]),
            -0.5 * (minmax[4] + minmax[1]),
            -0.5 * (minmax[5] + minmax[2]),
        ]
        for(let i = 0; i < vertices.length; i+=3){
            vertices[i] += shift[0];
            vertices[i] *= scale;
            vertices[i+1] += shift[1];
            vertices[i+1] *= scale;
            vertices[i+2] += shift[2];
            vertices[i+2] *= scale;
        }
    }
    return {
        vertices: vertices,
        indices: faces,
        colors: colors,
        normals: normals,
        textures: textures,
    }
}

const byteSizeTable = {
    'char': 1,
    'int8': 1,
    'uchar': 1,
    'uint8': 1,
    'short' : 2,
    'int16': 2,
    'ushort' : 2,
    'uint16': 2,
    'int': 4,
    'int32': 4,
    'uint': 4,
    'uint32': 4,
    'float': 4,
    'float32': 4,
    'double': 8,
    'float64':8,
}

let loadPLY = async (src) => {
    /** @type {Blob} */
    let file;
    /** @type {PLYHeader} */
    let header;
    return fetch(src)
    .then(r => r.blob())
    .then(b => {
        file = b;
        let formatData = b.slice(0, 40);
        return formatData.text();
    })
    .then(fd => {
        let values = fd.split('\n');
        if(values[0].trim() != 'ply'){
            throw "Not a PLY file";
        }
        let formatStrings = values[1].split(' ');
        let format = formatStrings[1].trim();
        let version = formatStrings[2].trim();
        if(version !== '1.0'){
            throw 'Unsupported version';
        }

        return file.text()
        .then(t => {
            let f = t.split('\n');
            header = parsePLYHeader(f);
            header.format = format;
            console.log(header);
            return parseGeometry(f, file, header);
        })
        .then(model => computeNormals(model))

    })

}

export {loadPLY}