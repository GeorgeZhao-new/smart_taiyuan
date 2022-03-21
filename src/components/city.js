import * as THREE from 'three'
import Effects from '../utils/effect'
import Shader from '../utils/shader'
import {
    Radar,
    Wall,
} from './effect/index'

const radarData = [
{
    position: {
        x: 666,
        y: 25,
        z: -202
    },
    radius: 220,
    color: '#efad35',
    opacity: 0.6,
    speed: 1
}];
const wallData = [{
    position: {
        x: -150,
        y: 15,
        z: 100
    },
    speed: 0.00001,
    color: '#ff0000',
    opacity: 0.6,
    radius: 200,
    height: 120,
    renderOrder: 5
}]

class City {
    constructor( scene, center ) {
        // this.fbxLoader = new FBXLoader();
        this.group = new THREE.Group();

        this.effectGroup = new THREE.Group();

        this.group.add(this.effectGroup);

        this.surroundLineMaterial = null;
        this.time = {
            value: 0
        };
        this.StartTime = {
            value: 0
        };
        this.isStart = false; // 是否启动
        this.group.add(scene);
        scene.traverse((child) => {
            // 城市效果
            if(child.isMesh){
                // 建筑
                child.geometry.computeBoundingBox();
                child.geometry.computeBoundingSphere();
                // 添加包围线条效
                this.surroundLine(child, center);
            }
        })

        this.init();
    }

    /**
     *  Loader Model
     */
    loadFbx(url) {
        return new Promise((resolve, reject) => {
            try {
                this.fbxLoader.load(url, (obj) => {
                    resolve(obj);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    init() {
        setTimeout(() => {
            this.isStart = true;
            // 加载扫描效果
            radarData.forEach((data) => {
                const mesh = Radar(data);
                mesh.material.uniforms.time = this.time;
                this.effectGroup.add(mesh);
            });
            // 光墙
            wallData.forEach((data) => {
                const mesh = Wall(data);
                mesh.material.uniforms.time = this.time;
                this.effectGroup.add(mesh);
            });
        }, 1000);
    }

    // Line
    /**
     * 获取包围线条效果
     */
    surroundLine(object,center) {
        // 获取线条geometry
        const geometry = Effects.surroundLineGeometry(object);
        // 获取物体的世界坐标 旋转等
        const worldPosition = new THREE.Vector3();
        object.getWorldPosition(worldPosition);

        // 传递给shader重要参数
        const {
            max,
            min
        } = object.geometry.boundingBox;

        const size = new THREE.Vector3(
            max.x - min.x,
            max.y - min.y,
            max.z - min.z
        );

        // this.effectGroup.add();
        const material = this.createSurroundLineMaterial({
            max,
            min,
            size
        }, center);

        const line = new THREE.LineSegments(geometry, material);

        line.name = 'surroundLine';

        line.scale.copy(object.scale);
        line.rotation.copy(object.rotation);
        line.position.copy(worldPosition);
        this.effectGroup.add(line);
    }

    /**
     * 创建包围线条材质
     */
    createSurroundLineMaterial({
        max,
        min,
        // size
    }, center) {
        if (this.surroundLineMaterial) return this.surroundLineMaterial;

        this.surroundLineMaterial = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                uColor: {
                    value: new THREE.Color("#cfcfcf")
                },
                uActive: {
                    value: new THREE.Color("#b3e5fc")
                },
                time: this.time,
                uOpacity: {
                    value: 0.6
                },
                uMax: {
                    value: max,
                },
                uMin: {
                    value: min,
                },
                uRange: {
                    value: 200
                },
                uSpeed: {
                    value: 0.2
                },
                uStartTime: this.StartTime,
                center: {
                    value: center
                }
            },
            vertexShader: Shader.surroundLine.vertexShader,
            fragmentShader: Shader.surroundLine.fragmentShader
        });

        return this.surroundLineMaterial;
    }

    animate = (dt) => {
        if (dt > 1) return false;
        this.time.value += dt;
        // 启动
        if (this.isStart) {
            this.StartTime.value += dt * 0.5;
            if (this.StartTime.value >= 1) {
                this.StartTime.value = 1;
                // this.isStart = false;
            }
        }
    }
}

export default City;