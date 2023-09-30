#version 300 es

//
// Environment
uniform mat4 uAspect;
uniform mat4 uProjection;
uniform mat4 uView;

//
// Geometry
layout(location = 0) in vec4 aPosition;
layout(location = 2) in mat4 aModel;
layout(location = 6) in vec4 aColor;

out vec4 vColor;

void main()
{
    //
    mat4 mFinal = uAspect * uProjection * uView * aModel;
    gl_Position = mFinal * aPosition;
    vColor = aColor;

}
