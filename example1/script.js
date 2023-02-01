// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js'

// new libraries!
import rhino3dm from 'rhino3dm'
import { RhinoCompute } from 'rhinocompute'

// declare variables to store scene, camera, and renderer
let scene, camera, renderer

// set up 3dm loader
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/' )
//loader.setLibraryPath( 'rhino3dm' )

// set up button click handlers
const booleanButton = document.getElementById("booleanButton")
const downloadButton = document.getElementById("downloadButton")
booleanButton.onclick = compute
downloadButton.onclick = download

// create a default material
const material = new THREE.MeshNormalMaterial({ wireframe: true })

// declare variables to hold rhino library and rhino doc
let rhino, doc

// load rhino3dm library
// this library is different to normal javascript libraries (it's actually written in C++)
// we need to wait for it to load before continuing...
rhino3dm().then(m => {

    // store rhino3dm library as "rhino" in global scope
    rhino = m

    // rhino3dm is loaded, let's start!
    init()
})

// function to setup the scene, camera, renderer, and load 3d model
async function init () {

    // #region three.js setup

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1,1,1)
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
    camera.position.y = - 50

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer( { antialias: true } )
    renderer.setSize( window.innerWidth, window.innerHeight )
    document.body.appendChild( renderer.domElement )

    // add some controls to orbit the camera
    const controls = new OrbitControls( camera, renderer.domElement );

    // add a directional light
    const directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.intensity = 2;
    scene.add( directionalLight );

    // #endregion

    // load the model...

    // instead of relying solely on Rhino3dmLoader, we need to load the rhino model "manually" so
    // that we have access to the original rhino geometry
    const url = 'meshes.3dm'
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    doc = rhino.File3dm.fromByteArray(new Uint8Array(buffer))
    console.log(doc)

    // we can use Rhino3dmLoader.parse() to load the model into three.js for visualisation without
    // having to download it again
    loader.parse( buffer, function ( object ) {

        hideSpinner()

        object.traverse(function (child) {
            if (child.isMesh) {
                child.material = material
            }
        })
        scene.add( object )
        
    } )    

    // enable boolean button
    booleanButton.disabled = false

    animate()
}

// function to continuously render the scene
function animate () {

    requestAnimationFrame( animate )
    renderer.render( scene, camera )

}

// boolean button handler
async function compute () {

    // disable boolean button
    booleanButton.disabled = true

    //RhinoCompute.url = getAuth( 'RHINO_COMPUTE_URL' ) // RhinoCompute server url. Use http://localhost:8081 if debugging locally.
    //RhinoCompute.apiKey = getAuth( 'RHINO_COMPUTE_KEY' )  // RhinoCompute server api key. Leave blank if debugging locally.

    // local 
    RhinoCompute.url = 'http://localhost:8081/' // Rhino.Compute server url


    // get meshes from rhino doc
    const meshes = []
    for (let i = 0; i < doc.objects().count; i++) {
        const mesh = doc.objects().get(i).geometry();
        if (mesh instanceof rhino.Mesh) {
            meshes.push(mesh)
        }
    }
    console.log(meshes)

    showSpinner()

    // perform mesh boolean union on server
    const res = await RhinoCompute.Mesh.createBooleanUnion(meshes)
    
    console.log(res)

    // clear scene
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }

    // clear doc
    doc.delete()

    // create new doc with unioned meshes
    doc = new rhino.File3dm()
    for (let i = 0; i < res.length; i++) {
        doc.objects().addMesh(rhino.CommonObject.decode(res[i]), null)
    }

    // load new doc into scene
    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse( buffer, function ( object ) {

        hideSpinner()

        object.traverse(function (child) {
            if (child.isMesh) {
                child.material = material
            }
        })
        scene.add( object )

        // enable download button
        downloadButton.disabled = false
    } )

    // enable download button
    downloadButton.disabled = false
}

// ask user for api key and cache in browser session so we don't need to keep asking
function getApiKey () {
    let auth = null
    auth = localStorage['compute_api_key'] // comment this line to ignore cached key
    if (auth == null) {
        auth = window.prompt('RhinoCompute Server API Key')
        if (auth != null) {
            localStorage.setItem('compute_api_key', auth)
        }
    }
    return auth
}

// download button handler
function download () {
    let buffer = doc.toByteArray()
    let blob = new Blob([ buffer ], { type: "application/octect-stream" })
    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = 'boolean.3dm'
    link.click()
}

function showSpinner() {
    document.getElementById('loader').style.display = 'block'
}

function hideSpinner() {
    document.getElementById('loader').style.display = 'none'
}
