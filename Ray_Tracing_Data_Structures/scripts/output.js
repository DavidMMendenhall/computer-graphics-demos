// @ts-check
let output = document.createElement('div');
output.id = 'output';
document.querySelector('#screen_container')?.appendChild(output);

let Output = (() => {

    /**
     * 
     * @param {string} title 
     * @param {string} body 
     * @param {string} color 
     */
    let addMessage = (title, body, color) => {
        let div = document.createElement('div');
        let header = document.createElement('h2');
        header.innerHTML = title;
        let content = document.createElement('div');
        content.innerHTML = body;
        
        if(color){
            div.style.backgroundColor = color;
        }

        if(title){
            div.appendChild(header);
        }

        if(body){
            div.appendChild(content);
        }

        output.appendChild(div);
        output.scrollTop = output.scrollHeight - output.clientHeight;
    }

    return {
        addMessage
    }
})();

export {Output}