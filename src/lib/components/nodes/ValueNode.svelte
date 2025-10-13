<script lang="ts">
	import { Position, useSvelteFlow, type NodeProps, Handle } from '@xyflow/svelte';

	let { id, data }: NodeProps = $props();
	let { updateNodeData } = useSvelteFlow();
</script>

<div class="value-node node">
	<h6 class="node-name">Value</h6>
	<Handle type="source" class="handle" position={Position.Right} id="value-output" />
	<div class="field">
		<!-- <label for="value-input" class="label">Value</label> -->
		<input
			id="value-input"
			value={data.value}
			oninput={(evt) => {
				const inputEl = evt.currentTarget as HTMLInputElement;
				updateNodeData(id, { value: inputEl.value });
			}}
			class="nodrag input"
		/>
	</div>
</div>
