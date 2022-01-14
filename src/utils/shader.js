const base = `
precision mediump float;

float distanceTo(vec2 src, vec2 dst) {
    float dx = src.x - dst.x;
    float dy = src.y - dst.y;
    float dv = dx * dx + dy * dy;
    return sqrt(dv);
} 

float lerp(float x, float y, float t) {
    return (1.0 - t) * x + t * y;
}

#define PI 3.14159265359
#define PI2 6.28318530718

`
const surroundLine = {
    // 顶点着色器
    vertexShader: `
    #define PI 3.14159265359

    uniform mediump float uStartTime;
    uniform mediump float time;
    uniform mediump float uRange;
    uniform mediump float uSpeed;

    uniform vec3 uColor;
    uniform vec3 uActive;
    uniform vec3 uMin;
    uniform vec3 uMax;

    varying vec3 vColor;

    float lerp(float x, float y, float t) {
        return (1.0 - t) * x + t * y;
    }
    void main() { 
        if (uStartTime >= 0.99) {
            float iTime = mod(time * uSpeed - uStartTime, 1.0);
            float rangeY = lerp(uMin.y, uMax.y, iTime);
            if (rangeY < position.y && rangeY > position.y - uRange) {
                float index = 1.0 - sin((position.y - rangeY) / uRange * PI);
                float r = lerp(uActive.r, uColor.r, index);
                float g = lerp(uActive.g, uColor.g, index);
                float b = lerp(uActive.b, uColor.b, index);

                vColor = vec3(r, g, b);
            } else {
                vColor = uColor;
            }
        }
        vec3 vPosition = vec3(position.x, position.y, position.z * uStartTime);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
    } 
    `,
    // 片元着色器
    fragmentShader: ` 
    ${base} 
    uniform float time;
    uniform float uOpacity;
    uniform float uStartTime;

    varying vec3 vColor; 

    void main() {

        gl_FragColor = vec4(vColor, uOpacity * uStartTime);
    }
    `
}

const fragmentShader = `#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

    float distanceTo(vec2 src, vec2 dst) {
        float dx = src.x - dst.x;
        float dy = src.y - dst.y;
        float dv = dx * dx + dy * dy;
        return sqrt(dv);
    }

    float lerp(float x, float y, float t) {
        return (1.0 - t) * x + t * y;
    }

    vec3 getGradientColor(vec3 color1, vec3 color2, float index) {
        float r = lerp(color1.r, color2.r, index);
        float g = lerp(color1.g, color2.g, index);
        float b = lerp(color1.b, color2.b, index);
        return vec3(r, g, b);
    }

    varying vec4 vPositionMatrix;
    varying vec3 vPosition;

    uniform float time;
    // 扩散参数
    uniform float uRadius;
    uniform float uOpacity;
    // 初始动画参数
    uniform float uStartTime; 

    uniform vec3 uMin;
    uniform vec3 uMax;
    uniform vec3 uSize;
    uniform vec3 uFlow;
    uniform vec3 uColor;
    uniform vec3 uCenter;
    uniform vec3 uSwitch;
    uniform vec3 uTopColor;
    uniform vec3 uFlowColor;
    uniform vec3 uDiffusion; 
    uniform vec3 uDiffusionCenter;

    void main() {
        
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	
    vec3 distColor = outgoingLight;
    float dstOpacity = diffuseColor.a;
    
    float indexMix = vPosition.z / (uSize.z * 0.6);
    distColor = mix(distColor, uTopColor, indexMix);
    
    // 开启扩散波
    vec2 position2D = vec2(vPosition.x, vPosition.y);
    if (uDiffusion.x > 0.5) {
        // 扩散速度
        float dTime = mod(time * uDiffusion.z, uRadius * 0.5);
        // 当前的离中心点距离
        float uLen = distanceTo(position2D, vec2(uCenter.x, uCenter.z));

        // 扩散范围
        if (uLen < dTime && uLen > dTime - uDiffusion.y) {
            // 颜色渐变
            float dIndex = sin((dTime - uLen) / uDiffusion.y * PI);
            distColor = mix(uColor, distColor, 1.0 - dIndex);
        }
    }

    // 流动效果
    if (uFlow.x > 0.5) {
        // 扩散速度
        float dTime = mod(time * uFlow.z, uSize.z); 
        // 流动范围
        float topY = vPosition.z + uFlow.y;
        if (dTime > vPosition.z && dTime < topY) {
            // 颜色渐变 
            float dIndex = sin((topY - dTime) / uFlow.y * PI);

            distColor = mix(distColor, uFlowColor,  dIndex); 
        }
    }
  

    gl_FragColor = vec4(distColor, dstOpacity * uStartTime);
        
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`

const vertexShader = `#define PHONG
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

    varying vec4 vPositionMatrix;
    varying vec3 vPosition;
    uniform float uStartTime;
    void main() {
            vPositionMatrix = projectionMatrix * vec4(position, 1.0);
            vPosition = position;
            
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
#endif
	
    vec3 transformed = vec3(position.x, position.y, position.z * uStartTime);
            
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`
export default {
    base,
    surroundLine,
    fragmentShader,
    vertexShader
}