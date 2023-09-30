// describes the structure of vertex shader output
struct VertexOut {
    @builtin(position) position : vec4<f32>, // uses built-in position as to say this should be used for the final vertex position
    @location(0) uv : vec2<f32>,
    @location(1) radius : f32,
    @location(2) lightPosition : vec3<f32>,
    @location(3) lightColor : vec3<f32>,
}

@binding(0) @group(0) var mySampler: sampler;
@binding(1) @group(0) var gDepth: texture_depth_2d;
@binding(2) @group(0) var gColor: texture_2d<f32>;
@binding(3) @group(0) var gNormal: texture_2d<f32>;
@binding(4) @group(0) var gMaterial: texture_2d<f32>;

struct MatrixUniforms {
    aspect : mat4x4<f32>,
    projection : mat4x4<f32>,
    view : mat4x4<f32>,
    inverseViewProjectionAspect: mat4x4<f32>,
}


@binding(0) @group(1) var<uniform> matrixUniforms : MatrixUniforms;
@binding(1) @group(1) var<uniform> eye : vec4<f32>;

@vertex
fn vertex_main(
    @location(0) aPosition: vec3<f32>, // location(#) refers to the location we specified in the vertexBuffers array
    @location(2) aColor: vec3<f32>,
    @location(4) modelMatCol0: vec4<f32>,
    @location(5) modelMatCol1: vec4<f32>,
    @location(6) modelMatCol2: vec4<f32>,
    @location(7) modelMatCol3: vec4<f32>,
    @location(12) aRadius: f32,
    @location(13) aLightPosition: vec3<f32>,
    ) -> VertexOut
{
    var output : VertexOut;
    var model = mat4x4<f32>(modelMatCol0, modelMatCol1, modelMatCol2, modelMatCol3);
    var finalPosition = matrixUniforms.aspect *  matrixUniforms.projection *  matrixUniforms.view * model * vec4(aPosition, 1.0);
    output.uv = ((finalPosition.xy / finalPosition.w) * vec2(1.0, -1.0)) * 0.5 + vec2(0.5);
    output.position = vec4(finalPosition.xy, 0.0, finalPosition.w);
    output.radius = aRadius;
    output.lightPosition = aLightPosition;
    output.lightColor = aColor;
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
    var screenPosition = (uv - vec2(0.5)) * 2.0 * vec2(1.0, -1.0) ;
    var depth = textureSample(gDepth, mySampler, uv);
    var color = textureSample(gColor, mySampler, uv);
    var normal = (textureSample(gNormal, mySampler, uv).xyz - vec3(0.5)) * 2.0;
    var material = textureSample(gMaterial, mySampler, uv);

    if(depth == 1.0){
        discard;
    }
    var position = matrixUniforms.inverseViewProjectionAspect * vec4(screenPosition, depth, 1.0);
    position = position / position.w;

    var vLightUnormalized = fragData.lightPosition - position.xyz;
    var distance = length(vLightUnormalized);
    var vLight = normalize(vLightUnormalized);
    var lightPower = clamp(1.0 - pow(distance / fragData.radius, 15.0), 0.0, 1.0);

    //
    // Compute diffuse lighting component
    var Idiff = dot(vLight, normal);
    Idiff = clamp(Idiff, 0.0, 1.0);
    var diffuse = Idiff * fragData.lightColor;

    //
    // Compute the specular lighting component
    var vReflection = 2.0 * dot(vLight, normal) * normal - vLight;  // Reflection vector
    var vViewing = normalize(eye.xyz - position.xyz);
    var dot = dot(vViewing, vReflection);
    var iSpecular = 0.0;
    if (dot > 0.0) {
        iSpecular = pow(dot, 100.0 * material.r);
    }
    iSpecular = clamp(iSpecular, 0.0, 1.0);
    var specular = iSpecular * fragData.lightColor;
    output.color = vec4(clamp((diffuse + specular) * lightPower, vec3(0.0), vec3(1.0)), 1.0);
    return output;
}