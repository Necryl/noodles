<script lang="ts">
	import { Position, useSvelteFlow, type NodeProps, Handle } from '@xyflow/svelte';

	let { id, data }: NodeProps = $props();
	let { updateNodeData } = useSvelteFlow();
</script>

<div class="value-node">
	<div class="field">
		<label for="text" class="label">Value</label>
		<input
			type="text"
			value={data.value}
			oninput={(evt) => {
				const inputEl = evt.currentTarget as HTMLInputElement;
				updateNodeData(id, { value: inputEl.value });
			}}
			class="nodrag input"
		/>
	</div>
	<Handle type="source" position={Position.Right} id="value-output" />
</div>
