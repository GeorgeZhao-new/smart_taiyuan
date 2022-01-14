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
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
// import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { Water } from 'three/examples/jsm/objects/Water2'
import { MeshLine, MeshLineMaterial } from 'meshline';
import CreatRisePoint from './effect/CreatePoint'
// import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
// import  createPyramid from './mesh/Pyramid'
const TWEEN = require('@tweenjs/tween.js')
// import  * as SceneUtils from 'three/examples/jsm/utils/SceneUtils'
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
      const material = new THREE.MeshBasicMaterial({ color: "#2194ce" });
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
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      const object = new THREE.Group();
      object.add(mesh);
      // 添加扫光动画和线条
      this.city = new CityClass(object);
      this.scene.add(this.city.group);

      // const green = new THREE.LineBasicMaterial({color: '##0CF6C4', linewidth: 10,})
      // const red = new THREE.LineBasicMaterial({ color: '#9F6718', linewidth: 10 })
      const texture = new THREE.TextureLoader().load('/smart-taiyuan/static/point.png')
      // const texture2 = new THREE.TextureLoader().load('/static/guiji.png')
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
      // this.mark = createPyramid()
      // this.mark.position.set(666,250,-202)
      // this.scene.add(this.mark)

      //添加无人机
      new GLTFLoader().load('/smart-taiyuan/static/model/无人机/UAV.gltf', gltf => {
        const { scene } = gltf
        scene.position.set( 666,250,-202)
        this.mixer = new THREE.AnimationMixer(scene);
        this.mixer.clipAction(gltf.animations[0]).play();
        this.scene.add(scene)
      })
      this.isDown = true;

    //   const renderPass = new RenderPass(this.scene, this.camera);
    //   this.composer = new EffectComposer(this.renderer);
    //   /**
    //    * UnrealBloomPass的参数
    //    * 1:辉光所覆盖的场景大小
    //    * 2：辉光的强度
    //    * 3：辉光散发的半径
    //    * 4：辉光的阈值（场景中的光强大于该值就会产生辉光效果）
    //    */
    //   const unrealBloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.2, 0.1, 0.5);
    //   unrealBloomPass.renderToScreen = true;
    //   this.composer.addPass(renderPass);
    //   this.composer.addPass(unrealBloomPass);
    //   this.renderer.autoClear = false;

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
        // this.mark.rotateY(0.1)
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
        // this.composer.render(delta)
        // this.texture.offset.x -=0.01
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
      // let geometry = new THREE.ShapeGeometry( arcShapeDrn01 );
			const extrudeSettings = { depth: 300, bevelEnabled: false, bevelSegments: 9, steps: 2, bevelSize: 0, bevelThickness: 0,extrudeMaterial : 1 };
      const geometry = new THREE.ExtrudeGeometry( arcShapeDrn01, extrudeSettings );

      const txtu = new THREE.TextureLoader().load('/smart-taiyuan/static/wf.png')
      txtu.wrapS = txtu.wrapT = THREE.ClampToEdgeWrapping; // CHANGED
      txtu.offset.set( 0, 0.5 ); // CHANGED
      txtu.repeat.set( 0.01, 0.01 ); // CHANGED
      const material =new THREE.MeshBasicMaterial( { map: txtu, transparent: true,  opacity: 0.8 } )
      // const m1 = new THREE.MeshBasicMaterial()
      // const fs = new new THREE.MeshFaceMaterial([m1,material]);
      // const ms = new THREE.Mesh(geometry, material);
      // this.scene.add(ms)
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
    // addTrafficAlarm(object){
    //     const { position, name, url } = object
    //     const [ x, y ] = this.calculationCoordinate(position)
        
    // }
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
