export interface InputConnection {
	id: string;
	outputIndex: number;
	type: string;
}

export interface OutputConnection {
	id: string;
	inputIndex: number;
	type: string;
}

export interface BaseNode {
	id: string;
	inputs: InputConnection[][];
	outputs: OutputConnection[][];
}

export interface NodeValueCache {
	inputs: any[];
	outputs: any[];
}

export const nodeDefs = {
	numberNode: {
		name: 'Number',
		io: {
			inputs: [
				{ name: 'value', type: 'number', ui: { type: 'none', showName: false }, maxConnections: 0 }
			],
			outputs: [{ name: 'value', type: 'number', showName: true, maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input', showName: false }, defaultValue: 0 }
		],
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: never[] = [], datas: (string | number | boolean)[]): NodeValueCache => {
			return { inputs: [], outputs: [datas[0]] };
		},
		defaultData: (): (string | number | boolean)[] => [0]
	},
	stringNode: {
		name: 'String',
		io: {
			inputs: [
				{ name: 'value', type: 'string', ui: { type: 'none', showName: false }, maxConnections: 0 }
			],
			outputs: [{ name: 'value', type: 'string', showName: true, maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input', showName: false }, defaultValue: '' }
		],
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: never[] = [], datas: (string | number | boolean)[]): NodeValueCache => {
			return { inputs: [], outputs: [datas[0]] };
		},
		defaultData: (): (string | number | boolean)[] => ['']
	},
	additionNode: {
		name: 'Add',
		io: {
			inputs: [
				{ name: 'a', type: 'any', ui: { type: 'show', showName: false }, maxConnections: 1 },
				{ name: 'b', type: 'any', ui: { type: 'show', showName: false }, maxConnections: 1 }
			],
			outputs: [{ name: 'sum', type: 'any', showName: true, maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input', showName: false }, defaultValue: 0 },
			{ type: 'plugin', inputIndex: 1, ui: { type: 'input', showName: false }, defaultValue: 0 }
		],
		logic: (
			inputs: (number | string | boolean)[][] = [],
			datas: (number | string | boolean)[] = []
		): NodeValueCache => {
			// console.log('addition node inputs:', inputs);
			// console.log('addition node datas:', datas);
			const inputA = inputs[0];
			const inputB = inputs[1];
			const dataA = Number(datas[0]) || datas[0];
			const dataB = Number(datas[1]) || datas[1];

			function sumValues(
				acc: number | string | boolean | null,
				val: number | string | boolean | null
			) {
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
			}

			const inputValues = [
				inputA.length > 0 ? inputA : [dataA],
				inputB.length > 0 ? inputB : [dataB]
			].map((inputSocket) => inputSocket.reduce(sumValues, null));
			const outputValue = sumValues(inputValues[0], inputValues[1]);
			return { inputs: inputValues, outputs: [outputValue] };
		},
		defaultData: (): (number | string | boolean)[] => [0, 0]
	},
	subractionNode: {
		name: 'Subtract',
		io: {
			inputs: [
				{ name: 'a', type: 'number', ui: { type: 'show', showName: false }, maxConnections: 1 },
				{ name: 'b', type: 'number', ui: { type: 'show', showName: false }, maxConnections: 1 }
			],
			outputs: [{ name: 'sum', type: 'any', showName: true, maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input', showName: false }, defaultValue: 0 },
			{ type: 'plugin', inputIndex: 1, ui: { type: 'input', showName: false }, defaultValue: 0 }
		],
		logic: (inputs: number[][] = [], datas: number[] = []): NodeValueCache => {
			// console.log('subtraction node inputs:', inputs);
			// console.log('subtraction node datas:', datas);
			const inputA = inputs[0];
			const inputB = inputs[1];
			const dataA = datas[0];
			const dataB = datas[1];

			function subtractValues(acc: number | null, val: number | null) {
				if (val === null) {
					return acc;
				} else if (acc === null) {
					return val;
				}
				return acc - val;
			}

			const inputValues = [
				inputA.length > 0 ? inputA : [dataA],
				inputB.length > 0 ? inputB : [dataB]
			].map((inputSocket) => inputSocket.reduce(subtractValues, null));
			const outputValue = subtractValues(inputValues[0], inputValues[1]);
			return { inputs: inputValues, outputs: [outputValue] };
		},
		defaultData: (): number[] => [0, 0]
	},
	multiplicationNode: {
		name: 'Multiply',
		io: {
			inputs: [
				{ name: 'a', type: 'number', ui: { type: 'show', showName: false }, maxConnections: 1 },
				{ name: 'b', type: 'number', ui: { type: 'show', showName: false }, maxConnections: 1 }
			],
			outputs: [{ name: 'sum', type: 'any', showName: true, maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input', showName: false }, defaultValue: 0 },
			{ type: 'plugin', inputIndex: 1, ui: { type: 'input', showName: false }, defaultValue: 0 }
		],
		logic: (inputs: number[][] = [], datas: number[] = []): NodeValueCache => {
			// console.log('subtraction node inputs:', inputs);
			// console.log('subtraction node datas:', datas);
			const inputA = inputs[0];
			const inputB = inputs[1];
			const dataA = datas[0];
			const dataB = datas[1];

			function subtractValues(acc: number | null, val: number | null) {
				if (val === null) {
					return acc;
				} else if (acc === null) {
					return val;
				}
				return acc * val;
			}

			const inputValues = [
				inputA.length > 0 ? inputA : [dataA],
				inputB.length > 0 ? inputB : [dataB]
			].map((inputSocket) => inputSocket.reduce(subtractValues, null));
			const outputValue = subtractValues(inputValues[0], inputValues[1]);
			return { inputs: inputValues, outputs: [outputValue] };
		},
		defaultData: (): number[] => [0, 0]
	},
	divisionNode: {
		name: 'Divide',
		io: {
			inputs: [
				{ name: 'a', type: 'number', ui: { type: 'show', showName: false }, maxConnections: 1 },
				{ name: 'b', type: 'number', ui: { type: 'show', showName: false }, maxConnections: 1 }
			],
			outputs: [{ name: 'sum', type: 'any', showName: true, maxConnections: Infinity }]
		},
		data: [
			{ type: 'plugin', inputIndex: 0, ui: { type: 'input', showName: false }, defaultValue: 0 },
			{ type: 'plugin', inputIndex: 1, ui: { type: 'input', showName: false }, defaultValue: 0 }
		],
		logic: (inputs: number[][] = [], datas: number[] = []): NodeValueCache => {
			// console.log('subtraction node inputs:', inputs);
			// console.log('subtraction node datas:', datas);
			const inputA = inputs[0];
			const inputB = inputs[1];
			const dataA = datas[0];
			const dataB = datas[1];

			function subtractValues(acc: number | null, val: number | null) {
				if (val === null) {
					return acc;
				} else if (acc === null) {
					return val;
				}
				return acc / val;
			}

			const inputValues = [
				inputA.length > 0 ? inputA : [dataA],
				inputB.length > 0 ? inputB : [dataB]
			].map((inputSocket) => inputSocket.reduce(subtractValues, null));
			const outputValue = subtractValues(inputValues[0], inputValues[1]);
			return { inputs: inputValues, outputs: [outputValue] };
		},
		defaultData: (): number[] => [0, 0]
	},

	outputNode: {
		name: 'Output',
		io: {
			inputs: [
				{ name: 'input', type: 'any', ui: { type: 'none', showName: false }, maxConnections: 1 }
			],
			outputs: []
		},
		data: [
			{
				type: 'plugin',
				inputIndex: 0,
				ui: { type: 'display', showName: false },
				defaultValue: ' '
			}
		],

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		logic: (inputs: any[] = [], datas: []): NodeValueCache => {
			// console.log('output node inputs:', inputs);
			// console.log('output node datas:', datas);
			return { inputs: [...inputs], outputs: inputs[0] };
		},
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
	type: string;
}

export interface EdgeTarget {
	id: string;
	inputIndex: number;
	type: string;
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
