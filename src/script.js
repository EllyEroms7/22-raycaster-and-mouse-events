import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Objects/Physics for Jenga
 */

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.8, 0),
})

world.gravity.set(0, -5, 0)

// Max solver iterations: Use more for better force propagation, but keep in mind that it's not very computationally cheap!
world.solver.iterations = 50

// Tweak contact properties.
// Contact stiffness - use to make softer/harder contacts
world.defaultContactMaterial.contactEquationStiffness = 5e6

// Stabilization time in number of timesteps
world.defaultContactMaterial.contactEquationRelaxation = 3


const cannonDebugger = new CannonDebugger(scene, world, {
    color: 0xff00f9
})

const blocksPerRow = 3 // same as column

const blockWidth = 3

const blockHeight = 2

const blockBreadth = blockWidth * blocksPerRow

const totalWidth = blocksPerRow * blockWidth

const numOfRows = blocksPerRow * 3

const totalHeight = blockHeight * numOfRows

const offsetX = totalWidth / 2 - blockWidth / 2;

const offsetY = totalHeight / 2 - blockHeight / 2;

const blocks = []

let block

let body

for (let row = 0; row < numOfRows; row++) {
    for (let col = 0; col < blocksPerRow; col++) {

        // Handle Rotation for Even Rows
        if (row % 2 == 0) {

            // Position Calculations

            //Determine the orientation of the row
            let dx = 0; //places the block at horizontal from the camera
            let dz = 1;
            const gap = 0.07
            const x = (blockWidth + gap) * (col - (blocksPerRow - 1) / 2) * dx
            const y = (blockHeight + gap) * (row + 1);
            const z = (blockWidth + gap) * (col - (blocksPerRow - 1) / 2) * dz;

            const shape = new CANNON.Box(new CANNON.Vec3(blockBreadth / 2, blockHeight / 2, blockWidth / 2));
            body = new CANNON.Body({
                mass: 1, // Set a small mass for Jenga blocks
                shape: shape,
            });
            body.velocity.set(0, 0, 0)


            body.position.set(
                x, // Center-align blocks along X or Z
                y,                         // Stack rows along Y
                z // Center-align blocks along Z or X
            );

            const blockGeo = new THREE.BoxGeometry(blockBreadth, blockHeight, blockWidth);
            const blockMat = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                roughness: 0.3,
                metalness: 0.1,
            });
            block = new THREE.Mesh(blockGeo, blockMat);

            block.userData.physicsBody = body;

        } else {
            // Cannon-ES Physics Body

            // Position Calculations

            //Determine the orientation of the row
            const dx = 1;//places the block at vertical from the camera
            const dz = 0;
            const gap = 0.07
            const x = (blockWidth + gap) * (col - (blocksPerRow - 1) / 2) * dx
            const y = (blockHeight + gap) * (row + 1);
            const z = (blockWidth + gap) * (col - (blocksPerRow - 1) / 2) * dz;

            const shape = new CANNON.Box(new CANNON.Vec3(blockWidth / 2, blockHeight / 2, blockBreadth / 2));
            body = new CANNON.Body({
                mass: 1, // Set a small mass for Jenga blocks
                shape: shape,
            });
            body.velocity.set(0, 0, 0)


            body.position.set(
                x, // Center-align blocks along X or Z
                y,                         // Stack rows along Y
                z // Center-align blocks along Z or X
            );

            const blockGeo = new THREE.BoxGeometry(blockWidth, blockHeight, blockBreadth);
            // Three.js Mesh
            const blockMat = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                roughness: 0.3,
                metalness: 0.1,
            });
            block = new THREE.Mesh(blockGeo, blockMat);
            block.userData.physicsBody = body;
        }



        // Sync Three.js Mesh with Cannon Body
        block.position.copy(body.position);
        block.quaternion.copy(body.quaternion);

        // Add to Scene and Physics World
        scene.add(block);
        world.addBody(body);

        // Synchronize during the animation loop
        blocks.push({ mesh: block, body: body });
    }
}


// Create a static ground plane
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
    mass: 0, // Static body (doesn't move)
    shape: groundShape,
    type: CANNON.BODY_TYPES.STATIC
});


groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate the plane to be horizontal
world.addBody(groundBody);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Add a Three.js representation for the ground
const groundGeo = new THREE.PlaneGeometry(50, 50);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2; // Match the rotation of the Cannon plane
scene.add(groundMesh);


/**
 * LIGHT
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
scene.add(ambientLight, directionalLight)
directionalLight.position.set(-2, 0.3, 0)

/**
 * RAYCASTER
 */

const raycaster = new THREE.Raycaster()

//init a pointer 2d
const pointer = new THREE.Vector2()

const forceMagnitude = 108

window.addEventListener('click', (ev) => {
    pointer.x = (ev.clientX / sizes.width) * 2 - 1
    pointer.y = -(ev.clientY / sizes.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(scene.children)

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        console.log('Intersected object:', intersectedObject);

        //if an obj has a physic body associated with it
        const physicsBody = intersectedObject.userData.physicsBody
        console.log(physicsBody.position)

        if (physicsBody) {

            intersectedObject.material.color.set(0xff0000)
            setTimeout(() => {
                // Remove the body from the physics world
                world.removeBody(physicsBody);

                // Optionally, remove the mesh from the scene
                if (intersectedObject && intersectedObject.parent) {
                    intersectedObject.parent.remove(intersectedObject);
                }
            }, 500)

        }
    }
})


window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 36
camera.position.y = -2

scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    world.step(1 / 60, 0.01, 10); // Increase the number of iterations (3rd parameter)


    // Sync Three.js meshes with Cannon bodies
    blocks.forEach(({ mesh, body }) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    });

    // Update controls
    controls.update()

    cannonDebugger.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()