    import * as THREE from './three.module.js';

    import { PointerLockControls } from './PointerLockControls.js';

    let camera, scene, renderer, controls;

    var sprite;

    const objects = [];

    let raycaster, raycaster2;

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;
    let shooting = false;

    let score = 0;

    let flash;
    let flashTimer;

    let gameState = 1;
    //0 bermain, 1 main menu, 2 pengaturan
    const tombolKembali = document.getElementById("kembali");
    const tombolPengaturan = document.getElementById("tombolPengaturan");
    const tombolBermain = document.getElementById("play");

    const sensSlider = document.getElementById("myRange");

    let prevTime = performance.now();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const vertex = new THREE.Vector3();
    const color = new THREE.Color();

    init();
    animate();

    function init() {
        // ------------------------- Initiating objects
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
        camera.position.y = 10;

        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0xffffff );
        scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

        const light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.5 );
        light.position.set( 0.5, 1, 0.75 );
        scene.add( light );
        // ------------------------- Menambah light untuk muzzle flash (ketika menembak)
        flash = new THREE.PointLight(0xf5e153, 0, 100 );
        flash.position.set(0.0, 0.0, -2.0);
        flash.visible = true;
        camera.add(flash);
        // ------------------------- Menambah control first person
        controls = new PointerLockControls( camera, document.body );
        console.log(controls.setSens(0.5));

        scene.add( controls.getObject() );
        // ------------------------- Me-load sprite crosshair
        const map = new THREE.TextureLoader().load( './assets/crosshair.png' );
        const material = new THREE.SpriteMaterial( { map: map, transparent: true, depthTest: false } );

        sprite = new THREE.Sprite( material );
        sprite.scale.set(0.1, 0.1, 1);
        sprite.position.z = -2.0;
        scene.add( sprite );

        flashTimer = 0;

        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );
        const pengaturan = document.getElementById('pengaturan');
        // ------------------------- Event handling
        // ------------------------- Menu event handling
        tombolBermain.addEventListener( 'click', function () {
            controls.lock();
        }, false );

        tombolKembali.addEventListener('click', function (){
            gameState = 1;
            blocker.style.display = 'block';
            pengaturan.style.display = 'none';
            instructions.style.display = '';

            controls.setSens(sensSlider.value);
        }, false);

        tombolPengaturan.addEventListener('click', function (){
            console.log("clicking setting");
            gameState = 2;
            blocker.style.display = 'block';
            pengaturan.style.display = '';
            instructions.style.display = 'none';
        }, false);

        
        

        controls.addEventListener( 'lock', function () {
            gameState = 0;
            instructions.style.display = 'none';
            blocker.style.display = 'none';

        } );

        controls.addEventListener( 'unlock', function () {
            gameState = 1;
            blocker.style.display = 'block';
            instructions.style.display = '';
            // Reset the game
        } );

        // ------------------------ movement event handling
        const onKeyDown = function ( event ) {

            switch ( event.keyCode ) {

                case 38: // up
                case 87: // w
                    moveForward = true;
                    break;

                case 37: // left
                case 65: // a
                    moveLeft = true;
                    break;

                case 40: // down
                case 83: // s
                    moveBackward = true;
                    break;

                case 39: // right
                case 68: // d
                    moveRight = true;
                    break;

                case 32: // space
                    if ( canJump === true ) velocity.y += 150;
                    canJump = false;
                    break;
            }
        };
        
        const onKeyUp = function ( event ) {

            switch ( event.keyCode ) {

                case 38: // up
                case 87: // w
                    moveForward = false;
                    break;

                case 37: // left
                case 65: // a
                    moveLeft = false;
                    break;

                case 40: // down
                case 83: // s
                    moveBackward = false;
                    break;

                case 39: // right
                case 68: // d
                    moveRight = false;
                    break;

            }

        };

        


        document.addEventListener( 'keydown', onKeyDown, false );
        document.addEventListener( 'keyup', onKeyUp, false );

        // ------------------------- shooting event handling
        document.addEventListener( 'mousedown', function (e) {
            if(controls.isLocked){
                shooting = true;
                flash.intensity = 1;
                raycaster2.setFromCamera( new THREE.Vector2(), camera );
                raycaster2.ray.origin.copy( controls.getObject().position );
                const intersects = raycaster2.intersectObjects( scene.children );

                for ( let i = 0; i < intersects.length; i ++ ) {
                    if(intersects[i].object.id != sprite.id && (objects.includes(intersects[i].object))){
                        if(shooting){
                            shooting = false;
                            //menghapus objek yang di tembak
                            scene.remove(intersects[i].object);
                            objects.splice(objects.indexOf(intersects[i].object), 1);
                            score++;  
                        }
                    }
                }
                shooting = false;
            }
        }, false );

        // Raycaster untuk colission dengan tanah
        raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
        raycaster2 = new THREE.Raycaster();

        // floor

        let floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
        floorGeometry.rotateX( - Math.PI / 2 );

        // vertex displacement

        let position = floorGeometry.attributes.position;

        for ( let i = 0, l = position.count; i < l; i ++ ) {

            vertex.fromBufferAttribute( position, i );

            vertex.x += Math.random() * 20 - 10;
            vertex.y += Math.random() * 2;
            vertex.z += Math.random() * 20 - 10;

            position.setXYZ( i, vertex.x, vertex.y, vertex.z );

        }

        floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

        position = floorGeometry.attributes.position;
        const colorsFloor = [];

        for ( let i = 0, l = position.count; i < l; i ++ ) {

            color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
            colorsFloor.push( color.r, color.g, color.b );

        }

        floorGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colorsFloor, 3 ) );

        const floorMaterial = new THREE.MeshPhongMaterial( { vertexColors: true } );

        const floor = new THREE.Mesh( floorGeometry, floorMaterial );
        scene.add( floor );

        // objects

        const boxGeometry = new THREE.BoxBufferGeometry( 5, 5, 5 ).toNonIndexed();

        position = boxGeometry.attributes.position;
        const colorsBox = [];

        for ( let i = 0, l = position.count; i < l; i ++ ) {

            color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
            colorsBox.push( color.r, color.g, color.b );

        }

        boxGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colorsBox, 3 ) );

        for ( let i = 0; i < 500; i ++ ) {

            const boxMaterial = new THREE.MeshPhongMaterial( { specular: 0xffffff, flatShading: true, vertexColors: true, transparent: true} );
            boxMaterial.color.setHSL( Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );

            const box = new THREE.Mesh( boxGeometry, boxMaterial );
            box.position.x = Math.floor( Math.random() * 20 - 10 ) * 20;
            box.position.y = Math.floor( Math.random() * 20 ) * 20 + 10;
            box.position.z = Math.floor( Math.random() * 20 - 10 ) * 20;

            scene.add( box );
            objects.push( box );

        }

        //

        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.sortObjects = true;
        document.body.appendChild( renderer.domElement );

        //

        window.addEventListener( 'resize', onWindowResize, false );

    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

    }

    function animate() {

        requestAnimationFrame( animate );

        const time = performance.now();

        if ( controls.isLocked === true ) {
            if(flash.intensity > 0){
                flashTimer++;
            }
            if(flashTimer > 6){
                flashTimer = 0;
                flash.intensity = 0;
            }

            // menambahkan sprite crosshair
            var dir = controls.getDirection( direction );
            var dirV = new THREE.Vector3(dir.x, dir.y, dir.z);
            dirV.multiplyScalar(2);

            raycaster.ray.origin.copy( controls.getObject().position );
            raycaster.ray.origin.y -= 10;

            const intersections = raycaster.intersectObjects( objects );

            const onObject = intersections.length > 0;

            const delta = ( time - prevTime ) / 1000;

            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;

            velocity.y -= 7 * 60.0 * delta; // 100.0 = mass

            direction.z = Number( moveForward ) - Number( moveBackward );
            direction.x = Number( moveRight ) - Number( moveLeft );
            direction.normalize(); // this ensures consistent movements in all directions

            if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
            if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

            if ( onObject === true ) {

                velocity.y = Math.max( 0, velocity.y );
                canJump = true;

            }

            controls.moveRight( - velocity.x * delta );
            controls.moveForward( - velocity.z * delta );

            controls.getObject().position.y += ( velocity.y * delta ); // new behavior

            if ( controls.getObject().position.y < 10 ) {

                velocity.y = 0;
                controls.getObject().position.y = 10;

                canJump = true;

            }

            sprite.position.x = camera.position.x + dirV.x;
            sprite.position.y = camera.position.y + dirV.y;
            sprite.position.z = camera.position.z + dirV.z;
            // sprite.renderOrder = 9999;
        }

        prevTime = time;

        renderer.render( scene, camera );

    }

    function setInvisible( object ){
        object.visible = false;
        //console.log("turning off flash");
    }
