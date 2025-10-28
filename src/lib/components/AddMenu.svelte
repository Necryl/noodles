<script lang="ts">
	import { nodeDefs } from '$lib/graph/nodeDefs';
	import { menuVisible, menuX, menuY, closeMenu } from '$lib/stores/add-menu';
	import { fade } from 'svelte/transition';
	export let onAdd: (nodeName: string) => void;

	type NodeListEntry = string | { [key: string]: string };
	type NodeList = { [key: string]: NodeListEntry };

	const nodeList: NodeList = (() => {
		const result: NodeList = {};
		(Object.keys(nodeDefs) as (keyof typeof nodeDefs)[]).forEach((key) => {
			result[key] = nodeDefs[key].name;
		});
		return result;
	})();
	function addNode(nodeName: string) {
		onAdd(nodeName);
		closeMenu();
	}
</script>

{#if $menuVisible}
	<div
		class="add-menu"
		style="position: fixed; top: {$menuY}px; left: {$menuX}px; z-index: 9999;"
		transition:fade
		role="menu"
		tabindex="0"
		aria-label="Add node menu"
	>
		<h2>Add</h2>
		<ul>
			{#each Object.entries(nodeList) as [key, val] (key)}
				{#if typeof val === 'string'}
					<li class="add-menu-item">
						<button role="menuitem" type="button" data-node-id={key} on:click={() => addNode(key)}>
							{val}
						</button>
					</li>
				{:else}
					<!-- submenu: val is an object of id=>name pairs -->
					<li class="add-menu-submenu">
						<button class="submenu-title" aria-haspopup="true">
							<span class="submenu-label">{key}</span>
						</button>
						<ul role="menu">
							{#each Object.entries(val) as [subId, subName] (subId)}
								<li class="add-menu-item">
									<button
										role="menuitem"
										type="button"
										data-node-id={subId}
										on:click={() => addNode(subId)}
									>
										{subName}
									</button>
								</li>
							{/each}
						</ul>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/if}

<style>
	.add-menu {
		--background-col: rgba(20, 26, 32, 0.747);
		background: var(--background-col);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.3rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		color: rgb(205, 216, 236);
		min-width: 10rem;
	}

	.add-menu h2 {
		padding: 0.5rem;
		margin: 0;
		padding-bottom: 0.25rem;
		color: rgb(182, 199, 231);
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	}
	.add-menu ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.add-menu ul > * {
		padding: 0.2rem 0.5rem;
	}

	.add-menu-item:hover {
		background: rgba(255, 255, 255, 0.068);
		color: white;
	}

	.add-menu-item button {
		width: 100%;
		text-align: left;
	}

	.add-menu-submenu {
		position: relative;
	}

	.add-menu-submenu ul {
		position: absolute;
		top: 0;
		left: 100%;
		background: var(--background-col);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0rem 0.3rem 0.3rem 0.3rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		min-width: 10rem;
		display: none;
	}

	.add-menu-submenu:hover ul {
		display: block;
	}
</style>
