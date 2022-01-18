<template>
  <div id="app">
    <div id="three" class="three"></div>
  </div>
</template>

<script>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import CityClass from "./city";
import building from "../assets/building.json";
import road from "../assets/road.json";
import rivers from "../assets/rivers.json"
import { Water } from 'three/examples/jsm/objects/Water2'
import { MeshLine, MeshLineMaterial } from 'meshline';
import CreatRisePoint from './effect/CreatePoint'
const TWEEN = require('@tweenjs/tween.js')
export default {
  name: "App",
  mounted() {
    this.init();
    this.animate();
  },
  data() {
    return {
      group: [],
      group2: [],
      // 地图缩放等级
      shapeScaleSize: 1,
      faceColor: "#F8F8FF",
      sideColor: "#D3D3D3",
      shapeGeometryObj: {},
      cityCenter: {x:112.5454,y:37.851}
    };
  },
  methods: {
    async init() {
      this.isDown = false;
      this.clock = new THREE.Clock(); // 用于更新轨道控制器
      let container = document.getElementById("three");

      const fov = 75;
      const aspect = container.clientWidth / container.clientHeight;
      const near = 1;
      const far = 10000;
      this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this.camera.position.set(1000, 1000, 1000);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.TextureLoader().load('/smart-taiyuan/static/bg.jpg')
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.minDistance = 200;
      this.controls.maxDistance = 5000;
      this.controls.enablePan = true;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.autoRotate = true
      const outside =  new THREE.TextureLoader().load('/static/outside.jpg')
      outside.wrapS = outside.wrapT = THREE.RepeatWrapping
      const material2 = new THREE.ShaderMaterial({
            uniforms:{
                outside: {
                    value: outside
                }
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vPosition;
              varying vec2 vUv;
              void main() {
                //将attributes的normal通过varying赋值给了向量vNormal
                vNormal = normal;
                vPosition = position;
                vUv = uv;
                //projectionMatrix是投影变换矩阵 modelViewMatrix是相机坐标系的变换矩阵
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position.x, position.y, position.z, 1.0 );
              }
            `,
            fragmentShader: `
              uniform sampler2D outside;
              varying vec3 vNormal;
              varying vec3 vPosition;
              varying vec2 vUv;
              void main() {
                float cy = (fract((vPosition.z - 200.0) / 200.0) + 0.7) * 0.7;
                // 判断是否是顶面，是的话就纯色，不是的话就贴图
                if(vNormal.x==0.0&&vNormal.z==1.0&&vNormal.y==0.0){
                  cy = 0.1;
                  gl_FragColor = vec4(0.0, cy, cy, 1.0);
                } else {
                  vec4 color = vec4(0.0, cy, cy, 1.0);
                  vec4 color2 = texture2D(outside, vUv);
                  gl_FragColor = mix(color, color2, 0.75);
                }
              }
            `
          })
      const geometrys = [];
      // 遍历建筑的GeoJson文件
      building.features.forEach((item) => {
        if (item.geometry && item?.geometry.type === "Polygon") {
          // 拉高的参数
          const extrudeSettings = {
            depth: item.properties.Floor * 5,
            bevelEnabled: false,
          };
          const shape = new THREE.Shape();
          // 获取并计算xy坐标
          let [ x, y ] = this.calculationCoordinate(item.geometry.coordinates[0][0])
          // 移动到初始坐标
          shape.moveTo( x , y);
          item.geometry.coordinates[0].forEach((point) => {
            [ x, y ] = this.calculationCoordinate(point)
            // 连接后续坐标
            shape.lineTo(x , y);
          });
          // 将平面图形拉伸为3D图形
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          //添加数据组
          geometrys.push(geometry);
        }
      });
      // 将所有建筑合并为一个Geometries
      const geometry = mergeBufferGeometries(geometrys);
      const mesh = new THREE.Mesh(geometry, material2);
      mesh.rotation.x = -Math.PI / 2;
      // this.scene.add(mesh)
      const object = new THREE.Group();
      object.add(mesh);
      // 添加扫光动画和线条
      this.city = new CityClass(object);
      this.scene.add(this.city.group);
      const texture = new THREE.TextureLoader().load('/smart-taiyuan/static/point.png')
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      const green = new MeshLineMaterial({ useMap: 1,  map: texture, linewidth: 10})
      const red = new MeshLineMaterial({ color: '#9F6718', linewidth: 10 })
      const lines = new THREE.Object3D()
      // 遍历街道
      road.features.forEach(item => {
        const { name } = item.properties
        const points = []
        item.geometry.coordinates.forEach(point=>{
          const [ x, y ] = this.calculationCoordinate(point)
          points.push(new THREE.Vector3(x,y,0))
        })
        
        let curve = new THREE.CatmullRomCurve3(points)
        const pointsList = curve.getPoints( 50 );
        const geometry = new MeshLine()
        geometry.setPoints(pointsList)
        const line = new THREE.Mesh(geometry, (name?green:red))
        lines.add(line)
      })
      lines.position.y = -5
      lines.rotation.x = -Math.PI / 2;
      this.scene.add(lines)

      const riversGeometry = []
      rivers.features.forEach(item=>{
         if (item.geometry && item?.geometry.type === "Polygon" && ( item.properties.natural === 'water' || item.properties.leisure === 'park' )) {
           const shape = new THREE.Shape();
            // 获取并计算xy坐标
            let [ x, y ] = this.calculationCoordinate(item.geometry.coordinates[0][0])
            // 移动到初始坐标
            shape.moveTo( x , y);
            item.geometry.coordinates[0].forEach((point) => {
              [ x, y ] = this.calculationCoordinate(point)
              // 连接后续坐标
              shape.lineTo(x , y);
            });
            // 将平面图形拉伸为3D图形
            const geometry = new THREE.ShapeGeometry(shape);
            riversGeometry.push(geometry)
         }
      })
      const water = new Water(mergeBufferGeometries(riversGeometry), {
        color:'#0527AF',
        scale:10,
        flowDirection:new THREE.Vector2(1,1),
        textureWidth:1024,
        textureHeight:1024,
      })
      water.rotation.x = -Math.PI / 2;
      this.scene.add(water)

      //添加无人机
      new GLTFLoader().load('/smart-taiyuan/static/model/无人机/UAV.gltf', gltf => {
        const { scene } = gltf
        scene.position.set( 666,250,-202)
        this.mixer = new THREE.AnimationMixer(scene);
        this.mixer.clipAction(gltf.animations[0]).play();
        this.scene.add(scene)
      })
      this.isDown = true;

    // 添加粒子效果
    this.points = new CreatRisePoint()
    this.points.add({position: new THREE.Vector3(0,100,0),minRadius: 80,maxRadius: 1000,height: 500, size: 10,color: '#0527AF',number: 1000 })
    this.scene.add(this.points.group)
    this.addCircleAlarm()
    // this.renderer.addEffect(points)

      const light = new THREE.AmbientLight(0xadadad); // soft white light
      this.scene.add(light);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(100, 100, 0);
      this.scene.add(directionalLight);

      this.renderer.gammaInput = true;
      this.renderer.gammaOutput = true;
      container.appendChild(this.renderer.domElement);
    },
    animate() {
      if (this.isDown) {
        this.cObject.rotateZ(0.1)
        requestAnimationFrame(this.animate);
        TWEEN.update()
        const delta = this.clock.getDelta();
        if (this.city) {
          this.city.animate(delta);
        }
        if(this.points){
          this.points.animate(delta)
        }
        if (this.mixer) {
          this.mixer.update(delta)
          }
        this.controls.update();
        this.createCone(new THREE.Vector3(0,0,0),1)
        this.renderer.render(this.scene, this.camera);
      }
    },
    calculationCoordinate([x,y]){
      return [( x - this.cityCenter.x) * 12000 * this.shapeScaleSize, -(y - this.cityCenter.y) * 12000 * this.shapeScaleSize ]
    },
    addCircleAlarm(){
      this.cObject = new THREE.Object3D()
      const arcShapeDrn01 = new THREE.Shape();
      arcShapeDrn01.moveTo( 310, 0 );
			arcShapeDrn01.lineTo( 320, 0 );
			arcShapeDrn01.absarc( 0, 0, 320, 0, Math.PI * 2/4/6*5, false );
			arcShapeDrn01.absarc( 0, 0, 310,Math.PI * 2/4/6*5,0, true );
			const extrudeSettings = { depth: 300, bevelEnabled: false, bevelSegments: 9, steps: 2, bevelSize: 0, bevelThickness: 0,extrudeMaterial : 1 };
      const geometry = new THREE.ExtrudeGeometry( arcShapeDrn01, extrudeSettings );

      const txtu = new THREE.TextureLoader().load('/smart-taiyuan/static/wf.png')
      txtu.wrapS = txtu.wrapT = THREE.ClampToEdgeWrapping; // CHANGED
      txtu.offset.set( 0, 0.5 ); // CHANGED
      txtu.repeat.set( 0.01, 0.01 ); // CHANGED
      const material =new THREE.MeshBasicMaterial( { map: txtu, transparent: true,  opacity: 0.8 } )
      const mesh = new THREE.Mesh( geometry,material );
      for(let i = 1; i < 5; i++ ){
        const nMesh = mesh.clone()
        nMesh.rotateZ(Math.PI*2/4*i)
        this.cObject.add(nMesh)
      }
      this.cObject.position.y = 300
      this.cObject.rotateX(Math.PI / 2)
      this.cObject.scale.set(0.2,0.2,0.2)
      this.scene.add(this.cObject)
    },
    createCone(position, index) {
    const coneImg = ['/smart-taiyuan/static/lightray_yellow.jpg','/smart-taiyuan/static/lightray.jpg']
    const HEXAGON_RADIUS = 5
    let texture = new THREE.TextureLoader().load(coneImg[index]),
        material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        }),
        // height = Math.random() * 50,
        height= 200,
        geometry = new THREE.PlaneGeometry(HEXAGON_RADIUS * 2, height),
        matrix1 = new THREE.Matrix4,
        plane1 = new THREE.Mesh(geometry, material)
    matrix1.makeRotationX(Math.PI / 2)
    matrix1.setPosition(new THREE.Vector3(0, 0, height / -2))
    geometry.applyMatrix(matrix1)
    let plane2 = plane1.clone()
    plane2.rotation.z = Math.PI / 2
    plane1.add(plane2)
    plane1.position.copy(position)
    
    plane1.rotation.x = Math.PI / 2
    // plane1.lookAt(0, 0, 0)
    this.scene.add(plane1)
}
  },
};
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

.three {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
}
</style>
