var controls = new function () {
    this.base_roughness = 0.02;
    this.roughness = 1.8;
    this.strength = .06;
    this.persistence = .50;
    this.min_value = 1.2;
    this.cities = 100;
    this.seed = 0;
    this.definition = 3;

    this.visible = true;
};

// once everything is loaded, we run our Three.js stuff.
function init() {
    scene = new THREE.Scene();
    // Initialize the clock
	clock = new THREE.Clock(true);

    var gui = new dat.GUI();
    var cities = [];
    radius = 20;
    geometry = null;
    world_mesh = null;
    var render_change = { add:function(){
        geometry = new PlanetBufferGeometry(radius, controls.definition, controls);
        console.time("elevation");
        geometry.generateElevation();
        console.timeEnd("elevation");

        if(world_mesh){
            scene.remove(world_mesh);
        }
  		var material = new THREE.ShaderMaterial({
			uniforms : uniforms,
			vertexShader : document.getElementById("vertexShader").textContent,
			fragmentShader : document.getElementById("fragmentShader").textContent,
			side : THREE.FrontSide,
			transparent : true,
			extensions : {
				derivatives : true
			}
        });

        world_mesh = new THREE.Mesh( geometry, material );
        scene.add( world_mesh );
    }};

    guiPosition = gui.addFolder('generation');
    guiPosition.add(controls, 'seed', 1, 3000);
    guiPosition.add(controls, 'definition').min(3).max(10).step(1);
    guiPosition.add(controls, 'base_roughness', 0.02, 0.08);
    guiPosition.add(controls, 'roughness', 1, 4);
    guiPosition.add(controls, 'strength', .04, .4);
    guiPosition.add(controls, 'persistence', .50, .60);
    guiPosition.add(controls, 'min_value', 1.1, 1.3);
    guiPosition.add(render_change, 'add');

    uniforms = {
        u_radius : {
            type : "f",
            value : radius
        },
        u_light_direction: {
			type : "v3",
            value : new THREE.Vector3(30, 10, 30)
        },
    };

    // create a scene, that will hold all our elements such as objects, cameras and lights.

    // create a camera, which defines where we're looking at.
    var renderer = new THREE.WebGLRenderer({alpha: true});
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);

    o_controls = new OrbitControls( camera, renderer.domElement );
    o_controls.minDistance = 50;
    o_controls.maxDistance = 1000;
    o_controls.maxPolarAngle = Math.PI ;

    camera.position.y = o_controls.target.y;
    camera.position.x = o_controls.target.x;
    o_controls.update();

    // create a render and set the size

    renderer.setClearColor(new THREE.Color(0x000000));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    // position and point the camera to the center of the scene
    camera.position = new THREE.Vector3(30, 40, 80);
    camera.lookAt(scene.position);

    // add the output of the renderer to the html element
    document.getElementById("container").appendChild(renderer.domElement);

    // call the render function
    render_change.add();
    renderScene();

    function renderScene() {
        requestAnimationFrame(renderScene);
        renderer.render(scene, camera);
    }
}

window.onload = init;
