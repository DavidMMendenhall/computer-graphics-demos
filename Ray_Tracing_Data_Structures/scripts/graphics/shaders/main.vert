#version 300 es

//
// Environment
uniform mat4 uAspect;
uniform mat4 uProjection;
uniform mat4 uView;

uniform vec4 highlight;

in mat4 aModel;

//
// Geometry
in vec4 aPosition;
in vec4 aColor;
in vec2 aTexture;
in vec4 aNormal;

//
// Output
out vec3 vNormal;
out vec4 vColor;
out vec2 vTexture;
out vec3 vPosition;

void main()
{
    //
    // Only need to apply view, projection, and aspect transformations
    mat4 mFinal = uAspect * uProjection * uView * aModel;
    gl_Position = mFinal * aPosition;

    mat4 mModelI = inverse(aModel);
    mat4 mModelIT = transpose(mModelI);

    vNormal = normalize((mModelIT * aNormal).xyz);
    vPosition = (aModel * aPosition).xyz;
    vTexture = aTexture;
    vColor = aColor;
    if(highlight.a > 0.0){
        vColor = highlight;
    }
}
