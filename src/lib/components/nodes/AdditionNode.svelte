<script lang="ts">
	import {
		Position,
		useSvelteFlow,
		type NodeProps,
		Handle,
		useEdges,
		type Node,
		type Edge
	} from '@xyflow/svelte';

	type NodeData = {
		a: number;
		b: number;
		result: number;
	};

	export const nodeIO = () => {
		return {
			inputs: 2,
			outputs: 1
		};
	};

	// Props and SvelteFlow hooks
	let { id, data }: NodeProps<Node<NodeData>> = $props();
	const { updateNodeData } = useSvelteFlow();
	const edges = useEdges();

	// --- State and Logic ---

	// Determine if input handles are connected to an edge
	const isHandleAConnected = $derived(
		edges.current.some((edge: Edge) => edge.target === id && edge.targetHandle === 'a')
	);
	const isHandleBConnected = $derived(
		edges.current.some((edge: Edge) => edge.target === id && edge.targetHandle === 'b')
	);

	// Reactive calculation of the sum.
	// Defaults to 0 if data properties are undefined and ensures numeric addition.
	const sum = $derived((data.a ?? 0) + (data.b ?? 0));

	// Effect to update the node's data object with the new sum whenever it changes.
	// This makes the result available to the source handle for other nodes.
	$effect(() => {
		if (data.result !== sum) {
			updateNodeData(id, { result: sum });
		}
	});
</script>

<div class="addition-node node">
	<Handle type="target" position={Position.Left} id="a" style="top: 30px;" />
	<Handle type="target" position={Position.Left} id="b" style="top: 82px;" />
	<h6 class="node-name">Addition</h6>

	<div class="field">
		<label for="input-a" class="label">Input A</label>
		<input
			id="input-a"
			type="number"
			value={data.a ?? 0}
			oninput={(evt) => updateNodeData(id, { a: evt.currentTarget.valueAsNumber || 0 })}
			class="nodrag input"
			disabled={isHandleAConnected}
		/>
	</div>

	<div class="field">
		<label for="input-b" class="label">Input B</label>
		<input
			id="input-b"
			type="number"
			class="nodrag input"
			value={data.b ?? 0}
			oninput={(evt) => updateNodeData(id, { b: evt.currentTarget.valueAsNumber || 0 })}
			disabled={isHandleBConnected}
		/>
	</div>

	<hr />

	<div class="field">
		<label for="result">Result</label>
		<div id="result" class="result">
			{sum}
		</div>
	</div>

	<Handle type="source" position={Position.Right} id="result-output" />
</div>

<style>
</style>
