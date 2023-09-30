// @ts-check
/**
 * Loads a text file from the server.
 * @param {string} path where to fetch the file from
 */
let loadTextFile = (path) => {
    return fetch(path)
    .then(f => f.text());
}

/**
 * Loads a shader
 * @param {string} filePath 
 * @param {GPUDevice} device 
 */
let loadShader = async (filePath, device) => {
    let source = await loadTextFile(filePath);
    return device.createShaderModule({
        code: source,
    });
}

export {loadShader}