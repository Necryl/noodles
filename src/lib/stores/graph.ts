import { writable, get } from 'svelte/store';
import type { GraphEngine } from '$lib/wasm/wasm_lib';


// Define the shape of the NodeSchema we get from WASM
export interface NodeSchema {
    name: string;
    io: {
        inputs: Array<{
            name: string;
            type: string;
            ui: { type: string; showName: boolean };
            maxConnections: number;
        }>;
        outputs: Array<{
            name: string;
            type: string;
            ui: { type: string; showName: boolean };
            maxConnections: number;
        }>;
    };
    data: Array<{
        type: string;
        inputIndex: number;
        ui: { type: string; showName: boolean; options?: string[] };
        defaultValue: any;
    }>;
    autoEvaluateOnConnect: boolean;
}

// We still need GNode/BaseNode types for UI state, but they should now be generic
export interface GNode {
    id: string;
    type: string;
    data: any[]; // Now generic, schema validates it
    inputs: Array<Array<{ id: string; outputIndex: number; type: string }>>;
    outputs: Array<Array<{ id: string; inputIndex: number; type: string }>>;
}

export interface NodeData {
    [key: string]: any;
}

export interface NodeValueCache {
    inputs: any[];
    outputs: any[];
}

export interface GraphState {
    graph: Map<string, GNode>;
    cache: Map<string, any>;
    engine: GraphEngine | null;
    nodeDefinitions: Map<string, NodeSchema>; // New: Store definitions from WASM
}

function createGraphStore() {
    const { subscribe, set, update } = writable<GraphState>({
        graph: new Map(),
        cache: new Map(),
        engine: null,
        nodeDefinitions: new Map()
    });

    let wasm: typeof import('$lib/wasm/wasm_lib') | null = null;
    let engine: GraphEngine | null = null;

    const initPromise = (async () => {
        if (typeof window !== 'undefined') {
            wasm = await import('$lib/wasm/wasm_lib');
            // Safely check for default init function if it's exported
            if ((wasm as any).default && typeof (wasm as any).default === 'function') {
                await (wasm as any).default();
            }
            engine = new wasm.GraphEngine();

            // Allow time for engine to settle? No, synchronous.
            // Fetch definitions immediately
            let defsMap = new Map<string, NodeSchema>();
            try {
                const defs = engine.get_node_defs();
                // defs is a Map<string, NodeSchema>
                if (defs instanceof Map) {
                    defsMap = defs;
                } else {
                    // serde-wasm-bindgen map becomes object or Map depending on config.
                    // Usually Object for string keys unless configured otherwise.
                    // Let's assume Object and convert
                    for (const [k, v] of Object.entries(defs)) {
                        defsMap.set(k, v as NodeSchema);
                    }
                }
            } catch (e) {
                console.error("Failed to load node definitions from WASM:", e);
            }

            update(state => ({ ...state, engine, nodeDefinitions: defsMap }));
            console.log("GraphEngine initialized, loaded definitions:", defsMap.size);
        }
    })();

    return {
        subscribe,
        init: () => initPromise,

        addNode: async (node: GNode) => {
            await initPromise;
            if (!engine || !wasm) return;

            try {
                // Add to WASM
                engine.add_node(node.id, node.type, node.data);

                // Update local state for UI
                update(state => {
                    const newGraph = new Map(state.graph);
                    newGraph.set(node.id, node);
                    return { ...state, graph: newGraph };
                });
            } catch (e) {
                console.error("Failed to add node:", e);
            }
        },

        removeNode: async (id: string) => {
            await initPromise;
            if (!engine) return;

            try {
                const dirty = engine.remove_node(id) as unknown as string[];
                update(state => {
                    const newGraph = new Map(state.graph);
                    newGraph.delete(id);
                    // Also remove edges from neighbors in UI state to match WASM cleanup
                    for (const [nid, node] of newGraph) {
                        node.inputs = node.inputs.map(socket => socket.filter(c => c.id !== id));
                        node.outputs = node.outputs.map(socket => socket.filter(c => c.id !== id));
                    }

                    const newCache = new Map(state.cache);
                    if (Array.isArray(dirty)) {
                        dirty.forEach(d => newCache.delete(d));
                    }

                    return { ...state, graph: newGraph, cache: newCache };
                });
            } catch (e) {
                console.error("Failed to remove node:", e);
            }
        },

        addEdge: async (sourceId: string, sourceOutputIndex: number, targetId: string, targetInputIndex: number) => {
            await initPromise;
            if (!engine) return;

            try {
                const dirty = engine.add_edge(sourceId, sourceOutputIndex, targetId, targetInputIndex) as unknown as string[];
                update(state => {
                    const newGraph = new Map(state.graph);
                    const source = newGraph.get(sourceId);
                    const target = newGraph.get(targetId);
                    if (source && target) {
                        source.outputs[sourceOutputIndex] = [...source.outputs[sourceOutputIndex], { id: targetId, inputIndex: targetInputIndex, type: 'any' }];
                        target.inputs[targetInputIndex] = [...target.inputs[targetInputIndex], { id: sourceId, outputIndex: sourceOutputIndex, type: 'any' }];
                    }

                    const newCache = new Map(state.cache);
                    if (Array.isArray(dirty)) {
                        dirty.forEach(d => newCache.delete(d));
                    }

                    return { ...state, graph: newGraph, cache: newCache };
                });
            } catch (e) {
                console.error("Failed to add edge:", e);
                throw e;
            }
        },

        removeEdge: async (sourceId: string, sourceOutputIndex: number, targetId: string, targetInputIndex: number) => {
            await initPromise;
            if (!engine) return;

            try {
                const dirty = engine.remove_edge(sourceId, sourceOutputIndex, targetId, targetInputIndex) as unknown as string[];
                update(state => {
                    const newGraph = new Map(state.graph);
                    const source = newGraph.get(sourceId);
                    const target = newGraph.get(targetId);
                    if (source && target) {
                        source.outputs[sourceOutputIndex] = source.outputs[sourceOutputIndex].filter(c => !(c.id === targetId && c.inputIndex === targetInputIndex));
                        target.inputs[targetInputIndex] = target.inputs[targetInputIndex].filter(c => !(c.id === sourceId && c.outputIndex === sourceOutputIndex));
                    }

                    const newCache = new Map(state.cache);
                    if (Array.isArray(dirty)) {
                        dirty.forEach(d => newCache.delete(d));
                    }

                    return { ...state, graph: newGraph, cache: newCache };
                });
            } catch (e) {
                console.error("Failed to remove edge:", e);
            }
        },

        updateNodeData: async (id: string, data: NodeData) => {
            await initPromise;
            if (!engine) return;

            try {
                const dirty = engine.update_node_data(id, data) as unknown as string[];
                update(state => {
                    const newGraph = new Map(state.graph);
                    const node = newGraph.get(id);
                    if (node) {
                        node.data = data as any;
                    }

                    const newCache = new Map(state.cache);
                    if (Array.isArray(dirty)) {
                        dirty.forEach(d => newCache.delete(d));
                    }

                    return { ...state, graph: newGraph, cache: newCache };
                });
            } catch (e) {
                console.error("Failed to update node data:", e);
            }
        },

        evaluateNode: async (id: string) => {
            await initPromise;
            if (!engine) return null;
            try {
                const resultMap = engine.evaluate_node(id) as unknown as Record<string, any>;
                console.log(`Evaluated node ${id}, trace:`, resultMap);

                const result = resultMap[id]; // The target node result is in the map

                update(state => {
                    const newCache = new Map(state.cache);

                    // Update all computed nodes in the map
                    if (resultMap instanceof Map) {
                        for (const [key, value] of resultMap.entries()) {
                            newCache.set(key, value);
                        }
                    } else {
                        // Fallback for Object
                        for (const [key, value] of Object.entries(resultMap)) {
                            newCache.set(key, value);
                        }
                    }

                    return { ...state, cache: newCache };
                });

                return result;
            } catch (e) {
                console.error("Evaluation failed:", e);
                return null;
            }
        }
    };
}

export const graphStore = createGraphStore();
export const getNextID = () => crypto.randomUUID().slice(0, 8);
