# Deferred Rendering
This demo was created at the request of Dr. Dean Mathias to demonstrate the technique of Deferred Rendering using WebGPU.

## What's in the demo?
This demo features 6 views of a scene with many lights bouncing around.
Scenes:
- Main: The final composted image
- Light: The result of lighting calculations done using the depth, normal and mateiral views.
- Depth: The depth of each pixel
- Normal: The normal of each rendered pixel
- Material: The material properties:
    - Red channel: Shinniness (results in more specular highlights)
    - Green Channel: Unused
    - Blue Channel: Used by light reflectors, but not implemented as a material property
- Color: The underlying color of the material.

There is not much in terms of configuring via UI of this demo.