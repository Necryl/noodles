<script lang="ts">
	import { SvelteFlow, MiniMap, Controls, useSvelteFlow, Background, Panel } from '@xyflow/svelte';
	import { onMount } from 'svelte';
	import type { Node, Edge, ColorMode, OnDelete, OnConnect, NodeTypes } from '@xyflow/svelte';

	import NodeComponent from '$lib/components/Node.svelte';

	import AddMenu from '$lib/components/AddMenu.svelte';
	import { openMenu, closeMenu, menuX, menuY } from '$lib/stores/add-menu';
	import { lastMouseX, lastMouseY } from '$lib/stores/misc';
	import { getNextID, graphStore } from '$lib/stores/graph';
	import {
		nodeDefs,
		type NodeDef,
		type GNode,
		type EdgeSource,
		type EdgeTarget
	} from '$lib/graph/nodeDefs';

	// Define a custom node type that includes possible data properties
	type AppNode = Node<{ value?: string; label?: string }>;

	export const svelteFlowInstance = useSvelteFlow();

	export const nodeTypes = { node: NodeComponent };

	const engine = graphStore;

	// Apply the custom type to the nodes array
	const { initialNodes, initialEdges } = (() => {
		const node1 = graphStore.addNode('valueNode', getNextID(), [
			nodeDefs.valueNode.data[0].defaultValue
		] as unknown as GNode['data']);
		const node2 = graphStore.addNode('outputNode', getNextID());
		graphStore.addEdge({ id: node1.id, outputIndex: 0 }, { id: node2.id, inputIndex: 0 });
		return {
			initialNodes: [
				{
					id: node1.id,
					type: 'node',
					position: { x: 0, y: 0 },
					data: node1 as unknown as Record<string, unknown>
				},
				{
					id: node2.id,
					type: 'node',
					position: { x: 400, y: 100 },
					data: node2 as unknown as Record<string, unknown>
				}
			],
			initialEdges: [
				{
					id: 'e1-2',
					source: node1.id,
					target: node2.id,
					sourceHandle: `output-0`,
					targetHandle: `input-0`
				} as Edge
			]
		};
	})();

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

	function addNode(nodeType: string) {
		const id = getNextID();
		const flowPos = svelteFlowInstance.screenToFlowPosition({ x: $menuX, y: $menuY });
		if (!flowPos) return;
		const dataNode: GNode = engine.addNode(nodeType as NodeDef, id);
		const newNode: Node = {
			id,
			type: 'node',
			position: { x: flowPos.x, y: flowPos.y },
			data: dataNode as unknown as Record<string, unknown>,
			origin: [0.5, 0.5]
		};
		nodes = [...nodes, newNode];
	}

	const deleteHandler: OnDelete = ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
		console.log('deleting nodes:', nodes);
		console.log('deleting edges:', edges);
		edges.forEach((edge) => {
			const source: EdgeSource = {
				id: edge.source,
				outputIndex: Number(edge.sourceHandle?.at(-1))
			};
			const target: EdgeTarget = {
				id: edge.target,
				inputIndex: Number(edge.targetHandle?.at(-1))
			};
			engine.removeEdge(source, target);
		});
		nodes.forEach((node) => {
			engine.removeNode(node.id);
		});
	};

	const connectionHandler: OnConnect = (connection) => {
		console.log('connecting:', connection);
		const source: EdgeSource = {
			id: connection.source,
			outputIndex: Number(connection.sourceHandle?.at(-1))
		};
		const target: EdgeTarget = {
			id: connection.target,
			inputIndex: Number(connection.targetHandle?.at(-1))
		};
		engine.addEdge(source, target);
	};

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
		onconnect={connectionHandler}
		ondelete={deleteHandler}
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
