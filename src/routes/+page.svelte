<script lang="ts">
	import { SvelteFlow, MiniMap, Controls, useSvelteFlow, Background, Panel } from '@xyflow/svelte';
	import { onMount } from 'svelte';
	import type { Node, Edge, ColorMode } from '@xyflow/svelte';

	import ValueNode from '$lib/components/nodes/ValueNode.svelte';
	import AddMenu from '$lib/components/AddMenu.svelte';
	import { openMenu, closeMenu, menuX, menuY, getNextID } from '$lib/stores/add-menu';
	import { lastMouseX, lastMouseY } from '$lib/stores/store';

	// Define a custom node type that includes possible data properties
	type AppNode = Node<{ value?: string; label?: string }>;

	const nodeTypes = { valueNode: ValueNode };

	export const svelteFlowInstance = useSvelteFlow();

	// Apply the custom type to the nodes array
	let initialNodes = [
		{
			id: '1',
			type: 'valueNode',
			position: { x: 0, y: 0 },
			data: { value: '0' }
		},
		{
			id: '2',
			position: { x: 400, y: 100 },
			data: { label: 'World' }
		}
	];
	let initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

	let nodes = $state.raw<Node[]>(initialNodes);
	let edges = $state.raw<Edge[]>(initialEdges);



	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key && e.key.toLowerCase() === 'a' && e.shiftKey) {
				// open at last known pointer coords (no viewport-inside check)
				e.preventDefault();
				openMenu($lastMouseX, $lastMouseY);
			}
		};
		const onMouseMove = (e: MouseEvent) => {
			lastMouseX.set(e.clientX);
			lastMouseY.set(e.clientY);
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('mousemove', onMouseMove);

		return () => {
			// Destroy the event listener when the component is unmounted
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('mousemove', onMouseMove);
		};
	});

	function addNode(nodeId: string) {
		const id = getNextID();
		const flowPos = svelteFlowInstance.screenToFlowPosition({ x: $menuX, y: $menuY });
		console.log('flowPos', flowPos);
		if (!flowPos) return;
		// choose sensible defaults per node type
		const defaultData: Record<string, any> = {
			valueNode: { value: '' },
			numberNode: { value: '0' },
			stringNode: { value: '' }
		};
		const data = { ...(defaultData[nodeId] ?? { value: '' }) };
		const newNode: Node = { id, type: nodeId, position: { x: flowPos.x, y: flowPos.y }, data, origin: [0.5, 0.5] };
		nodes = [...nodes, newNode];
	}
	let colorMode: ColorMode = $state('system');
</script>

<div style="height: 100vh; width: 100vw;">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{colorMode}
		fitView
		deleteKey="x"
		onpanecontextmenu={({ event }) => {
			event.preventDefault();
			const screenPos = { x: event.clientX, y: event.clientY };
			if (screenPos) {
				openMenu(screenPos.x, screenPos.y);
			}
		}}
		onpaneclick={closeMenu}
	>
		<Panel position="top-left">
			<h1>Noodles</h1>
		</Panel>
		<Background />
		<Controls />
		<MiniMap />
		<AddMenu onAdd={addNode} />
	</SvelteFlow>
</div>
