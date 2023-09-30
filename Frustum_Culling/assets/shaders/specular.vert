#version 300 es

//
// Environment
uniform mat4 uAspect;
uniform mat4 uProjection;
uniform mat4 uView;

//
// Geometry
layout(location = 0) in vec4 aPosition;
layout(location = 1) in vec4 aNormal;
layout(location = 2) in mat4 aModel;
layout(location = 6) in vec4 aColor;

//
// Output
out vec3 vNormal;
out vec3 vPosition;
out vec4 vColor;

void main()
{
    //
    mat4 mFinal = uAspect * uProjection * uView * aModel;
    gl_Position = mFinal * aPosition;

    mat4 mModelI = inverse(aModel);
    mat4 mModelIT = transpose(mModelI);

    vNormal = normalize((mModelIT * aNormal).xyz);
    vPosition = (aModel * aPosition).xyz;
    vColor = aColor;

}
