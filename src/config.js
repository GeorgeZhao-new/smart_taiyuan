export const vertexShaders = `
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
        vNormal = normal;
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
    }
`

export const fragmentShaders = `
uniform float time;
varying vec2 vUv;
uniform sampler2D colorTexture;
uniform sampler2D colorTexture1;
varying vec3 vNormal;
varying vec3 vPosition;
void main( void ) {
    vec2 position = vUv;
    vec3 tempNomal= normalize(vNormal);
    float power=step(0.95,abs(tempNomal.y));
    vec4 colorb=texture2D(colorTexture1,position.xy);
    vec4 colora = texture2D(colorTexture,vec2(vUv.x,fract(vUv.y-time))); 
    if(power>0.95){
        gl_FragColor =colorb;
    }else{
        gl_FragColor =colorb+colorb*colora;      
    }         
}
`