<script lang="ts">
	import { graphStore } from '$lib/stores/graph';
	import { nodeDefs, type GNode, type PluginDef } from '$lib/graph/nodeDefs';
	import { Position, type NodeProps, Handle, useEdges, type Edge } from '@xyflow/svelte';

	// --- 1. PROPS & DEFINITIONS ---
	let { id, data }: NodeProps = $props();
	const gNode = data as unknown as GNode;
	const nodeDef = nodeDefs[gNode.type];
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

	// --- 3. ACTIONS ---

	function updateNodeValue(index: number, value: string) {
		if (gNode.type === 'valueNode') {
			const newData: [{ value: string }] = [{ value }];
			graphStore.updateNodeData(gNode.id, newData);
		}
	}
</script>

<div class="node">
	<h6 class="node-name">{nodeDef.name}</h6>
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
			<Handle type="target" class="handle" position={Position.Left} id={`input-${i}`} />
			<label for={`input-${i}`}>{input.name}</label>

			{#if pluginDef}
				{#if !(isInputConnected().get(i) ?? false)}
					{#if pluginDef.ui.type === 'input'}
						<input type="number" class="nodrag input" value={pluginDef.defaultValue} />
					{/if}
				{/if}

				{#if 'defaultValue' in pluginDef && pluginDef.ui.type === 'display'}
					{#if pluginDef.defaultValue && typeof pluginDef.defaultValue === 'object' && 'type' in pluginDef.defaultValue && pluginDef.defaultValue.type === 'error' && 'value' in pluginDef.defaultValue}
						<div class="result error">{(pluginDef.defaultValue as { value: string }).value}</div>
					{:else}
						<div class="result">{pluginDef.defaultValue}</div>
					{/if}
				{/if}
			{/if}
		</div>
	{/each}

	{#if nodeDef.data}
		{#each nodeDef.data as dataDef, i}
			{#if 'name' in dataDef && dataDef.type === 'string' && gNode.data}
				<div class="field">
					<label for={`${id}-${dataDef.name}`}>{dataDef.name}</label>
					{#if dataDef.ui.type === 'input'}
						<input
							id={`${id}-${dataDef.name}`}
							class="nodrag input"
							type="text"
							value={gNode.data[i]?.value}
							oninput={(e) => updateNodeValue(i, e.currentTarget.value)}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	{/if}
</div>
