# Project: Noodles

## Overview

The project, named "noodles", is a web application built with Svelte and Svelte Flow. It provides a visual, node-based interface where users can create and connect nodes on a canvas. The application has a dark mode theme and uses Tailwind CSS for styling.

### Core Functionality

*   **Node-based canvas:** The main feature of the application is a canvas where users can add, connect, and manipulate nodes. This is powered by the `@xyflow/svelte` library.
*   **Adding nodes:** Users can add new nodes to the canvas by right-clicking on the canvas or by using the "Shift+A" shortcut. This opens a context menu with a list of available nodes.
*   **Custom nodes:** The application includes a custom node type called `ValueNode`, which displays a value and an input field.
*   **Dark mode:** The application has a dark mode theme, which is implemented using the Skeleton UI toolkit and Tailwind CSS.

### Project Structure

*   **`src/routes/+page.svelte`**: The main Svelte component that renders the Svelte Flow canvas and handles all the user interactions.
*   **`src/routes/+layout.svelte`**: The root layout for the application. It sets up the Svelte Flow provider and includes the global CSS file.
*   **`src/lib/components/AddMenu.svelte`**: A context menu component that allows users to add new nodes to the canvas.
*   **`src/lib/components/nodes/ValueNode.svelte`**: A custom Svelte Flow node that displays a value and an input field.
*   **`src/lib/stores/flow-service.ts`**: A Svelte store that provides utility functions for interacting with the Svelte Flow instance, such as converting screen coordinates to flow coordinates.
*   **`src/app.css`**: The global CSS file for the application. It includes Tailwind CSS, Skeleton, and custom styles for the Svelte Flow nodes.

### Intention

The intention of the project is to create a flexible and extensible node-based UI for a variety of applications, such as data visualization, visual programming, or workflow automation. The name "noodles" suggests a playful and creative tool for connecting ideas and concepts.
