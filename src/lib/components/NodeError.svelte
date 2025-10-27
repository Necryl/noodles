<script>
	let { message, details } = $props();
	console.error(`Node Error {${details}}:`, message);
</script>

<div class="node-error">
	<p>{message}</p>
</div>

<style>
	.node-error {
		background-color: #360f0b;
		border: 1px solid #ff4e4e;
		padding: 10px;
		border-radius: 5px;
		color: #ff7676;
	}
</style>
