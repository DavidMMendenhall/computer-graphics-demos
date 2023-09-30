// @ts-check

/** 
 * @readonly
 * @enum {number} 
 * */
const KeyboardEventType = {
    DOWN: 1,
    HELD: 2,
    UP: 3,
    DOWN_IM: 4, // Trigger events upon keydown, not on processInput
    UP_IM: 5, // Trigger events upon keyup, not on processInput
}

class KeyboardListener {
    /**
     * 
     * @param {string} name
     * @param {Set<string>} triggerKeys
     * @param {string} stateName
     * @param {KeyboardEventType} mode
     * @param {()=>void} callback
     */
    constructor(name, triggerKeys, stateName, mode, callback) {
        this.name = name;
        this.triggerKeys = triggerKeys;
        this.stateName = stateName;
        this.mode = mode;
        this.callback = callback;
    }
}

let Input = (()=>{
    /** @type {Map<string, KeyboardListener>} */
    let listeners = new Map();
    
    /** @type {Set<string>} */
    let keysDownLive = new Set();

    /** @type {Set<string>} */
    let keysDown = new Set();

    /** @type {Set<string>} */
    let keyDownQueue = new Set();

     /** @type {Set<string>} */
     let keyUpQueue = new Set();

     let activeState = '';

     /**
      * Register a listener
      * @param {KeyboardListener} listener 
      */
     let registerListener = (listener)=>{
        if(!listeners.has(listener.name))
            listeners.set(listener.name, listener);
     };

     /**
      * Removes a listener
      * @param {KeyboardListener} listener 
      */
     let removeListener = (listener) => {
        if(listeners.has(listener.name))
            listeners.delete(listener.name);
     };

     /**
      * 
      * @param {KeyboardEventType} mode 
      * @param {string} key
      * @param {string} stateName 
      */
     let callListeners = (mode, key, stateName) => {
        listeners.forEach((listener)=>{
            if(listener.mode == mode && listener.triggerKeys.has(key) && listener.stateName == stateName){
                listener.callback();
            }
        })
     }

     /**
      * 
      * @param {KeyboardEvent} event 
      */
     let onKeyDown = (event) => {
        let key = event.key;
        event.preventDefault();
        if(!keysDownLive.has(key)){
            keysDownLive.add(key);
            callListeners(KeyboardEventType.DOWN_IM, key, activeState);
        }
        if(!keysDown.has(key)){
            keyDownQueue.add(key);
        }
     }
     document.addEventListener('keydown', onKeyDown);


     /**
      * 
      * @param {KeyboardEvent} event 
      */
     let onKeyUp = (event) => {
        let key = event.key;
        event.preventDefault();
        if(keysDownLive.has(key)){
            keysDownLive.delete(key);
            callListeners(KeyboardEventType.UP_IM, key, activeState);
        }
        if(keysDown.has(key)){
            keyUpQueue.add(key);
        }
     }
     document.addEventListener('keyup', onKeyUp);

     /**
      * Processes keypresses for DONW, UP, and HELD listeners
      */
     let processInputs = () => {
        keyDownQueue.forEach((key) => {
            if(!keysDown.has(key)){
                keysDown.add(key);
                callListeners(KeyboardEventType.DOWN, key, activeState);
            }
        });
        keyDownQueue.clear();

        keyUpQueue.forEach((key) => {
            if(keysDown.has(key)){
                keysDown.delete(key);
                callListeners(KeyboardEventType.UP, key, activeState);
            }
        });
        keyUpQueue.clear();

        keysDown.forEach((key)=>{
            callListeners(KeyboardEventType.HELD, key, activeState);
        })
     }

     return {
        registerListener: registerListener,
        removeListener: removeListener,
        processInputs: processInputs,
        /** @param {string} val */
        setState: (val)=>{keyDownQueue.clear(); keyUpQueue.clear(); keysDown.clear(); keysDownLive.clear(); activeState = val;},
     }
    
})();

export {KeyboardEventType, KeyboardListener, Input}