// contextStore.js

const contextElementStore = {};

export function addOrUpdateContextElements(elements) {
    for (const elem of elements) {
        contextElementStore[elem.id] = elem;
    }
}

export function getContextElementById(id) {
    return contextElementStore[id];
}

export function getAllContextElements() {
    return Object.values(contextElementStore);
} 