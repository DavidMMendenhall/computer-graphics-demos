// describes the structure of vertex shader output
struct VertexOut {
    @builtin(position) position : vec4<f32>, // uses built-in position as to say this should be used for the final vertex position
    @location(0) worldNormal : vec4<f32>,
    @location(1) worldPosition : vec4<f32>,
    @location(2) color : vec4<f32>,
    @location(3) material : vec4<f32>,
}

struct SharedUniforms {
    aspect : mat4x4<f32>,
    projection : mat4x4<f32>,
    view : mat4x4<f32>,
}


@binding(0) @group(0) var<uniform> sharedUniforms : SharedUniforms;

@vertex
fn vertex_main(
    @location(0) aPosition: vec3f, // location(#) refers to the location we specified in the vertexBuffers array
    @location(1) aNormal: vec3f,
    @location(2) aColor: vec3f,
    @location(3) aMaterial: vec3f,
    @location(4) modelMatCol0: vec4f,
    @location(5) modelMatCol1: vec4f,
    @location(6) modelMatCol2: vec4f,
    @location(7) modelMatCol3: vec4f,
    @location(8) normalMatCol0: vec3f,
    @location(9) normalMatCol1: vec3f,
    @location(10) normalMatCol2: vec3f,
    ) -> VertexOut
{
    var output : VertexOut;
    var mModel = mat4x4<f32>(modelMatCol0, modelMatCol1, modelMatCol2, modelMatCol3);
    var mNormal = mat3x3<f32>(normalMatCol0, normalMatCol1, normalMatCol2);

    //
    // Finally, apply view, projection and aspect transformations
    var mFinal = sharedUniforms.aspect * sharedUniforms.projection * sharedUniforms.view * mModel;
    output.position = mFinal * vec4(aPosition, 1.0);

    output.worldNormal = vec4(normalize(mNormal * aNormal), 1.0);
    output.worldPosition = mModel * vec4(aPosition, 1.0);
    output.material = vec4(aMaterial, 1.0);
    output.color = vec4(aColor, 1.0);

    return output;
}

// describes the structure of fragment shader output
struct FragmentOut {
    @location(0) color : vec4<f32>,
    @location(1) worldNormal : vec4<f32>,
    @location(2) material : vec4<f32>,
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOut
{
    var output: FragmentOut;
    output.color = fragData.color;
    output.material = fragData.material;
    output.worldNormal = (vec4(normalize(fragData.worldNormal.xyz), 1.0) + vec4(1.0)) * 0.5;
    return output;
}