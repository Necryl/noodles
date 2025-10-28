// src/lib/stores/graph.ts

import { writable } from 'svelte/store';
import * as graphLogic from '$lib/graph/graph';
import {
	createNode,
	type GNode,
	type NodeDef,
	type NodeData,
	type EdgeSource,
	type EdgeTarget
} from '$lib/graph/nodeDefs';

const latestID = writable(0);

export function getNextID() {
	let id: number;
	latestID.update((n) => {
		id = n + 1;
		return id;
	});
	return `N${id!}`;
}

// Define the shape of our state
export interface GraphState {
	graph: Map<string, GNode>;
	cache: Map<string, unknown>;
}

export interface GraphStore {
	subscribe: (
		run: (value: GraphState) => void,
		invalidate?: (value?: GraphState) => void
	) => () => void;
	addNode: (type: NodeDef, id: string, data?: NodeData) => GNode;
	removeNode: (id: string) => void;
	updateNodeData: (id: string, newData: NodeData) => void;
	addEdge: (source: EdgeSource, target: EdgeTarget) => void;
	removeEdge: (source: EdgeSource, target: EdgeTarget) => void;
	evaluateNode: (id: string) => unknown;
}

// The function that creates our custom store
function createGraphStore(): GraphStore {
	// 1. Create an internal, writable store with our default state.
	const { subscribe, update } = writable<GraphState>({
		graph: new Map(),
		cache: new Map()
	});

	// 2. Return the public interface for our store.
	return {
		// Make it a readable store by exposing subscribe.
		subscribe,

		// --- Actions ---

		/**
		 * Creates and adds a new node to the graph.
		 */
		addNode: (type: NodeDef, id: string, data?: NodeData) => {
			const newNode = createNode(type, id, data);
			update((state) => {
				const newGraph = graphLogic.addNode(state.graph, newNode);
				// No cache change is needed when adding a disconnected node.
				return { graph: newGraph, cache: state.cache };
			});
			return newNode;
		},

		/**
		 * Removes a node and its connections from the graph.
		 */
		removeNode: (id: string) => {
			update((state) => {
				const nodeToDelete = state.graph.get(id);

				// If the node doesn't exist, do nothing.
				if (!nodeToDelete) {
					return state;
				}

				const { newGraph, dirtyNodes } = graphLogic.removeNode(state.graph, id);

				let newCache = state.cache;
				dirtyNodes.forEach((dirtyNodeId) => {
					newCache = graphLogic.markDirty(newGraph, newCache, dirtyNodeId);
				});

				newCache.delete(id);

				return { graph: newGraph, cache: newCache };
			});
		},
		/**
		 * Updates the data payload of a specific node.
		 */
		updateNodeData: (id: string, newData: NodeData) => {
			update((state) => {
				const newGraph = graphLogic.updateNodeData(state.graph, id, newData);
				const newCache = graphLogic.markDirty(newGraph, state.cache, id);
				// console.log(`Updated node data for node id: ${id}`);
				// console.log('Updated node data, new graph:', newGraph, 'new cache:', newCache);
				return { graph: newGraph, cache: newCache };
			});
		},

		/**
		 * Adds an edge between two nodes.
		 */
		addEdge: (source: EdgeSource, target: EdgeTarget) => {
			update((state) => {
				const newGraph = graphLogic.addEdge(state.graph, source, target);
				const newCache = graphLogic.markDirty(newGraph, state.cache, target.id);
				return { graph: newGraph, cache: newCache };
			});
		},

		/**
		 * Removes an edge between two nodes.
		 */
		removeEdge: (source: EdgeSource, target: EdgeTarget) => {
			update((state) => {
				const newGraph = graphLogic.removeEdge(state.graph, source, target);
				const newCache = graphLogic.markDirty(newGraph, state.cache, target.id);
				return { graph: newGraph, cache: newCache };
			});
		},

		/**
		 * Evaluates a node and updates the cache. Returns the computed value.
		 */
		evaluateNode: (id: string): unknown => {
			// console.log(`evaluating node id: ${id}`);
			let finalValue: unknown;
			update((state) => {
				// This pure function returns both the value and the new cache state.
				const { value, newCache } = graphLogic.evaluateNode(state.graph, state.cache, id);
				finalValue = value;
				// We only need to update the cache. The graph structure is unchanged.
				// console.log(`evaluated node id: ${id}, value: ${JSON.stringify(value)}`);
				// console.log('new cache:', newCache);
				return { graph: state.graph, cache: newCache };
			});
			return finalValue;
		}
	};
}

// 3. Export a single instance of the store for the app to use.
export const graphStore = createGraphStore();
