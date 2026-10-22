/**
 * Estado mínimo observável: cada mudança notifica as views inscritas,
 * que se redesenham a partir do estado (fonte única da verdade na página).
 *
 * @template T
 * @param {T} initialState
 */
export function createStore(initialState) {
    let state = initialState;
    const listeners = new Set();

    return {
        /** @returns {T} */
        getState: () => state,

        /** @param {Partial<T> | ((state: T) => Partial<T>)} patch */
        setState(patch) {
            state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
            listeners.forEach((listener) => listener(state));
        },

        /** @param {(state: T) => void} listener @returns {() => void} */
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
