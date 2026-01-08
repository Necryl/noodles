<script lang="ts">
	import { SvelteFlow, MiniMap, Controls, useSvelteFlow, Background, Panel } from '@xyflow/svelte';
	import { onMount } from 'svelte';
	import type {
		Node,
		Edge,
		ColorMode,
		OnDelete,
		OnConnect,
		IsValidConnection
	} from '@xyflow/svelte';

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

	// Static initial state for UI, logic synced in onMount
	const initialNode1Id = getNextID();
	const initialNode2Id = getNextID();

	// We defines nodes for UI immediately to prevent flash?
	// Actually better to wait for WASM or just init UI and sync WASM.
	// Let's go with: init UI, then add to WASM in onMount.

	// Initial Data for Node 1
	const n1Data = [nodeDefs.stringNode.data[0].defaultValue];

	const initialNodes: Node[] = [
		{
			id: initialNode1Id,
			type: 'node',
			position: { x: 0, y: 0 },
			data: {
				id: initialNode1Id,
				type: 'stringNode',
				data: n1Data,
				inputs: [[]],
				outputs: [[]]
			} as any
		},
		{
			id: initialNode2Id,
			type: 'node',
			position: { x: 400, y: 100 },
			data: {
				id: initialNode2Id,
				type: 'outputNode',
				data: [],
				inputs: [[]],
				outputs: []
			} as any
		}
	];

	const initialEdges: Edge[] = [
		{
			id: 'e1-2',
			source: initialNode1Id,
			target: initialNode2Id,
			sourceHandle: 'output-0',
			targetHandle: 'input-0'
		}
	];

	let nodes = $state.raw<Node[]>(initialNodes);
	let edges = $state.raw<Edge[]>(initialEdges);

	import * as wasm from '$lib/wasm/wasm_lib';

	onMount(() => {
		(async () => {
			// WASM is initialized via graphStore
			// Sync initial nodes to WASM logic
			// We know IDs and types from initialNodes

			await graphStore.addNode({
				id: initialNodes[0].id,
				type: 'stringNode',
				data: (initialNodes[0].data as any).data,
				inputs: [[]],
				outputs: [[]]
			});
			await graphStore.addNode({
				id: initialNodes[1].id,
				type: 'outputNode',
				data: [],
				inputs: [[]],
				outputs: []
			});
			await graphStore.addEdge(initialNodes[0].id, 0, initialNodes[1].id, 0);
		})();

		const onKey = (e: KeyboardEvent) => {
			if (e.key && e.key.toLowerCase() === 'a' && e.shiftKey) {
				// open at last known pointer coords (no viewport-inside check)
				e.preventDefault();
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

	async function addNode(nodeType: string) {
		const id = getNextID();
		const flowPos = svelteFlowInstance.screenToFlowPosition({ x: $menuX, y: $menuY });
		if (!flowPos) return;

		const newNodeData: GNode = {
			id,
			type: nodeType as keyof typeof nodeDefs,
			data: (nodeDefs[nodeType as keyof typeof nodeDefs].data?.map((d) => d.defaultValue) ||
				[]) as any,
			inputs: Array.from(
				{ length: nodeDefs[nodeType as keyof typeof nodeDefs].io.inputs.length },
				() => []
			),
			outputs: Array.from(
				{ length: nodeDefs[nodeType as keyof typeof nodeDefs].io.outputs.length },
				() => []
			)
		};

		await engine.addNode(newNodeData);

		const newNode: Node = {
			id,
			type: 'node',
			position: { x: flowPos.x, y: flowPos.y },
			data: newNodeData as unknown as Record<string, unknown>,
			origin: [0.5, 0.5]
		};
		nodes = [...nodes, newNode];
	}

	const deleteHandler: OnDelete = async ({
		nodes: deletedNodes,
		edges: deletedEdges
	}: {
		nodes: Node[];
		edges: Edge[];
	}) => {
		for (const edge of deletedEdges) {
			const sourceOutputIndex = Number(edge.sourceHandle?.split('-').pop());
			const targetInputIndex = Number(edge.targetHandle?.split('-').pop());
			await engine.removeEdge(edge.source, sourceOutputIndex, edge.target, targetInputIndex);
		}
		for (const node of deletedNodes) {
			await engine.removeNode(node.id);
		}
	};

	const connectionHandler: OnConnect = async (connection) => {
		const sourceNode = $graphStore.graph.get(connection.source);
		const targetNode = $graphStore.graph.get(connection.target);
		if (!sourceNode || !targetNode) return;

		const sourceOutputIndex = Number(connection.sourceHandle?.split('-').pop());
		const targetInputIndex = Number(connection.targetHandle?.split('-').pop());

		// Check for replacement (if target socket is full)
		// Check for replacement (if target socket is full)
		const targetSocketDef = nodeDefs[targetNode.type].io.inputs[targetInputIndex];

		if (targetNode.inputs[targetInputIndex].length >= targetSocketDef.maxConnections) {
			// Only replace if maxConnections is 1
			if (targetSocketDef.maxConnections === 1) {
				console.log('Replacing existing connection on socket', targetInputIndex);
				const existingEdges = edges.filter(
					(e) => e.target === connection.target && e.targetHandle === connection.targetHandle
				);

				for (const edge of existingEdges) {
					const sIdx = Number(edge.sourceHandle?.split('-').pop());
					const tIdx = Number(edge.targetHandle?.split('-').pop());
					try {
						await engine.removeEdge(edge.source, sIdx, edge.target, tIdx);
					} catch (err) {
						console.error('Failed to remove existing edge during replacement:', err);
					}
				}

				edges = edges.filter(
					(e) => e.target !== connection.target || e.targetHandle !== connection.targetHandle
				);
			} else {
				console.warn('Target socket full and maxConnections > 1. Connection logic prevented.');
				return; // Prevent adding extra edge if logic violation
			}
		}

		try {
			await engine.addEdge(
				connection.source,
				sourceOutputIndex,
				connection.target,
				targetInputIndex
			);

			// Explicitly add the new visual edge
			const newEdge: Edge = {
				id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`, // Consistent ID
				source: connection.source,
				target: connection.target,
				sourceHandle: connection.sourceHandle,
				targetHandle: connection.targetHandle,
				type: 'default'
			};
			// Append to edges (after filtering happened above)
			edges = [...edges, newEdge];
		} catch (err) {
			console.error('Failed to add new edge:', err);
		}
	};

	const checkConnectionValidity: IsValidConnection = (connection) => {
		if (!connection.sourceHandle || !connection.targetHandle) return false;

		const sourceSocket = {
			id: connection.source,
			index: Number(connection.sourceHandle.split('-').pop())
		};
		const targetSocket = {
			id: connection.target,
			index: Number(connection.targetHandle.split('-').pop())
		};
		const source = $graphStore.graph.get(sourceSocket.id);
		const target = $graphStore.graph.get(targetSocket.id);

		if (!source || !target) return false;

		const sourceMax = nodeDefs[source.type].io.outputs[sourceSocket.index].maxConnections;
		const targetMax = nodeDefs[target.type].io.inputs[targetSocket.index].maxConnections;

		const sourceType = nodeDefs[source.type].io.outputs[sourceSocket.index].type;
		const targetType = nodeDefs[target.type].io.inputs[targetSocket.index].type;

		// Type check
		if (!(sourceType === targetType || sourceType === 'any' || targetType === 'any')) {
			return false;
		}

		// Capacity check
		// Source
		if (source.outputs[sourceSocket.index].length >= sourceMax) return false;

		// Target - Allow overflow only if replacement is supported (max=1)
		if (target.inputs[targetSocket.index].length >= targetMax) {
			if (targetMax === 1) return true;
			return false;
		}

		return true;
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
		isValidConnection={checkConnectionValidity}
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
