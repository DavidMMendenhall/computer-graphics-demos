// @ts-check

/**
 * Loads a text file from server
 * @param {string} path 
 * @returns 
 */
let loadTextFile = async (path) => {
    const resp = await fetch(path);
    return await resp.text();
};

