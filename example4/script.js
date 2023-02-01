// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js'
import rhino3dm from 'rhino3dm'
import { RhinoCompute } from 'rhinocompute'

const definitionName = 'color_test.gh'

// Set up sliders
    //No sliders  needed for these example
    ////////////////////////////////////


// set up button click handlers
const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

const loader = new Rhino3dmLoader()
loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/')

let rhino, definition, doc
rhino3dm().then(async m => {
    console.log('Loaded rhino3dm.')
    rhino = m // global

    RhinoCompute.url = 'http://localhost:8081/' //if debugging locally.


    // load a grasshopper file!
    const url = definitionName
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const arr = new Uint8Array(buffer)
    definition = arr

    init()
    compute()
})

async function compute() {


    //No params needed for these example
    ////////////////////////////////////


    // // clear values
    const trees = []




    const res = await RhinoCompute.Grasshopper.evaluateDefinition(definition, trees)

   // layer index 1
    doc = new rhino.File3dm()
    const layer_crvs = new rhino.Layer()
    layer_crvs.name = 'crvs'
    layer_crvs.color = { r: 0, g: 255, b: 0, a: 0 }
    doc.layers().add( layer_crvs )

    // layer index 2
    const layer_crvs2 = new rhino.Layer()
    layer_crvs2.name = 'crvs2'
    layer_crvs2.color = { r: 255, g: 0, b: 0, a: 0 }
    doc.layers().add( layer_crvs2 )

    // layer index 3
    const layer_crvs3 = new rhino.Layer()
    layer_crvs3.name = 'crvs3'
    layer_crvs3.color = { r: 0, g: 0, b: 255, a: 0 }
    doc.layers().add( layer_crvs3 )


    // hide spinner
    document.getElementById('loader').style.display = 'none'

    for (let i = 0; i < res.values.length; i++) {

        for (const [key, value] of Object.entries(res.values[i].InnerTree)) {
            for (const d of value) {

                const data = JSON.parse(d.data)
                const rhinoObject = rhino.CommonObject.decode(data)
                
                const oa_curves = new rhino.ObjectAttributes()

                //add to layer index
                oa_curves.layerIndex = i+1
                doc.objects().add(rhinoObject, oa_curves)

            }
        }
    }


    // clear objects from scene
    scene.traverse(child => {
        if (!child.isLight) {
            scene.remove(child)

        }
    })


    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse(buffer, function (object) {


        scene.add(object)
        // hide spinner
        document.getElementById('loader').style.display = 'none'

    })

        // enable download button
        downloadButton.disabled = false
}


function onSliderChange() {
    //show spinner
    document.getElementById('loader').style.display = 'block'
    compute()
}




// BOILERPLATE //

let scene, camera, renderer, controls

function init() {

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1, 1, 1)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = - 30

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff)
    directionalLight.intensity = 2
    scene.add(directionalLight)

    const ambientLight = new THREE.AmbientLight()
    scene.add(ambientLight)

    animate()
}

function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    animate()
}

function meshToThreejs(mesh, material) {
    const loader = new THREE.BufferGeometryLoader()
    const geometry = loader.parse(mesh.toThreejsJSON())
    return new THREE.Mesh(geometry, material)
}

// download button handler
function download () {
    let buffer = doc.toByteArray()
    let blob = new Blob([ buffer ], { type: "application/octect-stream" })
    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'example4_colors.3dm'
    link.click()
}