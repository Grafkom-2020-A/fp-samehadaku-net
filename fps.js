    import * as THREE from './three.module.js';

    import { PointerLockControls } from './PointerLockControls.js';

    let camera, scene, renderer, controls;

    var sprite;

    const targets = [];
    let targetSize = 3;
    let targetCount = 6;
    let gridSpacing = 10;

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

    let scoreCanvas;
    let scoreCanvasContext;
    let scoreHUD, scoreMat, scoreMesh;

    let gameState = 1;
    //0 bermain, 1 main menu, 2 pengaturan

    const blocker = document.getElementById( 'blocker' );
    const instructions = document.getElementById( 'instructions' );
    const pengaturan = document.getElementById('pengaturan');
    
    const tombolKembali = document.getElementById("kembali");
    const tombolPengaturan = document.getElementById("tombolPengaturan");
    const tombolBermain = document.getElementById("play");

    const sensSlider = document.getElementById("myRange");

    const audioListener = new THREE.AudioListener();
    const gunSounds = [];
    const hitSounds = [];
    const hitSoundLoader = new THREE.AudioLoader();
    const audioLoader = new THREE.AudioLoader();

    let prevTime = performance.now();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const color = new THREE.Color();

    const targetPos = new Array(16).fill(false); //posisi target (false kosong, true berisi)

    init();
    animate();

    function init() {
        // ------------------------- Initiating objects
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
        camera.position.y = 10;
        camera.rotateY(Math.PI);

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

        pengaturan.style.display = 'none';

        // ------------------------- Event handling
        // ------------------------- Menu event handling
        tombolBermain.addEventListener( 'click', function () {
            controls.lock();
        }, false );

        tombolKembali.addEventListener('click', function (){
            setGameState(1);
            controls.setSens(sensSlider.value);
        }, false);

        tombolPengaturan.addEventListener('click', function (){
            setGameState(2);
            sensSlider.value = controls.getSens();
            document.getElementById("sens").innerHTML = sensSlider.value;
        }, false);

        controls.addEventListener( 'lock', function () {
            setGameState(0);
        } );

        controls.addEventListener( 'unlock', function () {
            setGameState(1);
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

        // Handling audio
        for(var i = 0; i < 3; i++){
            var gunSound = new THREE.Audio( audioListener );
            gunSounds.push(gunSound);
            var hitSound = new THREE.Audio( audioListener );
            hitSounds.push(hitSound);
        }

        camera.add( audioListener );
        hitSoundLoader.load( 'hit.ogg', function( buffer ) {
            for(var i = 0; i < gunSounds.length; i++){
                hitSounds[i].setBuffer( buffer );
                hitSounds[i].setVolume(0.1);
                hitSounds[i].offset = 0.1;
            }     
        });
        
        audioLoader.load( 'gunsound.wav', function( buffer ) {
            for(var i = 0; i < gunSounds.length; i++){
                gunSounds[i].setBuffer( buffer );
                gunSounds[i].setVolume(0.2);
            }     
        });

        console.log(gunSounds);

        // ------------------------- shooting event handling
        document.addEventListener( 'mousedown', function (e) {
            if(controls.isLocked && e.button == 0){
                shooting = true;
                flash.intensity = 1;
                raycaster2.setFromCamera( new THREE.Vector2(), camera );
                raycaster2.ray.origin.copy( controls.getObject().position );
                const intersects = raycaster2.intersectObjects( scene.children );

                for ( let i = 0; i < intersects.length; i ++ ) {
                    if(intersects[i].object.id != sprite.id && (targets.includes(intersects[i].object))){ //object yang ditembak ada di array "target"
                        if(shooting){
                            shooting = false;
                            playHitSound();
                            //menggeser objek yang di tembak
                            // scene.remove(intersects[i].object);
                            // targets.splice(targets.indexOf(intersects[i].object), 1);
                            console.log(getGrid(intersects[i].object));
                            setTargetPos(intersects[i].object);

                            score++;  
                        }
                    }
                }
                playGunSound();
                shooting = false;
            }
        }, false );

        // Penanganan skor menggunakan canvas
        scoreCanvas = document.createElement('canvas');
        scoreCanvas.width = scoreCanvas.height = 1024;
        scoreCanvasContext = scoreCanvas.getContext('2d');

        scoreHUD = new THREE.Texture(scoreCanvas);
        scoreHUD.needsUpdate = true;
        
        scoreMat = new THREE.MeshBasicMaterial( {map: scoreHUD, side:THREE.DoubleSide } );
        scoreMat.transparent = true;
    
        scoreMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(scoreCanvas.width, scoreCanvas.height),
            scoreMat
          );
        scoreMesh.position.set(0,1.3,-2);
        scoreMesh.scale.set(0.002, 0.002, 1);
        camera.add( scoreMesh );
        
        // Raycaster untuk colission dengan tanah
        raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
        raycaster2 = new THREE.Raycaster();

        // floor

        let floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
        floorGeometry.rotateX( - Math.PI / 2 );

        const floorMaterial = new THREE.MeshPhongMaterial( { color:0x202020 } );

        const floor = new THREE.Mesh( floorGeometry, floorMaterial );
        scene.add( floor );

        // objects target
        const sphereGeometry = new THREE.SphereBufferGeometry( targetSize, 16, 16 );

        targetCount = Math.min(targetCount, 16);
        for ( let i = 0; i < targetCount; i ++ ) {

            const sphereMaterial = new THREE.MeshPhongMaterial( { specular: 0xffffff, flatShading: false, transparent: true, color: 0x44edf5} );

            const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );

            sphere.position.z = 100;
            setTargetPos( sphere );

            scene.add( sphere );
            targets.push( sphere );

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

            updateCanvas();
            scoreHUD.needsUpdate = true;

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

            const intersections = raycaster.intersectObjects( targets );

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

    function updateCanvas(){
        scoreCanvasContext.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);
        scoreCanvasContext.font = "Bold 40px Arial";
        scoreCanvasContext.fillStyle = "rgba(20,20,20,0.95)";
        scoreCanvasContext.textAlign = "center";
        scoreCanvasContext.textBaseline = "middle";
        scoreCanvasContext.fillText('Skor : ' + score, scoreCanvas.width/2, scoreCanvas.height/2);
    }

    function playGunSound(){
        for(var i = 0; i < gunSounds.length; i++){
            if(!gunSounds[i].isPlaying){
                gunSounds[i].play();
                break;
            }
        }
    }

    function playHitSound(){
        for(var i = 0; i < hitSounds.length; i++){
            if(!hitSounds[i].isPlaying){
                hitSounds[i].play();
                break;
            }
        }
    }

    function setGameState( state ){
        if(state == 0){
            gameState = 0;
            instructions.style.display = 'none';
            blocker.style.display = 'none';
            pengaturan.style.display = 'none';
        }else if( state == 1 ){
            gameState = 1;
            blocker.style.display = 'block';
            pengaturan.style.display = 'none';
            instructions.style.display = '';
        }else if(state == 2){
            gameState = 2;
            blocker.style.display = 'block';
            pengaturan.style.display = '';
            instructions.style.display = 'none';
        }
    }

    function setTargetPos( targetObj ){
        var pos = getGrid(targetObj);
        var grid = Math.floor(Math.random() * 16);
        while(targetPos[grid]){
            grid++;
            grid = grid % 16;
        }
        var x, y;
        x = ( grid % 4 ) * 10 - (gridSpacing * 3/2);
        y = ( Math.floor( grid / 4 )) * 10 + 10;
        targetObj.position.x = x;
        targetObj.position.y = y;
        targetPos[grid] = true;
        targetPos[pos] = false;
    }

    function getGrid (targetObj) {
        var gridX, gridY;
        gridX = (targetObj.position.x + (gridSpacing * 3/2)) / 10;
        gridY = (targetObj.position.y - 10) / 10;
        return gridY * 4 + gridX;
    }
 