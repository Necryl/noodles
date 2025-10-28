<script lang="ts">
	import { graphStore } from '$lib/stores/graph';
	import { nodeDefs, type GNode, type PluginDef, type NodeData } from '$lib/graph/nodeDefs';
	import { Position, type NodeProps, Handle, useEdges, type Edge } from '@xyflow/svelte';
	import InputElem from './InputElem.svelte';
	import NodeError from './NodeError.svelte';

	// --- 1. PROPS & DEFINITIONS ---
	let { id, data }: NodeProps = $props();
	const initialNode = data as unknown as GNode;
	const liveNode = $derived(() => $graphStore.graph.get(initialNode.id));
	const nodeDef = nodeDefs[initialNode.type];
	const edges = useEdges();

	const nodeValue = $derived(() => $graphStore.cache.get(id));

	// --- 2. REACTIVE STATE ---

	const isInputConnected = $derived(() => {
		const connectedMap = new Map<number, boolean>();
		for (const edge of edges.current) {
			if (edge.target === id) {
				const handleId = edge.targetHandle;
				if (handleId) {
					const index = parseInt(handleId.split('-')[1]);
					connectedMap.set(index, true);
				}
			}
		}
		return connectedMap;
	});

	const checkInputTypes = $derived(() => {
		return liveNode()?.inputs.map((socket, index) => {
			const socketType = nodeDef.io.inputs[index].type;
			return socket.reduce((verdict, source) => {
				if (source.type !== socketType && source.type !== 'any' && socketType !== 'any') {
					return false;
				}
				return verdict;
			}, true);
		});
	});

	// --- 3. ACTIONS ---

	function updateNodeValue(index: number, value: any) {
		// console.log(`Updating node value for node ${id} at index ${index} to`, value);
		// console.log('Current node before update:', liveNode());
		const node = liveNode();
		if (!node) return;

		const oldData = node.data;
		let newData: NodeData;

		const newArr = [...(oldData as any[])];
		newArr[index] = value;
		newData = newArr;

		graphStore.updateNodeData(node.id, newData as NodeData);
	}
</script>

<div class="node">
	<div class="node-title">
		<button
			class="calculate-node-btn preset-glass-primary btn"
			onclick={() => graphStore.evaluateNode(initialNode.id)}>C</button
		>
		<h6 class="node-name">{nodeDef.name}</h6>
	</div>
	{#if nodeDef.io.outputs.length === 1}
		<Handle type="source" class="handle" position={Position.Right} id={`output-0`} />
	{:else}
		{@const outputs = nodeDef.io.outputs as readonly { name: string }[]}
		{#each outputs as output, i}
			<div class="field">
				<label for={`output-${i}`}>{output.name}</label>
				<Handle type="source" class="handle" position={Position.Right} id={`output-${i}`} />
			</div>
		{/each}
	{/if}

	{#each nodeDef.io.inputs as input, i}
		{@const pluginDef = nodeDef.data?.find(
			(d) => 'type' in d && d.type === 'plugin' && 'inputIndex' in d && d.inputIndex === i
		) as PluginDef | undefined}
		<div class="field">
			{#if input.maxConnections > 0}
				<Handle type="target" class="handle" position={Position.Left} id={`input-${i}`} />
			{/if}
			<label for={`input-${i}`}>{input.name}</label>

			{#if pluginDef}
				{#if !(isInputConnected().get(i) ?? false)}
					{#if pluginDef.ui.type === 'input'}
						<InputElem
							id={`input-${i}`}
							type={'inputIndex' in pluginDef
								? nodeDef.io.inputs[pluginDef.inputIndex]?.type
								: undefined}
							defaultValue={pluginDef.defaultValue}
							nodeID={id}
							setValue={(value: any) => updateNodeValue(i, value)}
						/>
					{/if}
				{:else if input.ui.type === 'show'}
					{@const nValue = (nodeValue() as GNode)?.inputs?.[i] ?? pluginDef.defaultValue}
					{#if (typeof nValue === input.type || input.type === 'any') && checkInputTypes()?.[i]}
						<div class="input-value">{(nodeValue() as GNode)?.inputs?.[i] ?? ' '}</div>
					{:else}
						<NodeError
							details={`[Node ID:${id}][Index:${i}]`}
							message={`Input type is invalid, incoming value: ${nValue}\ntypes:\n${typeof nValue} \u2192 ${input.type}`}
						/>
					{/if}
				{/if}

				{#if 'defaultValue' in pluginDef && pluginDef.ui.type === 'display'}
					<div class="result">
						{(nodeValue() as GNode)?.outputs?.[pluginDef.inputIndex] ?? pluginDef.defaultValue}
					</div>
				{/if}
			{/if}
		</div>
	{/each}
</div>

<style>
	.input-value {
		background-color: rgb(36, 37, 51);
		color: rgb(150, 152, 168);
		border: 1px solid rgb(79, 84, 120);
		border-radius: 4px;
		min-height: 2.2rem;
		display: flex;
		align-items: center;
		padding: 0.5rem;
		overflow: auto;
		width: 100%;
	}

	.result {
		background-color: rgb(13, 16, 38);
		color: rgb(47, 190, 212);
		border: 1px solid rgb(23, 63, 145);
		border-radius: 4px;
		min-height: 4rem;
		display: flex;
		padding: 0.5rem;
		overflow: auto;
		width: 100%;
	}
</style>
