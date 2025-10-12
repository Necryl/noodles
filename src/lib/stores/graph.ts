const nodeTypes = {
	valueNode: {
		io: { inputs: [], outputs: [{ name: 'value', type: 'any', maxConnections: Infinity }] },
		logic: (inputs: any = [], data: any) => data.value
	},
	additionNode: {
		io: {
			inputs: [
				{ name: 'a', type: 'number', maxConnections: Infinity },
				{ name: 'b', type: 'number', maxConnections: Infinity }
			],
			outputs: [{ name: 'sum', type: 'number', maxConnections: Infinity }]
		},
		logic: (inputs: any = [], data: any) => inputs.flat().reduce((a, b) => a + b, 0)
	},
	outputNode: {
		io: { inputs: [{ name: 'input', type: 'any', maxConnections: 1 }], outputs: [] },
		logic: (inputs: any = [], data: any) => inputs[0]
	}
};

const graphStructure = new Map();
const valueCache = new Map();

const addNode = (type, id, data?) => {
	if (!nodeTypes[type]) {
		throw new Error(`Node type "${type}" is not defined.`);
	}
	const io = nodeTypes[type].io;
	const newNode = {
		id,
		type,
		data: data ? data : undefined,
		evaluated: false,
		inputs: io.inputs.length > 0 ? Array(io.inputs.length).map(() => []) : [],
		outputs: io.outputs.length > 0 ? Array(io.outputs.length).map(() => []) : []
	};

	graphStructure.set(id, newNode);
	markDirty(id);
	return newNode;
};

const removeNode = (id) => {
	const node = graphStructure.get(id);
	if (!node) {
		throw new Error(`Node with ID "${id}" not found.`);
	}

	markDirty(id);
	// Remove all edges connected to this node
	node.inputs.forEach((inputConnections, inputIndex) => {
		inputConnections.forEach((source) => {
			const sourceNode = graphStructure.get(source.id);
			if (sourceNode) {
				sourceNode.outputs[source.outputIndex] = sourceNode.outputs[source.outputIndex].filter(
					(t) => !(t.id === id && t.inputIndex === inputIndex)
				);
			}
		});
	});

	node.outputs.forEach((outputConnections, outputIndex) => {
		outputConnections.forEach((target) => {
			const targetNode = graphStructure.get(target.id);
			if (targetNode) {
				targetNode.inputs[target.inputIndex] = targetNode.inputs[target.inputIndex].filter(
					(s) => !(s.id === id && s.outputIndex === outputIndex)
				);
			}
		});
	});

	graphStructure.delete(id);
};

const updateNodeData = (id, newData) => {
	const node = graphStructure.get(id);
	if (!node) {
		throw new Error(`Node with ID "${id}" not found.`);
	}
	node.data = newData;
	markDirty(id);
};

const addEdge = (source, target) => {
	const sourceNode = graphStructure.get(source.id);
	const targetNode = graphStructure.get(target.id);
	if (!sourceNode || !targetNode) {
		throw new Error(`Invalid edge between "${source}" and "${target}".`);
	}
	// ensure maxConnections is not exceeded
	const sourceOutputDef = nodeTypes[sourceNode.type].io.outputs[source.outputIndex];
	const targetInputDef = nodeTypes[targetNode.type].io.inputs[target.inputIndex];
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
	markDirty(target.id);
	sourceNode.outputs[source.outputIndex].push(target);
	targetNode.inputs[target.inputIndex].push(source);
};

const removeEdge = (source, target) => {
	const sourceNode = graphStructure.get(source.id);
	const targetNode = graphStructure.get(target.id);
	if (!sourceNode || !targetNode) {
		throw new Error(`Invalid edge between "${source}" and "${target}".`);
	}
	sourceNode.outputs[source.outputIndex] = sourceNode.outputs[source.outputIndex].filter(
		(t) => !(t.id === target.id && t.inputIndex === target.inputIndex)
	);
	targetNode.inputs[target.inputIndex] = targetNode.inputs[target.inputIndex].filter(
		(s) => !(s.id === source.id && s.outputIndex === source.outputIndex)
	);
	markDirty(target.id);
};

const markDirty = (id, visited = new Set()) => {
	// Prevent infinite loops in cyclical graphs
	if (visited.has(id)) {
		return;
	}
	visited.add(id);

	// Mark this node as dirty
	valueCache.delete(id);
	const node = graphStructure.get(id);

	if (node) {
		node.evaluated = false;
		// ALWAYS recurse to all children unconditionally
		node.outputs.forEach((outputConnections) => {
			outputConnections.forEach((target) => {
				markDirty(target.id, visited);
			});
		});
	}
};

const evaluateNode = (id) => {
	if (valueCache.has(id)) {
		return valueCache.get(id);
	}

	const node = graphStructure.get(id);
	if (!node) {
		throw new Error(`Node with ID "${id}" not found.`);
	}

	const inputValues = node.inputs.map((inputConnections) => {
		return inputConnections.map((source) => evaluateNode(source.id));
	});

	const outputValue = nodeTypes[node.type].logic(inputValues, node.data);
	valueCache.set(id, outputValue);
	node.evaluated = true;
	return outputValue;
};
