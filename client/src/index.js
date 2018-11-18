import * as THREE from 'three';
import skeletonMap from './skeletonMap';

let player = null;
let poseFrames = null;
let hasData = false;
let frame = 0;

const skeletonOrder = [
    "Nose",
    "Neck",
    "RShoulder",
    "RElbow",
    "RWrist",
    "LShoulder",
    "LElbow",
    "LWrist",
    "RHip",
    "RKnee",
    "RAnkle",
    "LHip",
    "LKnee",
    "LAnkle",
    "LHeel",
    "RHeel"
];


const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, precision: 'mediump' });

renderer.setClearColor(0x222222);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight + 20);

document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.z = 5;
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

    console.log(player.skeleton.bones[11])


    player.scale.set(0.02, 0.02, 0.02)



    player.position.y = -100 * Math.PI / 180;
    scene.add(player);

    const skeletonHelper = new THREE.SkeletonHelper(player);
    scene.add(skeletonHelper);

    loadPoseData();


}


const loadPoseData = async () => {

    try {

        poseFrames = await ( await fetch('http://localhost:1337/data/pose') ).json();
        poseFrames = poseFrames.poseFrames;

        if (!poseFrames) {
            throw new Error('poseFrames is undefined');
        }

        poseFrames.map(poseFrame => {

            const pose = poseFrame.people[0].pose_keypoints_2d;

            for (let i = 0, j = 0; i < pose.length; i += 3, j++) {

                const bone = skeletonOrder[j];

                if (!bone) break;

                player.skeleton.bones.forEach((tmpBone, i) => {
                    if (skeletonMap[bone].bones.includes( tmpBone.name.replace('Fbx01_', '') ) && !skeletonMap[bone].boneIndexes.includes(i)) {
                            skeletonMap[bone].boneIndexes.push(i);
                    }
                });

                const x = pose[i];
                const y = pose [i + 1];
                const poseVec = new THREE.Vector3(x,y);
                skeletonMap[bone].data.push(poseVec);
            }

        });

        console.log(skeletonMap);
        hasData = true;


    } catch (e) {
        console.error('error fetching: ' + e);
    }

}

const init = () => {
    loadModel();
}



window.onload = init;

(function render() {
    setTimeout(() => {
        requestAnimationFrame(render);
    }, 1000 / 30)

    if (player && hasData) {
        player.rotation.y += 0.05;
        if (frame >= skeletonMap['RShoulder'].data.length) {
            frame = 0;
        }


        const shoulder = skeletonMap['RShoulder'];
        const elbow = skeletonMap['RElbow'];
        const wrist = skeletonMap['RWrist'];

        const sparent = skeletonMap[shoulder.parent];
        const eparent = skeletonMap[elbow.parent];
        const wparent = skeletonMap[wrist.parent];

        const sv = shoulder.data[0].clone().sub(sparent.data[0].clone()).normalize();
        const ev = elbow.data[0].clone().sub(eparent.data[0].clone()).normalize();
        const wv = wrist.data[0].clone().sub(wparent.data[0].clone()).normalize();

        const sangle = new THREE.Euler().setFromVector3(sv);
        const eangle = new THREE.Euler().setFromVector3(ev);
        const wangle = new THREE.Euler().setFromVector3(wv);

        const sb = player.skeleton.bones[19];
        const eb = player.skeleton.bones[20];
        const wb = player.skeleton.bones[21];
        // shoulder
        sb.rotation.x = sangle.x * 180 / Math.PI;
        // sb.rotation.y = sangle.y * 180 / Math.PI;
        sb.position.x = sv.x * Math.PI;
        sb.position.y = sv.y * Math.PI;
        // player.skeleton.bones[19].rotation.y = (sangle.y);

        // upperarm
        eb.rotation.x = eangle.x * 180 / Math.PI;
        eb.position.x = ev.x * Math.PI
        eb.position.y = ev.y * Math.PI
        // player.skeleton.bones[20].rotation.y = (eangle.y);

        // wrist
        wb.rotation.x = wangle.x * 180 / Math.PI;
        // player.skeleton.bones[21].rotation.y = (wangle.y);


        // skeletonOrder.forEach(current => {
        //     const { bones, data, boneIndexes } = skeletonMap[current];
        //     bones.forEach((bone, boneIndex) => {
        //         const index = boneIndexes[boneIndex];
        //         const x1 = data[frame].x;
        //         const y1 = data[frame + 1].y;
        //         const x2 = data[frame + 2].x;
        //         const y2 = data[frame + 3].y;
        //
        //
        //         if (x1 && x2 && y1 && y2) {
        //             const x = (x1 - x2) / Math.PI;
        //             const y = (y1 - y2) / Math.PI;
        //
        //             const v = new THREE.Vector3(x,y);
        //
        //             player.skeleton.bones[index].position.x = v.x * Math.PI
        //             player.skeleton.bones[index].position.y = v.y * Math.PI
        //
        //
        //
        //         } else {
        //             frame = 0;
        //         }
        //
        //
        //     });
        // });
        frame++;
    }

    renderer.render(scene, camera);

})();
