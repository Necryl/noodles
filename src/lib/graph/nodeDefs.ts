export interface InputConnection {
	id: string;
	outputIndex: number;
}

export interface OutputConnection {
	id: string;
	inputIndex: number;
}

export interface BaseNode {
	id: string;
	inputs: InputConnection[][];
	outputs: OutputConnection[][];
}

export const nodeDefs = {
	valueNode: {
		name: 'Value',
		io: { inputs: [], outputs: [{ name: 'value', type: 'string', maxConnections: Infinity }] },
		data: [{ name: 'value', type: 'string', ui: { type: 'input' }, defaultValue: '' }],
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: never[] = [], data: [{ value: string }]) => data[0].value,
		defaultData: (): [{ value: string }] => [{ value: '' }]
	},
	additionNode: {
		name: 'Addition',
		io: {
			inputs: [
				{ name: 'a', type: 'number', ui: { type: 'none' }, maxConnections: Infinity },
				{ name: 'b', type: 'number', ui: { type: 'none' }, maxConnections: Infinity }
			],
			outputs: [{ name: 'sum', type: 'number', maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input' }, defaultValue: 0 },
			{ type: 'plugin', inputIndex: 1, ui: { type: 'input' }, defaultValue: 0 }
		],
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: number[][] = [], data: []) =>
			inputs.flat().reduce((a: number, b: number) => a + b, 0),
		defaultData: (): [] => []
	},
	outputNode: {
		name: 'Output',
		io: {
			inputs: [{ name: 'input', type: 'any', ui: { type: 'none' }, maxConnections: 1 }],
			outputs: []
		},
		data: [
			{
				type: 'plugin',
				inputIndex: 0,
				ui: { type: 'display', options: ['error'] },
				defaultValue: 'No input'
			}
		],
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: unknown[] = [], data: []) => inputs[0],
		defaultData: (): [] => []
	}
} as const;

export type NodeDef = keyof typeof nodeDefs;

type NodeLogicData<T extends NodeDef> = Parameters<(typeof nodeDefs)[T]['logic']>[1];

export type GNode = {
	[K in NodeDef]: BaseNode & {
		type: K;
		data: NodeLogicData<K>;
	};
}[NodeDef];

export type PluginDef = {
	type: 'plugin';
	inputIndex: number;
	ui: { type: 'input' | 'display'; options?: readonly string[] };
	defaultValue: unknown;
};

export type NodeData = GNode['data'];

export interface EdgeSource {
	id: string;
	outputIndex: number;
}

export interface EdgeTarget {
	id: string;
	inputIndex: number;
}

export const createNode = <T extends NodeDef>(
	type: T,
	id: string,
	data?: NodeLogicData<T>
): GNode => {
	const def = nodeDefs[type];

	const baseNode: BaseNode = {
		id,
		inputs: Array.from({ length: def.io.inputs.length }, () => []),
		outputs: Array.from({ length: def.io.outputs.length }, () => [])
	};

	const node = {
		...baseNode,
		type,
		data: data ?? def.defaultData()
	};

	return node as GNode;
};
