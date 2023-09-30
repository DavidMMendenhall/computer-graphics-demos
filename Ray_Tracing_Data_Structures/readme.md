# Ray Tracing Data Structures
This demo was created at the request of Dr. Dean Mathias to demonstrate the power of the Bounding Volume Hiearchy (BVH) and the Octree when doing ray tracing.

## What's in the demo?
This demo loads a `ply` model, then creates a BVH and an Octree around these models. The parameters of these models can be changed using the UI.

Clicking anywhere on the main part of the screen will cast a ray and determine which triangle, if any, was intersected by that ray.

The tree nodes are rendered over the model as boxes (which tree is displayed can be selected using the UI). Which nodes are displayed can be modified using the `m` key. The various modes are:
- All (default)
    - All nodes of the tree are displayed
- Tested Nodes
    - All nodes that the ray was tested for intersections with.
- Intersected Nodes
    - All nodes that the ray intersected
- Leaf Nodes
    - All leaf nodes that the ray intersected which resulted in the traingales of that node being tested for intersection of the ray
- Final Nodes
    - The node that contains the intersected triangle.
        > Note: To streamline the creation of the octree, an axis aligned bounding box is created for each triangle which is used to determine its membership in a node. This may result in the final node containing the intersected triangle to not geometrically contain the intersected traingle.

More features and controlls can be seen by clicking `check controls` on the right panel.

## How to run?
This can be run on any HTTP server. This also comes with its own server.js for running using a node.js server. You can run using the command `npm start` in the root of this project and use a WebGL enabled browser to navigate to the port speciifed.