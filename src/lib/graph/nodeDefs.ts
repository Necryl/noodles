export type NodeDef = keyof typeof nodeDefs;

export interface ValueNodeData {
	value: unknown;
}

export type NodeData = ValueNodeData;

export interface BaseNode {
	id: string;
	inputs: { id: string; outputIndex: number }[][];
	outputs: { id: string; inputIndex: number }[][];
}

export interface ValueNode extends BaseNode {
	type: 'valueNode';
	data: ValueNodeData;
}

export interface AdditionNode extends BaseNode {
	type: 'additionNode';
	data?: undefined;
}

export interface OutputNode extends BaseNode {
	type: 'outputNode';
	data?: undefined;
}

export type GNode = ValueNode | AdditionNode | OutputNode;

export interface EdgeSource {
	id: string;
	outputIndex: number;
}

export interface EdgeTarget {
	id: string;
	inputIndex: number;
}

export const nodeDefs = {
	valueNode: {
		name: 'Value',
		io: { inputs: [], outputs: [{ name: 'value', type: 'any', maxConnections: Infinity }] },
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: never[] = [], data: ValueNodeData) => data.value
	},
	additionNode: {
		name: 'Addition',
		io: {
			inputs: [
				{ name: 'a', type: 'number', maxConnections: Infinity },
				{ name: 'b', type: 'number', maxConnections: Infinity }
			],
			outputs: [{ name: 'sum', type: 'number', maxConnections: Infinity }]
		},
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: number[][] = [], data: undefined) =>
			inputs.flat().reduce((a: number, b: number) => a + b, 0)
	},
	outputNode: {
		name: 'Output',
		io: { inputs: [{ name: 'input', type: 'any', maxConnections: 1 }], outputs: [] },
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: unknown[] = [], data: undefined) => inputs[0]
	}
};

export const createNode = (type: NodeDef, id: string, data?: NodeData): GNode => {
	const io = nodeDefs[type].io;

	const baseNode: BaseNode = {
		id,
		inputs: Array.from({ length: io.inputs.length }, () => []),
		outputs: Array.from({ length: io.outputs.length }, () => [])
	};

	let newNode: GNode;

	switch (type) {
		case 'valueNode':
			newNode = { ...baseNode, type, data: data as ValueNodeData };
			break;
		case 'additionNode':
			newNode = { ...baseNode, type };
			break;
		case 'outputNode':
			newNode = { ...baseNode, type };
			break;
		default:
			const _exhaustive: never = type;
			throw new Error(`Unhandled node type: ${_exhaustive}`);
	}

	return newNode;
};
