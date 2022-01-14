import * as THREE from 'three'
export const addMaterial = ( object ) => {
    const time = { value: 0 }
    const StartTime = { value: 0 }
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
    const { geometry, material } = object;
    const { center, radius } = geometry.boundingSphere;
    const { max, min } = geometry.boundingBox;
    const size = new THREE.Vector3(
        max.x - min.x,
        max.y - min.y,
        max.z - min.z
    );
    material.transparent = true;
    material.color.setStyle("#1B3045");

    material.onBeforeCompile = (shader) => {
        console.log('更新');
        shader.uniforms.time = time;
        shader.uniforms.uStartTime = StartTime;
        
        // 中心点
        shader.uniforms.uCenter = {
            value: center
        }
        // geometry大小
        shader.uniforms.uSize = {
            value: size
        }
        shader.uniforms.uMax = {
            value: max
        }
        shader.uniforms.uMin = {
            value: min
        }
        shader.uniforms.uTopColor = {
            value: new THREE.Color('#FFFFDC')
        }
        // 效果开关
        shader.uniforms.uSwitch = {
            value: new THREE.Vector3(
                0, // 扩散
                0, // 左右横扫
                0 // 向上扫描
            )
        };
        // 扩散
        shader.uniforms.uDiffusion = {
            value: new THREE.Vector3(
                1, // 0 1开关
                120, // 范围
                600 // 速度
            )
        };
        // 扩散中心点
        shader.uniforms.uDiffusionCenter = {
            value: new THREE.Vector3(
                0, 0, 0
                )
        };

                // 扩散中心点
                shader.uniforms.uFlow = {
                    value: new THREE.Vector3(
                        1, // 0 1开关
                        10, // 范围
                        20 // 速度
                    )
                };

                // 效果颜色
                shader.uniforms.uColor = {
                    value: new THREE.Color("#5588aa")
                }
                // 效果颜色
                shader.uniforms.uFlowColor = {
                    value: new THREE.Color("#5588AA")
                }

                // 效果透明度
                shader.uniforms.uOpacity = {
                    value: 1
                }

                // 效果透明度
                shader.uniforms.uRadius = {
                    value: radius
                }

                /**
                 * 对片元着色器进行修改
                 */
                const fragment = `
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
                        `;
                                const fragmentColor = `
                    vec3 distColor = outgoingLight;
                    float dstOpacity = diffuseColor.a;
                    
                    float indexMix = vPosition.z / (uSize.z * 0.6);
                    distColor = mix(distColor, uTopColor, indexMix);
                    
                    // 开启扩散波
                    vec2 position2D = vec2(vPosition.x, vPosition.y);
                    if (uDiffusion.x > 0.5) {
                        // 扩散速度
                        float dTime = mod(time * uDiffusion.z, uRadius * 2.0);
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
                `;
                shader.fragmentShader = shader.fragmentShader.replace("void main() {", fragment)
                shader.fragmentShader = shader.fragmentShader.replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );", fragmentColor);



                /**
                 * 对顶点着色器进行修改
                 */
                const vertex = `
                    varying vec4 vPositionMatrix;
                    varying vec3 vPosition;
                    uniform float uStartTime;
                    void main() {
                    vPositionMatrix = projectionMatrix * vec4(position, 1.0);
                    vPosition = position;
                `
                const vertexPosition = `
                    vec3 transformed = vec3(position.x, position.y, position.z * uStartTime);
                `

                shader.vertexShader = shader.vertexShader.replace("void main() {", vertex);
                shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", vertexPosition);
        }
        return (dt) => {
            if (dt > 1) return false;
                time.value += dt;
        
                // 启动
                // if (isStart) {
                    StartTime.value += dt * 0.5;
                    if (StartTime.value >= 1) {
                        StartTime.value = 1;
                        // this.isStart = false;
                    }
                // }
            }
    }