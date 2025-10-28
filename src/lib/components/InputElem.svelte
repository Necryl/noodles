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
	let booleanValue = $state(defaultValue as boolean);
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
	<label class="node-bool-switch">
		{booleanValue.toString().toUpperCase()}
		<input
			{id}
			class="nodrag input"
			type="checkbox"
			checked={defaultValue}
			hidden
			oninput={(e) => {
				const newValue = ensureType(e.currentTarget.checked, type);
				setValue(newValue);
				booleanValue = newValue as boolean;
				// console.log('setting boolean value to:', newValue);
			}}
		/>
	</label>
{:else}
	<NodeError
		details={`[Node ID: ${nodeID}][Socket ID: ${id}]`}
		message={`Unsupported input type: ${type}`}
	/>
{/if}

<style>
	.node-bool-switch {
		display: flex;
		place-content: center;
		outline: 1px solid rgb(62, 86, 114);
		width: 100%;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 8px;
		background-color: rgb(42, 48, 56);
	}

	.node-bool-switch:hover {
		background-color: rgb(78, 49, 90);
	}
	.node-bool-switch:active {
		background-color: rgb(204, 74, 176);
	}
</style>
