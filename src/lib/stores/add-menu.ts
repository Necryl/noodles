import { writable } from 'svelte/store';

export const menuVisible = writable(false);
export const menuX = writable(0);
export const menuY = writable(0);
const latestID = writable(0);

export function getNextID() {
	let id: number;
	latestID.update((n) => {
		id = n + 1;
		return id;
	});
	return `N${id!}`;
}

export function openMenu(x: number, y: number) {
	console.log("openMenu", x, y);
	menuX.set(x);
	menuY.set(y);
	menuVisible.set(true);
}

export function closeMenu() {
	menuVisible.set(false);
}
