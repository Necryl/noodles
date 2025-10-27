<script lang="ts">
	import NodeError from './NodeError.svelte';
	let { id, type, defaultValue, nodeID, setValue } = $props();
	// console.log('making InputElem:', { id, type, defaultValue, nodeID, setValue });
	function ensureType(value: unknown, type: string) {
		switch (type) {
			case 'number':
				return Number(value);
			case 'boolean':
				return Boolean(value);
			case 'string':
			case 'any':
			default:
				return value;
		}
	}
</script>

{#if type === 'string' || type === 'any'}
	<input
		class="nodrag input"
		{id}
		type="text"
		value={defaultValue}
		oninput={(e) => setValue(ensureType(e.currentTarget.value, type))}
	/>
{:else if type === 'number'}
	<input
		class="nodrag input"
		{id}
		type="number"
		value={defaultValue}
		oninput={(e) => setValue(ensureType(e.currentTarget.value, type))}
	/>
{:else if type === 'boolean'}
	<input
		{id}
		class="nodrag input"
		type="checkbox"
		checked={defaultValue}
		oninput={(e) => setValue(ensureType(e.currentTarget.checked, type))}
	/>
{:else}
	<NodeError
		details={`[Node ID: ${nodeID}][Socket ID: ${id}]`}
		message={`Unsupported input type: ${type}`}
	/>
{/if}
