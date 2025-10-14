import type { GNode, NodeData, EdgeSource, EdgeTarget } from './nodeDefs';

// Your nodeDefs definition remains the same...
import { nodeDefs } from './nodeDefs';

export const addNode = (graph: Map<string, GNode>, node: GNode) => {
	const newGraph = new Map(graph);
	newGraph.set(node.id, node);
	return newGraph;
};

export const removeNode = (graph: Map<string, GNode>, id: string) => {
	const newGraph = new Map(graph);
	const node = newGraph.get(id);
	if (!node) {
		throw new Error(`Node with ID "${id}" not found.`);
	}

	const dirtyNodes = node.outputs.flat().map((target) => target.id);

	let neighbourNodes = new Set<string>();
	node.inputs.flat().forEach((source) => neighbourNodes.add(source.id));
	node.outputs.flat().forEach((target) => neighbourNodes.add(target.id));
	neighbourNodes.forEach((neighbourID) => {
		const neighbourNode = { ...(newGraph.get(neighbourID) as GNode) };
		neighbourNode.inputs = neighbourNode.inputs.map((connection) =>
			connection.filter((source) => source.id != id)
		);
		neighbourNode.outputs = neighbourNode.outputs.map((connection) =>
			connection.filter((target) => target.id != id)
		);
		newGraph.set(neighbourID, neighbourNode);
	});
	newGraph.delete(id);
	return { newGraph, dirtyNodes };
};

export const updateNodeData = (graph: Map<string, GNode>, id: string, newData: NodeData) => {
	const newGraph = new Map(graph);
	const node = { ...(newGraph.get(id) as GNode) };
	if (!node) {
		throw new Error(`Node with ID "${id}" not found.`);
	}
	node.data = newData as NodeData;
	newGraph.set(id, node);
	return newGraph;
};

export const addEdge = (graph: Map<string, GNode>, source: EdgeSource, target: EdgeTarget) => {
	const newGraph = new Map(graph);
	const sourceNode = { ...(newGraph.get(source.id) as GNode) };
	const targetNode = { ...(newGraph.get(target.id) as GNode) };
	if (!sourceNode || !targetNode) {
		throw new Error(`Invalid edge between "${source}" and "${target}".`);
	}
	// ensure maxConnections is not exceeded
	const sourceOutputDef = nodeDefs[sourceNode.type].io.outputs[source.outputIndex];
	const targetInputDef = nodeDefs[targetNode.type].io.inputs[target.inputIndex];
	if (
		sourceOutputDef &&
		sourceNode.outputs[source.outputIndex].length >= sourceOutputDef.maxConnections
	) {
		throw new Error(
			`Source node "${source.id}" output index "${source.outputIndex}" has reached its maximum connections.`
		);
	}
	if (
		targetInputDef &&
		targetNode.inputs[target.inputIndex].length >= targetInputDef.maxConnections
	) {
		throw new Error(
			`Target node "${target.id}" input index "${target.inputIndex}" has reached its maximum connections.`
		);
	}
	// ensure no duplicate edges
	if (
		sourceNode.outputs[source.outputIndex].some(
			(t) => t.id === target.id && t.inputIndex === target.inputIndex
		)
	) {
		throw new Error(
			`An edge from "${source.id}" output index "${source.outputIndex}" to "${target.id}" input index "${target.inputIndex}" already exists.`
		);
	}
	//ensure no self-loops
	if (source.id === target.id) {
		throw new Error(`Self-loops are not allowed: "${source.id}" cannot connect to itself.`);
	}
	// ensure type compatibility
	if (
		sourceOutputDef &&
		targetInputDef &&
		sourceOutputDef.type !== targetInputDef.type &&
		targetInputDef.type !== 'any'
	) {
		throw new Error(
			`Type mismatch: Cannot connect output type "${sourceOutputDef.type}" to input type "${targetInputDef.type}".`
		);
	}

	// Add the edge
	sourceNode.outputs = [...sourceNode.outputs];
	targetNode.inputs = [...targetNode.inputs];
	sourceNode.outputs[source.outputIndex] = [...sourceNode.outputs[source.outputIndex], target];
	targetNode.inputs[target.inputIndex] = [...targetNode.inputs[target.inputIndex], source];
	newGraph.set(source.id, sourceNode);
	newGraph.set(target.id, targetNode);
	return newGraph;
};

export const removeEdge = (graph: Map<string, GNode>, source: EdgeSource, target: EdgeTarget) => {
	const newGraph = new Map(graph);
	const sourceNode = { ...(newGraph.get(source.id) as GNode) };
	const targetNode = { ...(newGraph.get(target.id) as GNode) };
	if (!sourceNode || !targetNode) {
		throw new Error(`Invalid edge between "${source}" and "${target}".`);
	}
	sourceNode.outputs = [...sourceNode.outputs];
	sourceNode.outputs[source.outputIndex] = sourceNode.outputs[source.outputIndex].filter(
		(t) => !(t.id === target.id && t.inputIndex === target.inputIndex)
	);
	targetNode.inputs = [...targetNode.inputs];
	targetNode.inputs[target.inputIndex] = targetNode.inputs[target.inputIndex].filter(
		(s) => !(s.id === source.id && s.outputIndex === source.outputIndex)
	);
	newGraph.set(source.id, sourceNode);
	newGraph.set(target.id, targetNode);
	return newGraph;
};

export const markDirty = (
	graph: Map<string, GNode>,
	cache: Map<string, unknown>,
	id: string,
	visited = new Set<string>()
): Map<string, unknown> => {
	// Prevent infinite loops in cyclical graphs
	if (visited.has(id)) {
		return cache;
	}
	let newCache = new Map(cache);
	visited.add(id);

	// Mark this node as dirty
	newCache.delete(id);
	const node = graph.get(id);

	if (node) {
		// ALWAYS recurse to all children unconditionally
		node.outputs.forEach((outputConnections) => {
			outputConnections.forEach((target) => {
				newCache = markDirty(graph, newCache, target.id, visited);
			});
		});
	}
	return newCache;
};

export const evaluateNode = (
	graph: Map<string, GNode>,
	cache: Map<string, unknown>,
	id: string
): { value: unknown; newCache: Map<string, unknown> } => {
	if (cache.has(id)) {
		return { value: cache.get(id), newCache: cache };
	}

	const node = graph.get(id);
	if (!node) {
		throw new Error(`Node with ID "${id}" not found.`);
	}

	let newCache = new Map(cache);
	const inputValues = node.inputs.map((inputConnections) => {
		return inputConnections.map((source) => {
			const result = evaluateNode(graph, newCache, source.id);
			newCache = result.newCache;
			return result.value;
		});
	});

	const outputValue = (
		nodeDefs[node.type].logic as (inputs: unknown[], data: NodeData | undefined) => unknown
	)(inputValues as unknown[], node.data);

	newCache.set(id, outputValue);
	return { value: outputValue, newCache: newCache };
};
