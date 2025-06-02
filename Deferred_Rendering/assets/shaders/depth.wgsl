// describes the structure of vertex shader output
struct VertexOut {
    @builtin(position) position : vec4<f32>, // uses built-in position as to say this should be used for the final vertex position
}

@binding(1) @group(0) var gDepth: texture_depth_2d;


@vertex
fn vertex_main(
    @location(0) aPosition: vec3<f32>, // location(#) refers to the location we specified in the vertexBuffers array
    ) -> VertexOut
{
    var output : VertexOut;

    output.position = vec4(aPosition.xy, 1.0, 1.0);
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
    var bufferSize = textureDimensions(gDepth);
    var uv = fragData.position.xy / vec2<f32>(bufferSize);
    var depth_dim = textureDimensions(gDepth);
    var depth_coords = vec2u(uv * vec2f(depth_dim));
    var depth = textureLoad(gDepth, depth_coords, 0);
    output.color = vec4(vec3(pow(depth, 4.0)), 1.0);
    return output;
}