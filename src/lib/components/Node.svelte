<script lang="ts">
	import { nodeDefs, type GNode } from '$lib/graph/nodeDefs';
	import { Position, type NodeProps, Handle } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
	const gNode = data as unknown as GNode;
	const nodeDef = nodeDefs[gNode.type];
</script>

<div class="node">
	<h6 class="node-name">{nodeDef.name}</h6>
	{#each nodeDef.io.inputs as input, i}
		<div class="field">
			{input.name}
			<Handle type="target" class="handle" position={Position.Left} id={input.name} />
		</div>
	{/each}
	{#each nodeDef.io.outputs as output, i}
		<div class="field">
			{output.name}
			<Handle type="source" class="handle" position={Position.Right} id={output.name} />
		</div>
	{/each}
</div>
