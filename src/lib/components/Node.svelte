<script lang="ts">
	import { graphStore } from '$lib/stores/graph';
	import {
		nodeDefs,
		type GNode,
		type PluginDef,
		type NodeData,
		type NodeValueCache
	} from '$lib/graph/nodeDefs';
	import { Position, type NodeProps, Handle, useEdges } from '@xyflow/svelte';
	import InputElem from './InputElem.svelte';
	import NodeError from './NodeError.svelte';

	// --- 1. PROPS & DEFINITIONS ---
	let { id, data }: NodeProps = $props();
	const initialNode = data as unknown as GNode;
	const liveNode = $derived(() => $graphStore.graph.get(initialNode.id));
	const nodeDef = nodeDefs[initialNode.type];
	const edges = useEdges();

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

	const status = $derived(() => {
		console.log(`[Status Calc] Node ${id} cache:`, $graphStore.cache.get(id));
		let status = { node: 'pending', inputs: [] as boolean[] };
		const values = nodeValue() as NodeValueCache | undefined;
		const inputTypes = nodeDef.io.inputs.map((socket) => socket.type);
		const connected = isInputConnected();

		if (
			!(!values || !values.inputs || (values.inputs.length === 0 && values.outputs.length === 0))
		) {
			if (
				!values.inputs.reduce((verdict: boolean, curr: any, index: number) => {
					// Skip validation if input is not connected (rely on plugin/default)
					if (!connected.get(index)) {
						status.inputs[index] = true;
						return verdict;
					}

					let result =
						(typeof curr === inputTypes[index] || inputTypes[index] === 'any') && verdict;
					status.inputs[index] = result;
					return result;
				}, true)
			) {
				status.node = 'error';
			} else if (values !== undefined) {
				status.node = 'calculated';
			}
		}
		// console.log('status calculated for', id, ':', status, '<<');
		return status;
	});

	const nodeValue = $derived(() => $graphStore.cache.get(id));

	// --- 3. ACTIONS ---

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

		graphStore.updateNodeData(node.id, newData as any);
	}
</script>

{#if true}
	{@const nStatus = status()}
	{@const nValue = nodeValue() as GNode}
	<div class={['node', nStatus.node]}>
		<div class="node-title">
			<button
				class="calculate-node-btn preset-glass-primary btn"
				onclick={() => graphStore.evaluateNode(initialNode.id)}>C</button
			>
			<h6 class="node-name">{nodeDef.name}</h6>
		</div>
		{#if nodeDef.io.outputs.length === 1}
			<Handle
				type="source"
				class={['handle', nValue ? typeof nValue.outputs[0] : nodeDef.io.outputs[0].type]}
				position={Position.Right}
				id={`output-0`}
			/>
		{:else}
			{@const outputs = nodeDef.io.outputs as readonly {
				name: string;
				type: string;
				showName: boolean;
			}[]}
			{#each outputs as output, i}
				<div class="field">
					{#if output.showName}
						<label for={`output-${i}`}>{output.name}</label>
					{/if}
					<Handle
						type="source"
						class={['handle', nValue ? typeof nValue.outputs[i] : output.type]}
						position={Position.Right}
						id={`output-${i}`}
					/>
				</div>
			{/each}
		{/if}

		{#each nodeDef.io.inputs as input, i}
			{@const pluginDef = nodeDef.data?.find(
				(d) => 'type' in d && d.type === 'plugin' && 'inputIndex' in d && d.inputIndex === i
			) as PluginDef | undefined}
			<div class="field">
				{#if input.maxConnections > 0}
					<Handle
						type="target"
						class={['handle', input.type]}
						position={Position.Left}
						id={`input-${i}`}
					/>
				{/if}
				{#if input.ui.showName}
					<label for={`input-${i}`}>{input.name}</label>
				{/if}

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
						{@const inputValue = nValue?.inputs?.[i]}
						{#if nStatus.inputs[i] !== false}
							<div class="input-value">{inputValue ?? ' '}</div>
						{:else}
							<NodeError
								details={`[Node ID:${id}][Index:${i}]`}
								message={`Input type is invalid, incoming value: ${inputValue}\ntypes:\n${typeof inputValue} \u2192 ${input.type}`}
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
		<div class="node-status-bar">
			<span class={nStatus.node === 'error' ? 'light-up' : ''}>&#9648; </span>
			<span class={nStatus.node === 'pending' ? 'light-up' : ''}>&#9648; </span>
			<span class={nStatus.node === 'calculated' ? 'light-up' : ''}>&#9648; </span>
		</div>
	</div>
{/if}

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
