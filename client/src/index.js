import * as THREE from 'three';
import skeletonMap from './skeletonMap';

let player = null;
let hasData = false;
let mixer = null;

const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, precision: 'mediump' });

renderer.setClearColor(0x222222);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight + 20);


document.body.appendChild(renderer.domElement);


const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.z = 8;
camera.position.y = 0.2;


const scene = new THREE.Scene();

const planeGeometry = new THREE.PlaneGeometry(2500, 10000, 1, 1);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -90 * Math.PI / 180;
plane.position.y = -100;
scene.add(plane);


const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(-30, 10, 0);
scene.add(light);


const loadModel = async () => {

    const playerLoader = new THREE.ObjectLoader();
    const playerTexture = new THREE.TextureLoader().load('models/player.jpeg');

    const playerMaterial = new THREE.MeshLambertMaterial({ map: playerTexture });

    player = await new Promise(resolve => {
        playerLoader.load('models/character.json', (geometry, materials) => {
                resolve(geometry.children[0])
            });
    });

    player.scale.set(0.02, 0.02, 0.02)

    player.position.y = -100 * Math.PI / 180;
    scene.add(player);

    const skeletonHelper = new THREE.SkeletonHelper(player);
    scene.add(skeletonHelper);

    loadPoseData();

}


const loadPoseData = async () => {

    const { poseFrames } = await ( await fetch('http://localhost:1337/data/pose') ).json();

    const tracks = {};
    const tmpVector = new THREE.Vector3();
    mixer = new THREE.AnimationMixer(player);
    const frames = poseFrames.length;;

    for (let i = 0; i < frames; i++) {

        for (let j = 0; j < skeletonMap.length; j++) {

            const keypoint = skeletonMap[j];

            const frame = poseFrames[i].people[0].pose_keypoints_2d;

            const currentKeypointX = frame[keypoint.index * 3];
            const currentKeypointY = frame[keypoint.index * 3 + 1 ];

            const parentKeypointX = frame[keypoint.parentIndex * 3];
            const parentKeypointY = frame[keypoint.parentIndex * 3 + 1];

            const playerBone = player.skeleton.bones.find(x => x.name === keypoint.boneName);
            const parentBone = playerBone.parent;

            if (!(currentKeypointX && currentKeypointY) || !(parentKeypointX && parentKeypointY)) continue;

            if (!(keypoint.boneName in tracks)) {
                const track = new THREE.QuaternionKeyframeTrack(`${keypoint.boneName}.quaternion`, new Float32Array(frames), new Float32Array(frames * 4));
                tracks[keypoint.boneName] = track;
            }

            const track = tracks[keypoint.boneName];

            track.times[i] = (i + 1) * 1 / 30;

            const currentBoneVector = new THREE.Vector3(currentKeypointX, currentKeypointY, 0);
            const parentBoneVector = new THREE.Vector3(parentKeypointX, parentKeypointY, 0);

            const tmp = currentBoneVector.clone().sub(parentBoneVector).normalize();

            playerBone.updateMatrix();
            playerBone.updateMatrixWorld();
            playerBone.lookAt(playerBone.getWorldPosition(tmpVector).clone().add(tmp));


            const angle = playerBone.quaternion.angleTo(new THREE.Quaternion());
            const axis = playerBone.clone().getWorldDirection(new THREE.Vector3()).normalize();

            const offsetQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            playerBone.quaternion.premultiply(offsetQuaternion);


            // const cross = parentBoneVector.clone().cross(currentBoneVector.clone()).normalize();
            // const w = Math.sqrt(currentBoneVector.lengthSq() * parentBoneVector.lengthSq()) + parentBoneVector.dot(currentBoneVector);

            //
            // const tmpquat = new THREE.Quaternion().setFromRotationMatrix(mat4);
            //

            // // // playerBone.quaternion.rotateTowards(parentBone.quaternion, offset);
            // //
            //
            // const tmpquat = new THREE.Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, offset);
            // playerBone.quaternion.premultiply(tmpquat);



            track.values[4 * i + 0] = playerBone.quaternion.x;
            track.values[4 * i + 1] = playerBone.quaternion.y;
            track.values[4 * i + 2] = playerBone.quaternion.z;
            track.values[4 * i + 3] = playerBone.quaternion.w;

            // playerBone.quaternion.setFromRotationMatrix(mat4);

            // playerBone.quaternion.copy({ x: cross.x, y: cross.y, z: cross.z, w: w }).normalize();


            // const pos = new THREE.Vector3().copy(playerBone.position).add(currentBoneVector);
            // playerBone.lookAt(pos);

        }

    }

    const clip = new THREE.AnimationClip('pose', frames, Object.values(tracks)).optimize();

    const action = mixer.clipAction(clip).play();

    hasData = true;

    const video = document.querySelector('video');
    video.play();

    player.rotation.y = Math.PI;


}

const init = () => {
    loadModel();
}


window.onload = init;

(function render() {


    if (player && hasData && mixer) {
        mixer.update(clock.getDelta());
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);


})();
