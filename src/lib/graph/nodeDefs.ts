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
				{ name: 'a', type: 'any', ui: { type: 'none' }, maxConnections: Infinity },
				{ name: 'b', type: 'any', ui: { type: 'none' }, maxConnections: Infinity }
			],
			outputs: [{ name: 'sum', type: 'any', maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input' }, defaultValue: 0 },
			{ type: 'plugin', inputIndex: 1, ui: { type: 'input' }, defaultValue: 0 }
		],
		logic: (
			inputs: (number | string | boolean)[][] = [],
			data: (number | string | boolean)[] = []
		) => {
			const inputA = inputs[0];
			const inputB = inputs[1];
			const dataA = data[0] || null;
			const dataB = data[1] || null;

			return [...(inputA.length > 0 ? inputA : [dataA]), ...(inputB.length > 0 ? inputB : [dataB])]
				.flat()
				.reduce((acc, val) => {
					if (val === null) {
						return acc;
					} else if (acc === null) {
						return val;
					} else if (typeof acc === 'boolean' || typeof val === 'boolean') {
						return Number(acc) + Number(val);
					}
					if (typeof acc === 'number' && typeof val === 'number') {
						return acc + val;
					} else {
						return String(acc) + String(val);
					}
				});
		},
		defaultData: (): (number | string | boolean)[] => []
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
