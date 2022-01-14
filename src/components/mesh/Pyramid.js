import * as THREE from 'three'
    const createPyramid = function() {
    let geometry = new THREE.CylinderBufferGeometry( 0,6.4,11,4,1,false,0,6.3);
    // geometry.scale(geometryScale.x,geometryScale.y,geometryScale.z);
    geometry.computeBoundingSphere();
    // let  material = new THREE.ShaderMaterial({
    //     uniforms: uniforms,
    //     vertexShader: shader.vs ,
    //     fragmentShader: shader.fs,
    //     side:THREE.DoubleSide,
    //     transparent:true

    // });
    let  material = new THREE.MeshPhongMaterial({ color: '#5588aa' })
    const mesh = new THREE.Mesh(geometry,material)
    mesh.scale.set(4,4,4)
    mesh.rotateZ(Math.PI)
    return mesh
}

export default createPyramid

// const shader = {
//     vs: `
//     varying vec2 vUv;
//     void main(){
//         vUv = uv;
//         gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4( position, 1.0 );
//     }
//     `,
//     fs: `
//     uniform float time;
//     varying vec2 vUv;
//     uniform sampler2D dtPyramidTexture;
//     uniform vec3 uColor;
//     void main() {
//         vec2 st = vUv;
//         vec4 colorImage = texture2D(dtPyramidTexture, vec2(vUv.x,fract(vUv.y-time)));
//         vec3 diffuse =(1.0-colorImage.a)*vec3(0.8,1.0,0.0)+colorImage.rgb*vec3(0.8,1.0,0);
//         gl_FragColor = vec4(diffuse,0.7);
//     }
//     `
// }

// const uniforms = {
//     dtPyramidTexture: {
//         value: new THREE.TextureLoader().load('/static/gradual_blue_01.png')
//     },
//     time: {
//         value: 0.0
//     },
//     uColor:{
//         value:new THREE.Color("#5588aa")
//     }
// }