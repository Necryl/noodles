<script lang="ts">
	import { Position, type NodeProps, Handle } from '@xyflow/svelte';

	let { data }: NodeProps = $props();
</script>

<div class="value-node node">
	<h6 class="node-name">Output</h6>
	<div class="field">
		{data.value ?? 'No input connected'}
	</div>
	<Handle type="target" position={Position.Left} id="value-input" />
</div>
