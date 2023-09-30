# Frustum Culling
This demo was created at the request of Dr. Dean Mathias to demonstrate the benefits of frustum culling.

## What's in the demo?
This demo contains many objects in a scene with a camera. There is a view of what the camera sees as well as a bird's eye view of the scene with the view frustum of the camera rendered. The camera can be controlled with w, s, a, d, c, and e or the arrow keys for directional movement, and j, k, i, and l for rotational movement.

There are various settings for what the demo should be doing.
- Main view: change what is shown on the large view and the smaller view
- Camera FOV, Camera Far: modify the field of view and the far clipping plane of the camera.
- Tree Render Mode, renders the octree of the scene used to streamline tests for what is in the view frustum.
- Frustum Culling: Toggles culling on and off
- Bird's Eye View Items: Changes what items are displayed on the bird's eye view.
    - Rendered: Only object that are drawn during the main camera call are shown
    - All (AABB outline): All objects in the scene are rendered using a box outline. Ojbects that are rendered on the main camera are outlined in white.
- Bird's Eye Model: changes what model is used in the bird's eye view for objects
    - Box: a simple box model is used to represent objects
    - PLY model: the same model used in the camrea is used to represent objects (may impact performance)
- Item count: how many objects are in the scene
    > Don't set this too high, there aren't any safe gaurds in place and it will do as you command

## Good Demo for showing why frustum is important
1. Open the main page
2. point out the FPS
3. disable culling, the FPS should drop (if it doesn't, try increasing the item count, and show FPS increases when you re-enable culling)
4. Re-enable culling and show the tree data structure around the objects to show how it minimizes the number of hit tests required to detrmine what is in the view frustum.