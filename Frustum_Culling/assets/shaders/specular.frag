#version 300 es

precision lowp float;

//
// Environment
uniform vec3 uEye;

//
// Lights & Materials
const vec4 mtSpecular = vec4(0.5, 0.1, 0.1, 1.0);
const vec4 ltEmission = vec4(0.5, 0.5, 0.5, 1.0);
const vec3 ltPosition = vec3(15.0, 15.0, 15.0);
const vec4 ltAmbient = vec4(0.2, 0.2, 0.2, 1.0);

in vec3 vNormal;
in vec3 vPosition;
in vec4 vColor;

out vec4 outColor;

void main()
{
    //
    // Compute vector from the vertex to the light
    vec3 vLight = normalize(ltPosition - vPosition);

    //
    // Compute diffuse lighting component
    float Idiff = dot(vLight, vNormal);
    Idiff = clamp(Idiff, 0.0, 1.0);
    vec4 diffuse = Idiff * vColor * ltEmission;
    diffuse.w = 1.0;

    //
    // Compute the specular lighting component
    vec3 vReflection = 2.0 * dot(vLight, vNormal) * vNormal - vLight;  // Reflection vector
    vec3 vViewing = normalize(uEye - vPosition);
    float dot = dot(vViewing, vReflection);
    float iSpecular = 0.0;
    if (dot > 0.0) {
        iSpecular = pow(dot, 10.0);
    }
    iSpecular = clamp(iSpecular, 0.0, 1.0);
    vec4 specular = iSpecular * mtSpecular * ltEmission;
    vec4 total = diffuse + specular + ltAmbient * vColor;
    total.a = vColor.a;

    outColor = total;
}
