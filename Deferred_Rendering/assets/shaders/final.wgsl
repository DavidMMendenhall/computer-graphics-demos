// describes the structure of vertex shader output
struct VertexOut {
    @builtin(position) position : vec4<f32>, // uses built-in position as to say this should be used for the final vertex position
    @location(0) uv : vec2<f32>,
}

@binding(0) @group(0) var mySampler: sampler;
@binding(2) @group(0) var gColor: texture_2d<f32>;
@binding(4) @group(0) var gMaterial: texture_2d<f32>;
@binding(5) @group(0) var lightTexture: texture_2d<f32>;

const ambient = vec4(0.1, 0.1, 0.1, 1.0);

@vertex
fn vertex_main(
    @location(0) aPosition: vec3<f32>,
) -> VertexOut
{
    var output : VertexOut;
    output.uv = ((aPosition.xy  * vec2(1.0, -1.0)) + vec2(1.0)) * 0.5;
    output.position = vec4(aPosition, 1.0);
    return output;
}

// describes the structure of fragment shader output
struct FragmentOut {
    @location(0) color : vec4<f32>,
}

@fragment
fn fragment_main(fragData: VertexOut) -> FragmentOut
{
    var output: FragmentOut;
    var color = textureSample(gColor, mySampler, fragData.uv);
    var light = textureSample(lightTexture, mySampler, fragData.uv);
    var material = textureSample(gMaterial, mySampler, fragData.uv);
    output.color = clamp(mix(color * (light + ambient), color, material.g), vec4(0.0), vec4(1.0));
    output.color.a = 1.0;
    return output;
}