<template>
  <div id="app">
    <div id="three" style="width: 100%; height: 2870px"></div>
  </div>
</template>

<script>
import * as Three from 'three'
// import * as GeoTIFF from "geotiff";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
// import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
// import data from './assets/太原.json'

// const d3geo = require('d3-geo')

export default {
  name: 'App',
  mounted(){
    this.init();
    this.animate()
  },
  data(){
    return{
      group:[],
      group2: []
    }
  },
  methods: {
    async init() {
        let container = document.getElementById('three');

        const fov = 75;
        const aspect = container.clientWidth/container.clientHeight;
        const near = 0.1;
        const far = 10000;
        this.camera = new Three.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(1000, 1000, 1000);
        this.camera.layers.set(0)
 
 
        this.scene = new Three.Scene();
        this.scene.background = new Three.Color(0x050D1F);
        this.renderer = new Three.WebGLRenderer({antialias: true,alpha: true});
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;//关键
        this.renderer.shadowMapSoft = true;//关键
        this.renderer.shadowMap.type = Three.PCFSoftShadowMap;//关键
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.minDistance = 200
        this.controls.maxDistance = 5000
        this.controls.enablePan = true
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.05
        // const projection = d3geo.geoMercator().center([112.550863589, 37.890277054]).scale(150000).rotate(Math.PI / 4).translate([0,0]);

        // data.features.forEach(item => {
        //   // const building = new Three.Object3D()
        //   const coordinates = item.geometry?.coordinates
        //   // const h = item.properties.Floor * 50
        //   coordinates?.forEach(multiPolygon => {
        //     multiPolygon.forEach(polygon => {
        //       console.log(polygon);
        //     })
        //   })
        //   // this.scene.add(building)
        // });
        
        const loader = new GLTFLoader().setPath('/static/model/')
        loader.load('taiyuan.glb', scene => {
            // color: "#57d8ff",
          // const sphereMaterial = new Three.MeshLambertMaterial({
          //   color: '#57d8ff',
          //   opacity: 0.8,
          //   transparent:true
          // })

          // 渐变材质
          this.sphereMaterial = new Three.ShaderMaterial({
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vPosition;
              void main() {
                //将attributes的normal通过varying赋值给了向量vNormal
                vNormal = normal;
                vPosition = position;
                //projectionMatrix是投影变换矩阵 modelViewMatrix是相机坐标系的变换矩阵
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position.x, position.y, position.z, 1.0 );
              }
            `,
            fragmentShader: `
              varying vec3 vNormal;
              varying vec3 vPosition;
              void main() {
                float cy = (fract((vPosition.y - 200.0) / 40.0) + 0.7) * 0.7;
                if(vNormal.x==0.0&&vNormal.y==1.0&&vNormal.z==0.0){
                  cy = 1.0;
                }
              gl_FragColor = vec4(0.0, cy, cy, 1.0);
              }
            `
          })

          //扫光材质
          const Shader = {
            vertexShader: ` 
                varying vec3 vp;
                void main(){
                  vp = position; 
                  gl_Position	= projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vp;
                uniform vec3 u_color;
                uniform vec3 u_tcolor;
                uniform float u_r;
                uniform float u_length;
                uniform float u_max;
                float getLeng(float x, float y){
                    return  sqrt((x-0.0)*(x-0.0)+(y-0.0)*(y-0.0));
                }
                void main(){ 
                    float uOpacity = 0.3; 
                    vec3 vColor = u_color;
                    float uLength = getLeng(vp.x,vp.z);
                    if ( uLength <= u_r && uLength > u_r - u_length ) { 
                        float op = sin( (u_r - uLength) / u_length ) ;
                        uOpacity = op; 
                        if( vp.y<0.0){
                            vColor = u_color * op;
                        }else{ 
                            vColor = u_tcolor;
                        };
                    } 
                    gl_FragColor = vec4(vColor,uOpacity);
                }
            `
        }
          this.material = new Three.ShaderMaterial({
            vertexShader: Shader.vertexShader,
            fragmentShader: Shader.fragmentShader,
            side: Three.DoubleSide,
            uniforms: {
              u_color: { value: new Three.Color("#5588aa") },
              u_tcolor: { value: new Three.Color("#f55c1a") },
              u_r: { value: 0.25 },
              u_length: { value: 10 },//扫过区域
              u_max: { value: 300 }//扫过最大值
            },
              transparent: true,
              depthWrite: false,
          });

          scene.scene.traverse(item => {
            if(item.isMesh){
              item.castShadow = true;//关键
              item.receiveShadow = true;
              item.material = this.material
            }
          })



          scene.scene.scale.set(100,100,100)
          this.scene.add(scene.scene)

          // const renderPass = new RenderPass(this.scene, this.camera);
          // this.composer = new EffectComposer(this.renderer);
          /**
         * UnrealBloomPass的参数
         * 1:辉光所覆盖的场景大小
         * 2：辉光的强度
         * 3：辉光散发的半径
         * 4：辉光的阈值（场景中的光强大于该值就会产生辉光效果）
         */
          // const unrealBloomPass = new UnrealBloomPass(new Three.Vector2(container.clientWidth, container.clientHeight), 0.2, 0.1, 0.5);
          // unrealBloomPass.renderToScreen = true;
          // this.composer.addPass(renderPass);
          // this.composer.addPass(unrealBloomPass);
          // this.renderer.autoClear = false;
          // this.composer.render(new Three.Clock().getDelta());
        //   const s2 = scene.scene.clone()
        //   s2.scale.set(100,105,100)
        //   s2.traverse( item => {
        //     if(item.isMesh){
        //       item.material = new Three.MeshStandardMaterial({ 
        //         color: '#1e90ff',
        //         opacity: 0.5,
        //         transparent:true 
        //       })
        //     }
        //   })
        // this.scene.add(s2)
        this.renderer.render(this.scene, this.camera);
        })

        // new Three.TextureLoader().load('/static/map.png', img => {
        //   const material = new Three.MeshLambertMaterial({ map: img })
        //   const geometry = new Three.PlaneGeometry(1024, 1280)
        //   const mesh = new Three.Mesh(geometry, material)
        //   mesh.rotation.x = Three.MathUtils.degToRad(-90)
        //   mesh.scale.set(8,10,8)
        //   mesh.position.x = -450
        //   mesh.position.y = 100
        //   mesh.position.z = 200
        //   this.scene.add(mesh)
        // })

        // 读取高程数据
        // const rawTiff = await GeoTIFF.fromUrl('/static/model/tiff/ASTGTM2_N37E112_dem.tif');
        // const tifImage = await rawTiff.getImage();
        // const image = {
        //   width: tifImage.getWidth(),
        //   height: tifImage.getHeight()
        // };
        // const geometry = new Three.PlaneGeometry(
        //   image.width,
        //   image.height,
        //   image.width - 1,
        //   image.height - 1
        // );

        // const data = await tifImage.readRasters({ interleave: true });
        // console.time("parseGeom");
        // const arr1 = new Array(geometry.attributes.position.count);
        // const arr = arr1.fill(1);
        // arr.forEach((a, index) => {
        //   geometry.attributes.position.setZ(index, (data[index] / 10) * -1);
        // });
        // console.timeEnd('parseGeom');
        // const mesh = new Three.Mesh(geometry, new Three.MeshBasicMaterial( {color: 0xffff00, side: Three.DoubleSide} ))
        // this.scene.add(mesh)
        // this.camera.lookAt(mesh)
        // console.log(mesh);
        // this.renderer.render(this.scene, this.camera);

        const ambientLight = new Three.AmbientLight(0x444444)
        const pointLight = new Three.PointLight(0xffffff);
        // 将灯光加入到场景中
        this.scene.add(ambientLight)
        // 将灯光加到摄像机中 点光源跟随摄像机移动
        // 为什么这样做  因为这样可以让后期处理时的辉光效果更漂亮 
        this.camera.add(pointLight);

        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
        this.clock = new Three.Clock()// 用于更新轨道控制器
        container.appendChild(this.renderer.domElement);
    },
    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update()
        const delta = this.clock.getDelta()
        if(this.material){
          this.material.uniforms.u_r.value += delta * 10;
          if (this.material.uniforms.u_r.value >= 300) {
              this.material.uniforms.u_r.value = 20
          }
        }
        

        this.renderer.render(this.scene, this.camera);
        // this.renderer.autoClear = false;
        // this.composer.render(new Three.Clock().getDelta());
    },
    calcPosition(lng, lat, alt = 0) {
    const phi = (90-lat)*(Math.PI/180),
        theta = (lng+180)*(Math.PI/180),
        radius = alt+200,
        x = -(radius * Math.sin(phi) * Math.cos(theta)),
        z = (radius * Math.sin(phi) * Math.sin(theta)),
        y = (radius * Math.cos(phi));
    return {x: x, y: y, z: z};
}
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
