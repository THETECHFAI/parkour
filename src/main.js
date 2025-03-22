import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Global variables for the game
let camera, scene, renderer, world;
let playerBody, playerMesh, playerModel;
let hackingNode;
let keys = {};
let obstacles = [];
let drones = [];
let particleSystem;
let isHacking = false;
let playerCanJump = false;
let stamina = 100;
let isSprinting = false;
let hackingSequence = [];
let playerSequence = [];
let isHackingMiniGame = false;
let score = 0;
let hasWallRun = false;
let hasLedgeGrabbed = false;
let cameraAngle = 0; // Add camera angle variable to track rotation
let landedPlatforms = new Set(); // Track platforms player has landed on
let scoreMultiplier = 1; // Score multiplier for combos
let lastScoreTime = 0; // Track time of last score for combos
let scoreMessages = []; // Visual feedback for score gains
let lastScoredPlatformId = null; // Track the last platform ID that awarded points
let lastScoredTime = 0; // Time of last scoring event
let jumpTimer = 0; // Timer to track jump cooldown
let lastJumpTime = 0; // Time of last jump
let onGroundTimer = 0; // Time player has been on the ground
let framesSinceJump = 0; // Frames since last jump
let gameStarted = false; // Track if the game has started
let jumpTrailParticles; // Add new variable for jump trail particles
let totalDistance = 0; // Track total horizontal distance traveled
let lastPosition = null; // Store the last position to calculate distance traveled

// Define biome types
const BIOMES = {
    CYBERPUNK: 'cyberpunk',
    NEON_GARDEN: 'neon_garden',
    INDUSTRIAL: 'industrial',
    DIGITAL_VOID: 'digital_void'
};

// Current biome the player is in
let currentBiome = BIOMES.CYBERPUNK;

// Constants for game mechanics
const STAMINA_DRAIN_RATE = 20;
const STAMINA_RECOVER_RATE = 10;
const PLAYER_MASS = 5;
const PLAYER_HEIGHT = 1.8;
const PLAYER_WIDTH = 0.4; // Width for the box shape
const PLAYER_DEPTH = 0.4; // Depth for the box shape
const JUMP_FORCE = 100;
const MOVE_FORCE = 225;
const TIME_STEP = 1/60;
const DRONE_SPEED = 3;
const DRONE_DETECTION_RANGE = 5;
const DRONE_CHASE_RANGE = 10;
const COMBO_TIME = 5; // Seconds before combo resets
const BASE_PLATFORM_SCORE = 10; // Base score for landing on a new platform
const SCORING_COOLDOWN = 1; // Seconds before you can score on a new platform

// Create the start screen and setup the game
createStartScreen();

// Create the start screen with a cyberpunk theme
function createStartScreen() {
    // Add CSS for the start screen
    const style = document.createElement('style');
    style.textContent = `
        #start-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #050530 0%, #1a1a50 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Arial', sans-serif;
            color: #ffffff;
            overflow: hidden;
        }
        
        #start-screen::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.1) 2px, rgba(0, 255, 255, 0.1) 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 0, 255, 0.1) 2px, rgba(255, 0, 255, 0.1) 4px);
            pointer-events: none;
        }
        
        .title {
            font-size: 5em;
            margin-bottom: 0.2em;
            text-transform: uppercase;
            font-weight: bold;
            text-shadow: 
                0 0 5px rgba(0, 255, 255, 0.6),
                0 0 10px rgba(0, 0, 255, 0.3);
            background: linear-gradient(90deg, #ff55ff, #55ffff);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 3px;
            position: relative;
        }
        
        .subtitle {
            font-size: 1.5em;
            margin-bottom: 2em;
            color: #ccccff;
            text-shadow: 0 0 5px #0000ff;
        }
        
        .start-button {
            font-size: 1.8em;
            padding: 0.8em 2em;
            background: linear-gradient(90deg, #ff00ff, #00ffff);
            border: none;
            border-radius: 50px;
            color: #000050;
            cursor: pointer;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 
                0 0 10px #00ffff,
                0 0 20px #0000ff,
                0 0 30px #ff00ff;
        }
        
        .start-button:hover {
            transform: scale(1.05);
            box-shadow: 
                0 0 15px #00ffff,
                0 0 30px #0000ff,
                0 0 45px #ff00ff;
        }
        
        .start-button::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                to bottom right,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.1) 100%
            );
            transform: rotate(45deg);
            pointer-events: none;
            z-index: 1;
        }
        
        .controls-info {
            position: absolute;
            bottom: 2em;
            text-align: center;
            color: #ccccff;
            font-size: 1.2em;
            max-width: 80%;
            line-height: 1.5;
        }
        
        .floating-objects {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            overflow: hidden;
            pointer-events: none;
        }
        
        .floating-object {
            position: absolute;
            width: 20px;
            height: 20px;
            background: rgba(0, 255, 255, 0.5);
            border-radius: 50%;
            filter: blur(2px);
            box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff;
            animation: float 15s linear infinite;
        }
        
        @keyframes float {
            0% {
                transform: translateY(100vh) translateX(0);
                opacity: 1;
            }
            100% {
                transform: translateY(-100px) translateX(100px);
                opacity: 0;
            }
        }
        
        #game-ui {
            display: none;
        }
        
        .score-popup {
            position: absolute;
            font-family: 'Arial', sans-serif;
            font-weight: bold;
            font-size: 24px;
            text-shadow: 0 0 5px #00ffff, 0 0 10px #0000ff, 0 0 15px #000000;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
    
    // Create the start screen elements
    const startScreen = document.createElement('div');
    startScreen.id = 'start-screen';
    
    // Add floating cyberpunk particles
    const floatingObjects = document.createElement('div');
    floatingObjects.className = 'floating-objects';
    
    // Create 30 floating objects
    for (let i = 0; i < 30; i++) {
        const obj = document.createElement('div');
        obj.className = 'floating-object';
        obj.style.left = `${Math.random() * 100}%`;
        obj.style.animationDuration = `${15 + Math.random() * 10}s`;
        obj.style.animationDelay = `${Math.random() * 10}s`;
        obj.style.width = `${Math.random() * 30 + 5}px`;
        obj.style.height = obj.style.width;
        
        // Randomize colors between cyan and magenta
        const hue = Math.random() > 0.5 ? '300' : '180';
        obj.style.background = `hsla(${hue}, 100%, 50%, ${Math.random() * 0.4 + 0.2})`;
        obj.style.boxShadow = `0 0 10px hsla(${hue}, 100%, 50%, 0.8), 0 0 20px hsla(${hue}, 100%, 50%, 0.5)`;
        
        floatingObjects.appendChild(obj);
    }
    startScreen.appendChild(floatingObjects);
    
    // Add the title, subtitle and start button
    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'CYBER PARKOUR';
    startScreen.appendChild(title);
    
    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Hack the skyline. Rewrite your reality. Escape the net.';
    startScreen.appendChild(subtitle);
    
    const startButton = document.createElement('button');
    startButton.className = 'start-button';
    startButton.textContent = 'START GAME';
    startButton.addEventListener('click', startGame);
    startScreen.appendChild(startButton);
    
    // Add controls info
    const controlsInfo = document.createElement('div');
    controlsInfo.className = 'controls-info';
    controlsInfo.innerHTML = 'CONTROLS:<br>WASD: Move | SPACE: Jump | SHIFT: Sprint | Q/E: Rotate Camera';
    startScreen.appendChild(controlsInfo);
    
    // Create container for game UI elements
    const gameUI = document.createElement('div');
    gameUI.id = 'game-ui';
    gameUI.innerHTML = `
        <div id="score-container">
            <div id="score">Score: 0</div>
            <div id="distance">Distance: 0m</div>
        </div>
        <div id="info"></div>
        <div id="controls"></div>
        <div id="focus-prompt">Click to focus</div>
    `;
    
    // Apply styling to game UI elements
    const gameUIStyle = document.createElement('style');
    gameUIStyle.textContent = `
        #score-container {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid #00ffff;
            border-radius: 10px;
            color: #ffffff;
            font-size: 24px;
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: row;
            gap: 15px;
        }
        #score {
            font-size: 20px;
            color: #00ffff;
        }
        #distance {
            font-size: 20px;
            color: #00ffff;
        }
        #info {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            background-color: rgba(0, 0, 0, 0.7);
            border: 2px solid #00ffff;
            border-radius: 10px;
            color: #00ffff;
            font-size: 36px;
            font-family: 'Arial', sans-serif;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        #controls {
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid #00ffff;
            border-radius: 10px;
            color: #ffffff;
            font-size: 16px;
            font-family: 'Arial', sans-serif;
        }
        #focus-prompt {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            background-color: rgba(0, 0, 0, 0.7);
            border: 2px solid #00ffff;
            border-radius: 10px;
            color: #00ffff;
            font-size: 24px;
            font-family: 'Arial', sans-serif;
            cursor: pointer;
            display: none;
        }
    `;
    document.head.appendChild(gameUIStyle);
    
    // Add the start screen and game UI to the document
    document.body.appendChild(startScreen);
    document.body.appendChild(gameUI);
    
    // Add Vibe Jam 2025 competition badge
    const jamBadge = document.createElement('div');
    jamBadge.id = 'jam-badge';
    jamBadge.innerHTML = '<a target="_blank" href="https://jam.pieter.com" style="font-family: \'system-ui\', sans-serif; position: fixed; bottom: 60px; right: 20px; padding: 7px; font-size: 14px; font-weight: bold; background: #fff; color: #000; text-decoration: none; z-index: 10000; border-radius: 12px; border: 1px solid #fff;">🕹️ Vibe Jam 2025</a>';
    document.body.appendChild(jamBadge);
    
    // Add signature to the start screen
    const signature = document.createElement('div');
    signature.id = 'signature';
    signature.innerHTML = 'Vibe Coded by <a href="https://x.com/faisalxshariff" target="_blank" style="color: #00ffff; text-decoration: none;">@faisalxshariff</a>';
    signature.style.position = 'absolute';
    signature.style.bottom = '20px';
    signature.style.right = '20px';
    signature.style.color = '#00ffff';
    signature.style.textShadow = '0 0 5px #00ffff';
    signature.style.fontFamily = 'monospace';
    signature.style.fontSize = '14px';
    signature.style.zIndex = '1001';
    document.body.appendChild(signature);
}

// Function to start the game
function startGame() {
    // Hide the start screen with a fade effect
    const startScreen = document.getElementById('start-screen');
    startScreen.style.transition = 'opacity 1s ease';
    startScreen.style.opacity = '0';
    
    // Show the game UI
    const gameUI = document.getElementById('game-ui');
    gameUI.style.display = 'block';
    
    // Set up focus prompt click handler
    const focusPrompt = document.getElementById('focus-prompt');
    if (focusPrompt) {
        focusPrompt.addEventListener('click', () => {
            focusPrompt.style.display = 'none';
            window.focus();
        });
    }
    
    // Remove the start screen from the DOM after the transition
    setTimeout(() => {
        startScreen.remove();
        
        // Remove start screen signature
        const startSignature = document.getElementById('signature');
        if (startSignature) startSignature.remove();
        
        // Remove the start screen badge
        const startBadge = document.getElementById('jam-badge');
        if (startBadge) startBadge.remove();
        
        // Add signature to the game screen
        const gameSignature = document.createElement('div');
        gameSignature.id = 'game-signature';
        gameSignature.innerHTML = 'Vibe Coded by <a href="https://x.com/faisalxshariff" target="_blank" style="color: #00ffff; text-decoration: none;">@faisalxshariff</a>';
        gameSignature.style.position = 'absolute';
        gameSignature.style.bottom = '10px';
        gameSignature.style.right = '10px';
        gameSignature.style.color = '#00ffff';
        gameSignature.style.textShadow = '0 0 5px #00ffff';
        gameSignature.style.fontFamily = 'monospace';
        gameSignature.style.fontSize = '12px';
        gameSignature.style.opacity = '0.7';
        gameSignature.style.zIndex = '999';
        document.body.appendChild(gameSignature);
        
        // Add Vibe Jam 2025 competition badge above the signature
        const jamBadge = document.createElement('div');
        jamBadge.id = 'jam-badge';
        jamBadge.innerHTML = '<a target="_blank" href="https://jam.pieter.com" style="font-family: \'system-ui\', sans-serif; position: fixed; bottom: 60px; right: 20px; padding: 7px; font-size: 14px; font-weight: bold; background: #fff; color: #000; text-decoration: none; z-index: 10000; border-radius: 12px; border: 1px solid #fff;">🕹️ Vibe Jam 2025</a>';
        document.body.appendChild(jamBadge);
        
        // Reset game state
        score = 0;
        playerCanJump = true;
        stamina = 100;
        landedPlatforms.clear();
        scoreMultiplier = 1;
        totalDistance = 0;
        lastPosition = null;
        
        // Update score display
        document.getElementById('score').textContent = `Score: 0`;
        document.getElementById('distance').textContent = `Distance: 0m`;
        
        // Initialize the game
        init();
        gameStarted = true;
        
        // Focus on the window so keyboard controls work immediately
        window.focus();
    }, 1000);
}

// Create the cyberpunk skyline in the background
function createCyberpunkSkyline() {
    const skylineGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    for (let i = 0; i < 50; i++) {
        const height = Math.random() * 20 + 5;
        const width = Math.random() * 2 + 1;
        const depth = Math.random() * 2 + 1;
        
        const skylineBox = new THREE.Mesh(
            skylineGeometry,
            new THREE.MeshPhongMaterial({
                color: new THREE.Color(
                    Math.random() * 0.1,
                    Math.random() * 0.1,
                    Math.random() * 0.2 + 0.1
                ),
                emissive: new THREE.Color(
                    Math.random() > 0.8 ? 0.5 : 0,
                    Math.random() > 0.8 ? 0.8 : 0,
                    Math.random() > 0.6 ? 0.5 : 0
                )
            })
        );
        
        skylineBox.scale.set(width, height, depth);
        skylineBox.position.set(
            Math.random() * 100 - 50,
            height / 2 - 10,
            Math.random() * -50 - 15
        );
        
        scene.add(skylineBox);
    }
}

// Create the main rooftop (200x200 units)
function createRooftop() {
    const roofSize = 200; // Increased from 40 to 200 for a much larger base platform
    const roofGeometry = new THREE.BoxGeometry(roofSize, 0.5, roofSize);
    const roofMaterial = new THREE.MeshPhongMaterial({
        color: 0x333344,
        emissive: 0x110022,
        specular: 0x222244,
        shininess: 10
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, -0.25, 0);
    roof.receiveShadow = true;
    scene.add(roof);

    // Add a larger grid pattern
    const gridHelper = new THREE.GridHelper(roofSize, 100, 0x0088ff, 0x004488);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Add edge highlights
    const edgeGeometry = new THREE.BoxGeometry(roofSize + 0.1, 0.1, 0.1);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    const edge1 = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge1.position.set(0, 0.05, roofSize / 2);
    scene.add(edge1);

    const edge2 = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge2.position.set(0, 0.05, -roofSize / 2);
    scene.add(edge2);

    const edge3 = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge3.rotation.y = Math.PI / 2;
    edge3.position.set(roofSize / 2, 0.05, 0);
    scene.add(edge3);

    const edge4 = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge4.rotation.y = Math.PI / 2;
    edge4.position.set(-roofSize / 2, 0.05, 0);
    scene.add(edge4);

    // Create physical body for the roof with the world material
    const roofShape = new CANNON.Box(new CANNON.Vec3(roofSize / 2, 0.25, roofSize / 2));
    const roofBody = new CANNON.Body({ 
        mass: 0,
        material: worldMaterial // Use the shared world material
    });
    roofBody.addShape(roofShape);
    roofBody.position.set(0, -0.25, 0);
    world.addBody(roofBody);
    
    // Add some scattered low-height obstacles across the roof
    addScatteredObstacles(roofSize);
}

// Add random obstacles scattered across the main roof for variety
function addScatteredObstacles(roofSize) {
    const obstacleCount = 30; // Number of small obstacles to scatter
    const minDistance = 15; // Minimum distance between obstacles
    
    // Keep track of placed positions to avoid overlap
    const placedPositions = [];
    
    for (let i = 0; i < obstacleCount; i++) {
        // Generate a potential position
        let x, z;
        let validPosition = false;
        let attempts = 0;
        
        // Try to find a position that's not too close to existing obstacles
        while (!validPosition && attempts < 50) {
            x = Math.random() * (roofSize - 10) - (roofSize / 2 - 5);
            z = Math.random() * (roofSize - 10) - (roofSize / 2 - 5);
            
            // Check if position is far enough from all existing obstacles
            validPosition = true;
            for (const pos of placedPositions) {
                const dist = Math.sqrt((pos.x - x) ** 2 + (pos.z - z) ** 2);
                if (dist < minDistance) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }
        
        if (validPosition) {
            // Record this position
            placedPositions.push({ x, z });
            
            // Create a small obstacle
            const height = Math.random() * 1.5 + 0.5;
            const width = Math.random() * 3 + 1;
            const depth = Math.random() * 3 + 1;
            
            // Visual mesh with enhanced materials
            const obstacleGeometry = new THREE.BoxGeometry(width, height, depth);
            const obstacleColor = Math.random() > 0.5 ? 0x445566 : 0x556677;
            const obstacleMaterial = new THREE.MeshStandardMaterial({
                color: obstacleColor,
                roughness: 0.3,
                metalness: 0.7,
                emissive: new THREE.Color(obstacleColor >> 16 & 0xff / 2000, obstacleColor >> 8 & 0xff / 2000, obstacleColor & 0xff / 2000)
            });
            
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
            obstacle.position.set(x, height / 2, z);
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            scene.add(obstacle);
            obstacles.push(obstacle);
            
            // Enhanced neon trim on top
            const neonColors = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff88, 0xff0088];
            const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
            
            const stripGeometry = new THREE.BoxGeometry(width + 0.05, 0.08, depth + 0.05);
            const stripMaterial = new THREE.MeshBasicMaterial({ 
                color: neonColor,
                transparent: true,
                opacity: 0.9
            });
            const strip = new THREE.Mesh(stripGeometry, stripMaterial);
            strip.position.set(x, height + 0.04, z);
            scene.add(strip);
            
            // Add glow effect
            const glowGeometry = new THREE.BoxGeometry(width + 0.2, 0.1, depth + 0.2);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: neonColor,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(x, height + 0.04, z);
            scene.add(glow);
            
            // Add vertical edge highlights
            const edgeHighlightPositions = [
                [width/2, height/2, depth/2],
                [width/2, height/2, -depth/2],
                [-width/2, height/2, depth/2],
                [-width/2, height/2, -depth/2]
            ];
            
            edgeHighlightPositions.forEach(pos => {
                const edgeGeometry = new THREE.BoxGeometry(0.05, height, 0.05);
                const edgeMaterial = new THREE.MeshBasicMaterial({
                    color: neonColor,
                    transparent: true,
                    opacity: 0.7
                });
                
                const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
                edge.position.set(
                    x + pos[0],
                    pos[1],
                    z + pos[2]
                );
                
                scene.add(edge);
            });
            
            // Physics body with the shared world material
            const obstacleShape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
            const obstacleBody = new CANNON.Body({
                mass: 0,
                material: window.worldMaterial // Use the shared world material
            });
            obstacleBody.addShape(obstacleShape);
            obstacleBody.position.set(x, height / 2, z);
            world.addBody(obstacleBody);
        }
    }
}

// Create the parkour course (platforms and beams)
function createObstacles() {
    // Define a large array of platform configurations
    const platformConfigs = [
        // First cluster - Core platforms (enhanced from original)
        { size: [20, 1, 20], position: [50, 10, 0], color: 0x444466 },
        { size: [15, 1, 15], position: [0, 15, 50], color: 0x664466 },
        { size: [20, 1, 20], position: [-50, 20, 0], color: 0x446666 },
        { size: [15, 1, 15], position: [0, 25, -50], color: 0x555555 },
        
        // Second cluster - Medium height platforms at 90° intervals
        { size: [12, 1, 12], position: [30, 5, 30], color: 0x445577 },
        { size: [12, 1, 12], position: [-30, 7, 30], color: 0x557766 },
        { size: [12, 1, 12], position: [-30, 9, -30], color: 0x665577 },
        { size: [12, 1, 12], position: [30, 12, -30], color: 0x775566 },
        
        // Third cluster - Distant high platforms
        { size: [25, 1, 25], position: [80, 30, 80], color: 0x554477 },
        { size: [25, 1, 25], position: [-80, 35, 80], color: 0x774455 },
        { size: [25, 1, 25], position: [-80, 40, -80], color: 0x447755 },
        { size: [25, 1, 25], position: [80, 45, -80], color: 0x557744 },
        
        // Fourth cluster - Extra high challenge platforms
        { size: [10, 1, 10], position: [0, 60, 0], color: 0x8844aa },
        { size: [8, 1, 8], position: [20, 70, 20], color: 0xaa4488 },
        { size: [6, 1, 6], position: [-20, 80, 20], color: 0x44aa88 },
        { size: [4, 1, 4], position: [-20, 90, -20], color: 0x88aa44 },
        
        // Connecting beams and paths
        { size: [2, 0.5, 20], position: [40, 10, 15], color: 0x666666, rotation: [0, Math.PI / 4, 0] },
        { size: [2, 0.5, 25], position: [-15, 17.5, 30], color: 0x666666, rotation: [0, Math.PI / 3, 0] },
        { size: [2, 0.5, 30], position: [-40, 14.5, -15], color: 0x666666, rotation: [0, -Math.PI / 4, 0] },
        { size: [2, 0.5, 15], position: [0, 20, -35], color: 0x666666, rotation: [0, Math.PI / 2, 0] },
        
        // Floating stepping stones
        { size: [3, 1, 3], position: [15, 20, 15], color: 0x775544 },
        { size: [3, 1, 3], position: [22, 23, 22], color: 0x775544 },
        { size: [3, 1, 3], position: [29, 26, 29], color: 0x775544 },
        { size: [3, 1, 3], position: [36, 29, 36], color: 0x775544 },
        { size: [3, 1, 3], position: [43, 32, 43], color: 0x775544 },
        { size: [3, 1, 3], position: [50, 35, 50], color: 0x775544 },
        
        // Additional distant floating platforms
        { size: [6, 1, 6], position: [100, 15, 20], color: 0x447766 },
        { size: [6, 1, 6], position: [80, 25, 40], color: 0x447766 },
        { size: [6, 1, 6], position: [60, 35, 60], color: 0x447766 },
        { size: [6, 1, 6], position: [40, 45, 80], color: 0x447766 },
        { size: [6, 1, 6], position: [20, 55, 100], color: 0x447766 },
        
        // Negative X quadrant
        { size: [6, 1, 6], position: [-100, 18, 20], color: 0x664477 },
        { size: [6, 1, 6], position: [-80, 28, 40], color: 0x664477 },
        { size: [6, 1, 6], position: [-60, 38, 60], color: 0x664477 },
        { size: [6, 1, 6], position: [-40, 48, 80], color: 0x664477 },
        { size: [6, 1, 6], position: [-20, 58, 100], color: 0x664477 },
        
        // Negative Z quadrant
        { size: [6, 1, 6], position: [-20, 22, -100], color: 0x774466 },
        { size: [6, 1, 6], position: [-40, 32, -80], color: 0x774466 },
        { size: [6, 1, 6], position: [-60, 42, -60], color: 0x774466 },
        { size: [6, 1, 6], position: [-80, 52, -40], color: 0x774466 },
        { size: [6, 1, 6], position: [-100, 62, -20], color: 0x774466 },
        
        // Negative X, Z quadrant
        { size: [6, 1, 6], position: [20, 25, -100], color: 0x667744 },
        { size: [6, 1, 6], position: [40, 35, -80], color: 0x667744 },
        { size: [6, 1, 6], position: [60, 45, -60], color: 0x667744 },
        { size: [6, 1, 6], position: [80, 55, -40], color: 0x667744 },
        { size: [6, 1, 6], position: [100, 65, -20], color: 0x667744 },
        
        // Vertical challenge platforms ascending upward
        { size: [4, 0.5, 4], position: [0, 5, 0], color: 0x887766 },
        { size: [4, 0.5, 4], position: [0, 10, 0], color: 0x887766 },
        { size: [4, 0.5, 4], position: [0, 15, 0], color: 0x887766 },
        { size: [4, 0.5, 4], position: [0, 20, 0], color: 0x887766 },
        { size: [4, 0.5, 4], position: [0, 25, 0], color: 0x887766 },
        { size: [4, 0.5, 4], position: [0, 30, 0], color: 0x887766 },
        
        // Spiral staircase around central tower
        ...createSpiralStaircase(0, 35, 0, 15, 50, 3, 0.5, 3, 0xaa66cc),
        
        // Floating horizontal rings at different heights
        ...createFloatingRing(0, 100, 0, 40, 12, 0x00ffaa),
        ...createFloatingRing(0, 120, 0, 60, 8, 0xff00aa),
        ...createFloatingRing(0, 140, 0, 80, 6, 0xaaff00),
        
        // Suspended platforms between distant areas
        ...createSuspendedBridge([50, 10, 0], [80, 30, 80], 8, 0xffaa00),
        ...createSuspendedBridge([-50, 20, 0], [-80, 35, 80], 8, 0xff5500),
        ...createSuspendedBridge([0, 25, -50], [-80, 40, -80], 8, 0x55ff00),
        
        // Scattered Floating Islands far from the center
        { size: [12, 2, 12], position: [150, 50, 150], color: 0x6688cc },
        { size: [10, 2, 10], position: [170, 55, 130], color: 0x6688cc },
        { size: [8, 2, 8], position: [190, 60, 110], color: 0x6688cc },
        
        { size: [12, 2, 12], position: [-150, 50, 150], color: 0xcc8866 },
        { size: [10, 2, 10], position: [-170, 55, 130], color: 0xcc8866 },
        { size: [8, 2, 8], position: [-190, 60, 110], color: 0xcc8866 },
        
        { size: [12, 2, 12], position: [-150, 50, -150], color: 0x88cc66 },
        { size: [10, 2, 10], position: [-170, 55, -130], color: 0x88cc66 },
        { size: [8, 2, 8], position: [-190, 60, -110], color: 0x88cc66 },
        
        { size: [12, 2, 12], position: [150, 50, -150], color: 0xcc6688 },
        { size: [10, 2, 10], position: [170, 55, -130], color: 0xcc6688 },
        { size: [8, 2, 8], position: [190, 60, -110], color: 0xcc6688 },
        
        // Low interconnected platforms for speed running
        { size: [8, 0.5, 20], position: [120, 3, 0], color: 0x44ccaa },
        { size: [20, 0.5, 8], position: [140, 3, -20], color: 0x44ccaa },
        { size: [8, 0.5, 20], position: [160, 3, 0], color: 0x44ccaa },
        { size: [20, 0.5, 8], position: [140, 3, 20], color: 0x44ccaa },
        
        // Dangerously narrow walkways
        { size: [0.5, 0.5, 30], position: [200, 10, 0], color: 0xff0000 },
        { size: [0.5, 0.5, 30], position: [200, 10, 40], color: 0xff0000 },
        { size: [0.5, 0.5, 30], position: [200, 10, 80], color: 0xff0000 },
        { size: [30, 0.5, 0.5], position: [185, 10, 95], color: 0xff0000 },
        { size: [30, 0.5, 0.5], position: [145, 10, 95], color: 0xff0000 },
        
        // Grid of small, spaced-out platforms for challenging jumps
        ...createJumpGrid(100, 15, 100, 5, 2, 5, 0x22aaff)
    ];

    // Create all platforms and obstacles
    platformConfigs.forEach(config => {
        const geometry = new THREE.BoxGeometry(
            config.size[0],
            config.size[1],
            config.size[2]
        );
        
        // Enhanced material with better visual properties
        const material = new THREE.MeshStandardMaterial({
            color: config.color,
            roughness: 0.2,  // Lower roughness for a shinier look
            metalness: 0.8,  // Higher metalness for a sleek metallic appearance
            envMapIntensity: 1.5, // Enhance environment reflections
            emissive: new THREE.Color(
                (config.color >> 16 & 0xff) / 1500,
                (config.color >> 8 & 0xff) / 1500,
                (config.color & 0xff) / 1500
            )
        });
        
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(
            config.position[0],
            config.position[1],
            config.position[2]
        );
        
        // Apply rotation if specified
        if (config.rotation) {
            platform.rotation.set(
                config.rotation[0] || 0,
                config.rotation[1] || 0,
                config.rotation[2] || 0
            );
        }
        
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        obstacles.push(platform);

        // Add enhanced neon trim with glow effect
        const stripGeometry = new THREE.BoxGeometry(
            config.size[0] + 0.1,
            0.08,
            config.size[2] + 0.1
        );
        const neonColors = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff88, 0xff0088];
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const stripMaterial = new THREE.MeshBasicMaterial({
            color: neonColor,
            transparent: true,
            opacity: 0.9
        });
        
        const strip = new THREE.Mesh(stripGeometry, stripMaterial);
        strip.position.set(
            config.position[0],
            config.position[1] + config.size[1] / 2 + 0.04,
            config.position[2]
        );
        
        // Apply the same rotation as the platform
        if (config.rotation) {
            strip.rotation.set(
                config.rotation[0] || 0,
                config.rotation[1] || 0,
                config.rotation[2] || 0
            );
        }
        
        scene.add(strip);
        
        // Add glow effect using a larger, fainter duplicate
        const glowGeometry = new THREE.BoxGeometry(
            config.size[0] + 0.3,
            0.1,
            config.size[2] + 0.3
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: neonColor,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(
            config.position[0],
            config.position[1] + config.size[1] / 2 + 0.04,
            config.position[2]
        );
        
        // Apply the same rotation as the platform
        if (config.rotation) {
            glow.rotation.set(
                config.rotation[0] || 0,
                config.rotation[1] || 0,
                config.rotation[2] || 0
            );
        }
        
        scene.add(glow);
        
        // Add vertical edge highlights for better ledge visibility
        if (config.size[0] >= 4 && config.size[2] >= 4) {
            const edgeHighlightPositions = [
                [config.size[0]/2, 0, config.size[2]/2],
                [config.size[0]/2, 0, -config.size[2]/2],
                [-config.size[0]/2, 0, config.size[2]/2],
                [-config.size[0]/2, 0, -config.size[2]/2]
            ];
            
            edgeHighlightPositions.forEach(pos => {
                const edgeGeometry = new THREE.BoxGeometry(0.08, config.size[1], 0.08);
                const edgeMaterial = new THREE.MeshBasicMaterial({
                    color: neonColor,
                    transparent: true,
                    opacity: 0.8
                });
                
                const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
                edge.position.set(
                    config.position[0] + pos[0],
                    config.position[1],
                    config.position[2] + pos[2]
                );
                
                // Apply the same rotation as the platform
                if (config.rotation) {
                    edge.rotation.set(
                        config.rotation[0] || 0,
                        config.rotation[1] || 0,
                        config.rotation[2] || 0
                    );
                }
                
                scene.add(edge);
            });
        }

        // Create physics body with the shared world material
        const platformShape = new CANNON.Box(new CANNON.Vec3(
            config.size[0] / 2,
            config.size[1] / 2,
            config.size[2] / 2
        ));
        
        const platformBody = new CANNON.Body({ 
            mass: 0,
            material: window.worldMaterial, // Use the shared world material
            collisionFilterGroup: 1,  // Default collision group
            collisionFilterMask: 1    // Default collision mask
        });
        
        platformBody.addShape(platformShape);
        platformBody.position.set(
            config.position[0],
            config.position[1],
            config.position[2]
        );
        
        // Apply rotation to physics body if specified
        if (config.rotation) {
            const quaternion = new CANNON.Quaternion();
            quaternion.setFromEuler(
                config.rotation[0] || 0,
                config.rotation[1] || 0,
                config.rotation[2] || 0,
                'XYZ'
            );
            platformBody.quaternion.copy(quaternion);
        }
        
        // Store reference to visual mesh with the body
        platformBody.userData = { mesh: platform };
        world.addBody(platformBody);
    });
    
    // Create some suspended zip lines between distant platforms
    createZiplines();
    
    // Add vertical pillars for better visibility and improved collision detection
    createPillars();
}

// Generate a spiral staircase of platforms
function createSpiralStaircase(centerX, centerY, centerZ, radius, steps, stepWidth, stepHeight, stepDepth, color) {
    const stepConfigs = [];
    
    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        const y = centerY + (i * stepHeight);
        
        stepConfigs.push({
            size: [stepWidth, stepHeight / 2, stepDepth],
            position: [x, y, z],
            color: color,
            rotation: [0, angle, 0]
        });
    }
    
    return stepConfigs;
}

// Generate a ring of platforms at the same height
function createFloatingRing(centerX, centerY, centerZ, radius, platformCount, color) {
    const platformConfigs = [];
    
    for (let i = 0; i < platformCount; i++) {
        const angle = (i / platformCount) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        
        platformConfigs.push({
            size: [5, 1, 5],
            position: [x, centerY, z],
            color: color
        });
    }
    
    return platformConfigs;
}

// Create a bridge of small platforms between two points
function createSuspendedBridge(start, end, segments, color) {
    const bridgeConfigs = [];
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = start[0] + (end[0] - start[0]) * t;
        const y = start[1] + (end[1] - start[1]) * t;
        const z = start[2] + (end[2] - start[2]) * t;
        
        // Add some vertical oscillation for style
        const oscillation = Math.sin(t * Math.PI) * 5;
        
        bridgeConfigs.push({
            size: [3, 0.5, 3],
            position: [x, y + oscillation, z],
            color: color
        });
    }
    
    return bridgeConfigs;
}

// Create a grid of small platforms for challenging jumps
function createJumpGrid(startX, startY, startZ, rows, spacing, platformSize, color) {
    const gridConfigs = [];
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < rows; col++) {
            const x = startX + (col * (platformSize + spacing));
            const z = startZ + (row * (platformSize + spacing));
            // Randomize heights slightly for more challenge
            const y = startY + (Math.random() * 2 - 1);
            
            gridConfigs.push({
                size: [platformSize, 0.5, platformSize],
                position: [x, y, z],
                color: color
            });
        }
    }
    
    return gridConfigs;
}

// Create ziplines connecting distant platforms
function createZiplines() {
    const ziplineConfigs = [
        { start: [50, 10, 0], end: [0, 15, 50], color: 0x00ffff },
        { start: [0, 15, 50], end: [-50, 20, 0], color: 0xff00ff },
        { start: [-50, 20, 0], end: [0, 25, -50], color: 0xffff00 },
        { start: [0, 25, -50], end: [50, 10, 0], color: 0x00ff88 },
        { start: [80, 30, 80], end: [-80, 35, 80], color: 0xff0088 },
        { start: [-80, 35, 80], end: [-80, 40, -80], color: 0x88ff00 },
        { start: [-80, 40, -80], end: [80, 45, -80], color: 0x0088ff },
        { start: [80, 45, -80], end: [80, 30, 80], color: 0xff8800 },
    ];
    
    ziplineConfigs.forEach(config => {
        // Create a line geometry between the two points
        const points = [
            new THREE.Vector3(config.start[0], config.start[1], config.start[2]),
            new THREE.Vector3(config.end[0], config.end[1], config.end[2])
        ];
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: config.color, linewidth: 3 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        
        // Add glow effect with points along the line
        const glowPointCount = 50;
        const glowGeometry = new THREE.BufferGeometry();
        const glowPositions = new Float32Array(glowPointCount * 3);
        
        for (let i = 0; i < glowPointCount; i++) {
            const t = i / (glowPointCount - 1);
            glowPositions[i * 3] = points[0].x + (points[1].x - points[0].x) * t;
            glowPositions[i * 3 + 1] = points[0].y + (points[1].y - points[0].y) * t;
            glowPositions[i * 3 + 2] = points[0].z + (points[1].z - points[0].z) * t;
        }
        
        glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
        
        const glowMaterial = new THREE.PointsMaterial({
            color: config.color,
            size: 0.2,
            transparent: true,
            opacity: 0.8
        });
        
        const glowPoints = new THREE.Points(glowGeometry, glowMaterial);
        scene.add(glowPoints);
    });

    // Add more ziplines to connect new distant platforms
    const newZiplineConfigs = [
        { start: [150, 50, 150], end: [170, 55, 130], color: 0x66ffff },
        { start: [-150, 50, 150], end: [-170, 55, 130], color: 0xff66ff },
        { start: [-150, 50, -150], end: [-170, 55, -130], color: 0xffff66 },
        { start: [150, 50, -150], end: [170, 55, -130], color: 0x66ff66 },
        
        // Connect the central tower to the floating rings
        { start: [0, 35, 0], end: [0, 100, 40], color: 0x00ffee },
        { start: [0, 35, 0], end: [0, 100, -40], color: 0xee00ff },
        
        // Connect the speed-running platforms
        { start: [120, 3, 0], end: [140, 3, -20], color: 0xeeeeee },
        { start: [140, 3, -20], end: [160, 3, 0], color: 0xeeeeee },
        { start: [160, 3, 0], end: [140, 3, 20], color: 0xeeeeee },
        { start: [140, 3, 20], end: [120, 3, 0], color: 0xeeeeee },
    ];
    
    // Process new ziplines the same way as original ones
    newZiplineConfigs.forEach(config => {
        const points = [
            new THREE.Vector3(config.start[0], config.start[1], config.start[2]),
            new THREE.Vector3(config.end[0], config.end[1], config.end[2])
        ];
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ color: config.color, linewidth: 3 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        
        // Add glow effect with points along the line
        const glowPointCount = 50;
        const glowGeometry = new THREE.BufferGeometry();
        const glowPositions = new Float32Array(glowPointCount * 3);
        
        for (let i = 0; i < glowPointCount; i++) {
            const t = i / (glowPointCount - 1);
            glowPositions[i * 3] = points[0].x + (points[1].x - points[0].x) * t;
            glowPositions[i * 3 + 1] = points[0].y + (points[1].y - points[0].y) * t;
            glowPositions[i * 3 + 2] = points[0].z + (points[1].z - points[0].z) * t;
        }
        
        glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
        
        const glowMaterial = new THREE.PointsMaterial({
            color: config.color,
            size: 0.2,
            transparent: true,
            opacity: 0.8
        });
        
        const glowPoints = new THREE.Points(glowGeometry, glowMaterial);
        scene.add(glowPoints);
    });
}

// Position multiple hacking nodes throughout the level
function createHackingNode() {
    const hackingNodePositions = [
        { position: [0, 5, 15], color: 0x00ff88 },
        { position: [50, 12, 0], color: 0xff0088 },
        { position: [-50, 22, 0], color: 0x88ff00 },
        { position: [0, 27, -50], color: 0x0088ff },
        { position: [80, 32, 80], color: 0xff8800 },
        // Additional hacking nodes at the far corners
        { position: [150, 52, 150], color: 0x00ffaa },
        { position: [-150, 52, 150], color: 0xff00aa },
        { position: [-150, 52, -150], color: 0xaaff00 },
        { position: [150, 52, -150], color: 0x00aaff },
        // Hacking node at the top of the spiral staircase
        { position: [0, 50, 0], color: 0xaa00ff },
        // Hacking nodes on the floating rings
        { position: [0, 102, 40], color: 0xff0000 },
        { position: [0, 122, 0], color: 0x00ff00 },
        { position: [0, 142, 0], color: 0x0000ff },
    ];
    
    hackingNodePositions.forEach((nodeConfig, index) => {
        const hackGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const hackMaterial = new THREE.MeshBasicMaterial({ 
            color: nodeConfig.color, 
            transparent: true, 
            opacity: 0.8 
        });
        
        const node = new THREE.Mesh(hackGeometry, hackMaterial);
        node.position.set(
            nodeConfig.position[0],
            nodeConfig.position[1],
            nodeConfig.position[2]
        );
        scene.add(node);
        
        // Store reference to the first node as the main hacking node
        if (index === 0) {
            hackingNode = node;
        }
        
        // Add point light for glow effect
        const hackLight = new THREE.PointLight(nodeConfig.color, 0.8, 3);
        hackLight.position.copy(node.position);
        scene.add(hackLight);
    });
}

// Update camera to handle the much larger level
function updateCamera() {
    const playerVelocity = new THREE.Vector3(
        playerBody.velocity.x,
        0,
        playerBody.velocity.z
    );
    
    // Update camera angle based on key input
    if (keys['KeyQ']) {
        cameraAngle += 0.03; // Rotate left
    }
    if (keys['KeyE']) {
        cameraAngle -= 0.03; // Rotate right
    }
    
    // Adjust camera distance based on player speed
    const speed = playerVelocity.length();
    const cameraDistance = 12 + speed * 0.2;
    const cameraHeight = 3 + speed * 0.1;
    
    // Apply rotation to camera position
    const offsetX = Math.sin(cameraAngle) * cameraDistance;
    const offsetZ = Math.cos(cameraAngle) * cameraDistance;
    
    // Create ideal offset based on speed and rotation
    const idealOffset = new THREE.Vector3(offsetX, cameraHeight, offsetZ);
    
    // Set camera follow speed
    const followSpeed = Math.min(0.2, 0.05 + speed * 0.005);
    
    // Smoothly move camera to new position
    camera.position.lerp(
        playerMesh.position.clone().add(idealOffset),
        followSpeed
    );
    
    // Look at player
    camera.lookAt(
        playerMesh.position.x,
        playerMesh.position.y + PLAYER_HEIGHT / 2,
        playerMesh.position.z
    );
}

// Create the player character with a box shape to prevent sinking
function createPlayer() {
    // Create a group to hold the player model
    playerMesh = new THREE.Group();
    scene.add(playerMesh);

    // Create player physics material with lower friction
    const playerMaterial = new CANNON.Material('playerMaterial');
    playerMaterial.friction = 0.01; // Very low friction
    
    // Use a box shape instead of a cylinder to prevent sinking
    const playerShape = new CANNON.Box(new CANNON.Vec3(PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2, PLAYER_DEPTH / 2));
    playerBody = new CANNON.Body({ mass: PLAYER_MASS, material: playerMaterial });
    
    // Add the shape to the body (no rotation needed since it's a box)
    playerBody.addShape(playerShape);
    
    // Start the player slightly above the ground
    playerBody.position.set(0, 5, 0);
    playerBody.linearDamping = 0.05;
    playerBody.angularDamping = 0.99;
    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    world.addBody(playerBody);

    // Create contact material between player and world
    const worldMaterial = new CANNON.Material('worldMaterial');
    const playerWorldContact = new CANNON.ContactMaterial(
        playerMaterial,
        worldMaterial,
        {
            friction: 0.01,  // Low friction between player and world
            restitution: 0.0,  // No bounce
            contactEquationStiffness: 1e9,  // Increased stiffness to prevent sinking
            contactEquationRelaxation: 2    // Reduced relaxation for more stable contacts
        }
    );
    world.addContactMaterial(playerWorldContact);

    // Create the procedural cyberpunk character model
    createCyberpunkCharacter();

    // Set up better contact detection for jumping and movement
    playerBody.addEventListener("collide", (e) => {
        const contactNormal = e.contact.ni.clone().negate();
        
        // More permissive check for ground contact
        if (contactNormal.y > 0.1) { // Reduced from 0.2 to 0.1
            playerCanJump = true;
            
            // Check if we've landed on a platform
            checkPlatformLanding(e.body);
            
            // Apply a small upward correction to prevent sinking (if needed)
            if (Math.abs(playerBody.velocity.y) < 0.5) {
                const penetrationDepth = e.contact.getImpactVelocityAlongNormal();
                if (penetrationDepth < 0) {
                    playerBody.position.y += Math.min(Math.abs(penetrationDepth) * 0.5, 0.05);
                }
                // Removed the upward force to prevent floating
                // playerBody.applyForce(new CANNON.Vec3(0, 10, 0), playerBody.position);
            }
        }
    });
    
    // Return the world material so we can use it for platforms
    return worldMaterial;
}

// Create a procedural cyberpunk character model
function createCyberpunkCharacter() {
    // Create a group for the model
    playerModel = new THREE.Group();
    
    // Define cyberpunk color palette
    const primaryColor = 0x3388ff;
    const secondaryColor = 0xff3388;
    const accentColor = 0x33ff88;
    const emissiveColor = 0x112244;
    
    // Create a low-poly body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: primaryColor,
        emissive: emissiveColor,
        shininess: 30
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;
    playerModel.add(body);
    
    // Create a more detailed head with cyberpunk elements
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.9;
    
    // Basic head shape
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.35);
    const headMaterial = new THREE.MeshPhongMaterial({ 
        color: primaryColor,
        emissive: emissiveColor,
        shininess: 30
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    headGroup.add(head);
    
    // Cybernetic eye/visor
    const visorGeometry = new THREE.BoxGeometry(0.42, 0.1, 0.37);
    const visorMaterial = new THREE.MeshPhongMaterial({ 
        color: accentColor, 
        emissive: accentColor,
        emissiveIntensity: 0.5,
        shininess: 90 
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.y = 0.05;
    visor.position.z = 0.01;
    headGroup.add(visor);
    
    // Cybernetic ear pieces
    const earGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.1);
    const earMaterial = new THREE.MeshPhongMaterial({ 
        color: secondaryColor,
        emissive: secondaryColor,
        emissiveIntensity: 0.3,
        shininess: 30
    });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.225, 0, 0);
    headGroup.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.225, 0, 0);
    headGroup.add(rightEar);
    
    playerModel.add(headGroup);
    
    // Create arms with glowing accent elements
    const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const armMaterial = new THREE.MeshPhongMaterial({ 
        color: primaryColor,
        emissive: emissiveColor,
        shininess: 30
    });
    
    // Left arm
    const leftArm = new THREE.Group();
    const leftArmMesh = new THREE.Mesh(armGeometry, armMaterial);
    leftArmMesh.castShadow = true;
    leftArm.add(leftArmMesh);
    
    // Left arm accent stripe
    const leftArmAccentGeometry = new THREE.BoxGeometry(0.03, 0.6, 0.17);
    const leftArmAccentMaterial = new THREE.MeshPhongMaterial({ 
        color: secondaryColor,
        emissive: secondaryColor,
        emissiveIntensity: 0.5,
        shininess: 90
    });
    const leftArmAccent = new THREE.Mesh(leftArmAccentGeometry, leftArmAccentMaterial);
    leftArmAccent.position.x = 0.08;
    leftArm.add(leftArmAccent);
    
    leftArm.position.set(-0.4, 0.4, 0);
    playerModel.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Group();
    const rightArmMesh = new THREE.Mesh(armGeometry, armMaterial);
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);
    
    // Right arm accent stripe
    const rightArmAccentGeometry = new THREE.BoxGeometry(0.03, 0.6, 0.17);
    const rightArmAccentMaterial = new THREE.MeshPhongMaterial({ 
        color: secondaryColor,
        emissive: secondaryColor,
        emissiveIntensity: 0.5,
        shininess: 90
    });
    const rightArmAccent = new THREE.Mesh(rightArmAccentGeometry, rightArmAccentMaterial);
    rightArmAccent.position.x = -0.08;
    rightArm.add(rightArmAccent);
    
    rightArm.position.set(0.4, 0.4, 0);
    playerModel.add(rightArm);
    
    // Create legs with cyberpunk details
    const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const legMaterial = new THREE.MeshPhongMaterial({ 
        color: primaryColor,
        emissive: emissiveColor,
        shininess: 30
    });
    
    // Left leg
    const leftLeg = new THREE.Group();
    const leftLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    leftLegMesh.castShadow = true;
    leftLeg.add(leftLegMesh);
    
    // Left leg accent (the "feet")
    const leftLegAccentGeometry = new THREE.BoxGeometry(0.22, 0.1, 0.22);
    const leftLegAccentMaterial = new THREE.MeshPhongMaterial({ 
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.3,
        shininess: 80
    });
    const leftLegAccent = new THREE.Mesh(leftLegAccentGeometry, leftLegAccentMaterial);
    leftLegAccent.position.y = -0.2;
    leftLeg.add(leftLegAccent);
    
    leftLeg.position.set(-0.2, -0.3, 0);
    playerModel.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Group();
    const rightLegMesh = new THREE.Mesh(legGeometry, legMaterial);
    rightLegMesh.castShadow = true;
    rightLeg.add(rightLegMesh);
    
    // Right leg accent (the "feet")
    const rightLegAccentGeometry = new THREE.BoxGeometry(0.22, 0.1, 0.22);
    const rightLegAccentMaterial = new THREE.MeshPhongMaterial({ 
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.3,
        shininess: 80
    });
    const rightLegAccent = new THREE.Mesh(rightLegAccentGeometry, rightLegAccentMaterial);
    rightLegAccent.position.y = -0.2;
    rightLeg.add(rightLegAccent);
    
    rightLeg.position.set(0.2, -0.3, 0);
    playerModel.add(rightLeg);
    
    // Add backpack/cybernetic enhancement
    const backpackGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.2);
    const backpackMaterial = new THREE.MeshPhongMaterial({ 
        color: secondaryColor,
        emissive: secondaryColor,
        emissiveIntensity: 0.2,
        shininess: 50
    });
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    backpack.position.set(0, 0.4, -0.25);
    backpack.castShadow = true;
    playerModel.add(backpack);
    
    // Add glow effect for the cyberpunk feel
    const playerLight = new THREE.PointLight(accentColor, 0.6, 2);
    playerLight.position.set(0, 0.5, 0);
    playerModel.add(playerLight);
    
    // Offset the model so the feet align with the bottom of the physics body
    // The legs are at y = -0.3, and the leg accents (feet) are at y = -0.2 relative to the legs,
    // so the bottom of the feet is at y = -0.5 relative to the model's origin
    playerModel.position.y = PLAYER_HEIGHT / 3.5 - 0.75; // Adjusted to lower the model
    
    // Add the model to the player mesh group
    playerMesh.add(playerModel);
    
    // Store references to limbs for animation
    playerModel.userData = {
        leftArm: leftArm,
        rightArm: rightArm,
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        head: headGroup,
        body: body
    };
}

// Update player movement with animations for the new model
function updatePlayerMovement() {
    const currentVel = playerBody.velocity.clone();
    
    // Force vector application
    let moveX = 0;
    let moveZ = 0;
    
    // Get camera direction for movement relative to camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Get right vector for sideways movement
    const right = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

    // Check sprint
    isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    const maxSpeed = isSprinting && stamina > 0 ? 31.875 : 18.75; // Reduced by 25%
    
    // SIMPLIFIED GROUND DETECTION
    // Check if falling or nearly stopped vertically and close to ground
    const isOnGround = Math.abs(playerBody.velocity.y) < 0.5 && simpleGroundCheck();
    
    // Update timer for how long player has been on ground
    if (isOnGround) {
        onGroundTimer += TIME_STEP;
        if (onGroundTimer > 0.1) { // If on ground for more than 0.1 seconds
            playerCanJump = true;
        }
    } else {
        onGroundTimer = 0;
    }
    
    // Backup ground detection - if velocity is very low and player is not jumping,
    // assume they're on the ground
    const horizontalVel = Math.sqrt(
        playerBody.velocity.x * playerBody.velocity.x + 
        playerBody.velocity.z * playerBody.velocity.z
    );
    if (Math.abs(playerBody.velocity.y) < 0.2 && horizontalVel < 0.5 && framesSinceJump > 30) {
        playerCanJump = true;
    }
    
    // Count frames since last jump for more reliable timeout
    framesSinceJump++;
    
    // Directly set movement values based on key presses
    if (keys['KeyW']) { 
        moveX += cameraDirection.x;
        moveZ += cameraDirection.z;
    }
    if (keys['KeyS']) { 
        moveX -= cameraDirection.x;
        moveZ -= cameraDirection.z;
    }
    if (keys['KeyA']) { 
        moveX -= right.x;
        moveZ -= right.z;
    }
    if (keys['KeyD']) { 
        moveX += right.x;
        moveZ += right.z;
    }
    
    // Only normalize if we're actually moving
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX /= length;
        moveZ /= length;
        
        const moveForce = MOVE_FORCE * (isSprinting && stamina > 0 ? 1.5 : 1);
        
        // Apply force for acceleration - increased force to overcome any friction
        playerBody.applyForce(new CANNON.Vec3(moveX * moveForce * 1.5, 0, moveZ * moveForce * 1.5), playerBody.position);
        
        // Direct velocity control for responsive movement
        if (isOnGround) {
            // More balanced approach: 0.3/0.7 instead of 0.1/0.9
            playerBody.velocity.x = 0.3 * playerBody.velocity.x + 0.7 * (moveX * maxSpeed);
            playerBody.velocity.z = 0.3 * playerBody.velocity.z + 0.7 * (moveZ * maxSpeed);
        }
    }
    
    // Speed capping to ensure we don't exceed max speed
    const velocity = playerBody.velocity;
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    
    if (horizontalSpeed > maxSpeed) {
        const scale = maxSpeed / horizontalSpeed
        velocity.x *= scale;
        velocity.z *= scale;
        playerBody.velocity.x = velocity.x;
        playerBody.velocity.z = velocity.z;
    }
    
    // Handle jumping - SIMPLIFIED APPROACH
    if (keys['Space'] && playerCanJump) {
        console.log("JUMPING NOW"); // Debug message
        
        // Apply upward force for jump
        playerBody.velocity.y = 0; // Reset vertical velocity first
        playerBody.applyImpulse(new CANNON.Vec3(0, JUMP_FORCE, 0), playerBody.position);
        
        // Create jump trail particles
        createJumpTrailEffect();
        
        // Disable jumping and reset timers
        playerCanJump = false;
        onGroundTimer = 0;
        framesSinceJump = 0;
        lastJumpTime = Date.now();
    }
    
    // FORCE ENABLE JUMPING - If player has been on the ground for more than 0.5 seconds
    // This helps if other detection methods fail
    const now = Date.now();
    if (now - lastJumpTime > 500) {
        // Emergency jump ability recovery if we're near the ground
        if (simpleGroundCheck() && Math.abs(playerBody.velocity.y) < 0.5) {
            playerCanJump = true;
        }
    }

    // Prevent falling forever
    if (playerBody.position.y < -10) {
        playerBody.position.set(0, 5, 0);
        playerBody.velocity.set(0, 0, 0);
        playerCanJump = true; // Reset jump capability when respawning
    }
    
    // Animate the cyberpunk character model
    if (playerModel && playerModel.userData) {
        // Rotate the model to face the direction of movement
        if (moveX !== 0 || moveZ !== 0) {
            const moveAngle = Math.atan2(moveX, moveZ);
            const currentRotation = playerModel.rotation.y;
            
            // Smoothly rotate the model toward the movement direction
            playerModel.rotation.y = currentRotation + (moveAngle - currentRotation) * 0.1;
            
            // Running animation for legs and arms
            const runCycle = Math.sin(Date.now() / 100 * (horizontalSpeed / 10));
            const limbSwing = Math.max(0.2, Math.min(0.8, horizontalSpeed / 20));
            
            // Animate limbs
            if (playerModel.userData.leftLeg) {
                playerModel.userData.leftLeg.rotation.x = runCycle * limbSwing;
                playerModel.userData.rightLeg.rotation.x = -runCycle * limbSwing;
                playerModel.userData.leftArm.rotation.x = -runCycle * limbSwing;
                playerModel.userData.rightArm.rotation.x = runCycle * limbSwing;
            }
            
            // Bob the body slightly
            const bobAmount = 0.05;
            if (playerModel.userData.body) {
                playerModel.userData.body.position.y = 0.4 + Math.abs(Math.sin(Date.now() / 150 * (horizontalSpeed / 10))) * bobAmount;
            }
            
            // Tilt the model slightly when turning
            const turnAmount = 0.2;
            playerModel.rotation.z = (currentRotation - moveAngle) * turnAmount;
        } else {
            // Reset animations when not moving
            if (playerModel.userData.leftLeg) {
                playerModel.userData.leftLeg.rotation.x = 0;
                playerModel.userData.rightLeg.rotation.x = 0;
                playerModel.userData.leftArm.rotation.x = 0;
                playerModel.userData.rightArm.rotation.x = 0;
            }
            
            // Reset body position
            if (playerModel.userData.body) {
                playerModel.userData.body.position.y = 0.4;
            }
        }
        
        // Lean forward when sprinting
        if (isSprinting && stamina > 0) {
            playerModel.rotation.x = Math.min(playerModel.rotation.x + 0.01, 0.3);
        } else {
            playerModel.rotation.x = Math.max(playerModel.rotation.x - 0.01, 0);
        }
        
        // Head look up/down when jumping/falling
        if (playerModel.userData.head && !isOnGround) {
            playerModel.userData.head.rotation.x = Math.max(-0.3, Math.min(0.3, playerBody.velocity.y * 0.05));
        } else if (playerModel.userData.head) {
            playerModel.userData.head.rotation.x = 0;
        }
    }
    
    // Check if player has entered a new biome
    updateCurrentBiome();
}

// Ultra simple ground check function with improved correction
function simpleGroundCheck() {
    const pos = playerBody.position;
    // Since we're using a box shape, the bottom of the physics body is at y - PLAYER_HEIGHT/2
    const footY = pos.y - PLAYER_HEIGHT / 2;

    // Use a simple downward ray check
    for (const body of world.bodies) {
        // Skip player's own body and dynamic objects
        if (body === playerBody || body.mass > 0) continue;
        
        // Get the top of the object
        let topY = body.position.y;
        if (body.shapes && body.shapes.length > 0) {
            if (body.shapes[0].type === CANNON.Shape.types.BOX) {
                topY += body.shapes[0].halfExtents.y;
            } else if (body.shapes[0].type === CANNON.Shape.types.CYLINDER) {
                topY += body.shapes[0].height / 2;
            }
        }
        
        // Check if we're close to the top of this object - tighter tolerance
        const distanceToTop = Math.abs(footY - topY);
        
        if (distanceToTop < 0.1) { // Reduced from 0.2 to 0.1 for more precise detection
            // Check if we're also above the object horizontally
            const dx = body.position.x - pos.x;
            const dz = body.position.z - pos.z;
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            
            // Get the effective radius/width of the body
            let effectiveRadius = 1; // Default
            if (body.shapes && body.shapes.length > 0) {
                if (body.shapes[0].type === CANNON.Shape.types.BOX) {
                    // For box, use the diagonal of the horizontal cross-section
                    const ex = body.shapes[0].halfExtents.x;
                    const ez = body.shapes[0].halfExtents.z;
                    effectiveRadius = Math.sqrt(ex * ex + ez * ez);
                } else if (body.shapes[0].type === CANNON.Shape.types.CYLINDER) {
                    effectiveRadius = body.shapes[0].radiusTop;
                }
            }
            
            if (horizontalDist < effectiveRadius + PLAYER_WIDTH / 2) {
                // We're on top of this body - apply a precise correction if we're sinking
                if (footY < topY && Math.abs(playerBody.velocity.y) < 0.5) {
                    playerBody.position.y += topY - footY; // No additional offset
                    playerBody.velocity.y = Math.max(playerBody.velocity.y, 0); // Prevent downward velocity
                    console.log("Ground correction applied - footY:", footY, "topY:", topY, "new playerBody.position.y:", playerBody.position.y);
                }
                
                // Record platform landing for scoring
                if (body.position.y > 0.5 && framesSinceJump > 20) {
                    checkPlatformLanding(body);
                }
                return true;
            }
        }
    }
    return false;
}

// Animate the game loop
function animate() {
    requestAnimationFrame(animate);
    
    // Only run game logic if the game has started
    if (!gameStarted) return;
    
    try {
        world.step(TIME_STEP);
        
        // Extra jump fix: Every 30 frames, check if the player is on the ground and not moving much
        if (frameCount % 30 === 0) {
            const vel = playerBody.velocity;
            if (Math.abs(vel.y) < 0.1 && simpleGroundCheck()) {
                playerCanJump = true;
            }
            
            // Debug - log jump status
            console.log("Can jump:", playerCanJump, 
                        "Y velocity:", playerBody.velocity.y,
                        "On ground:", simpleGroundCheck(),
                        "Frames since jump:", framesSinceJump);
        }
        
        // Check for ground contact every frame to prevent sinking
        const isGrounded = simpleGroundCheck();
        
        // If we're on the ground and barely moving vertically, apply a small correction
        if (isGrounded && Math.abs(playerBody.velocity.y) < 0.5) {
            // Find the surface we're standing on
            const pos = playerBody.position;
            const footY = pos.y - PLAYER_HEIGHT / 2;
            
            let surfaceY = -Infinity;
            let surfaceBody = null;
            
            // Find the highest surface below the player
            for (const body of world.bodies) {
                if (body === playerBody || body.mass > 0) continue;
                
                // Get the top of the object
                let topY = body.position.y;
                if (body.shapes && body.shapes.length > 0) {
                    if (body.shapes[0].type === CANNON.Shape.types.BOX) {
                        topY += body.shapes[0].halfExtents.y;
                    } else if (body.shapes[0].type === CANNON.Shape.types.CYLINDER) {
                        topY += body.shapes[0].height / 2;
                    }
                }
                
                // Check if this is a surface we're standing on
                const dx = body.position.x - pos.x;
                const dz = body.position.z - pos.z;
                const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                
                // Get the effective radius/width of the body
                let effectiveRadius = 1;
                if (body.shapes && body.shapes.length > 0) {
                    if (body.shapes[0].type === CANNON.Shape.types.BOX) {
                        const ex = body.shapes[0].halfExtents.x;
                        const ez = body.shapes[0].halfExtents.z;
                        effectiveRadius = Math.sqrt(ex * ex + ez * ez);
                    } else if (body.shapes[0].type === CANNON.Shape.types.CYLINDER) {
                        effectiveRadius = body.shapes[0].radiusTop;
                    }
                }
                
                if (horizontalDist < effectiveRadius + PLAYER_WIDTH / 2 && topY > surfaceY && topY <= footY + 0.1) {
                    surfaceY = topY;
                    surfaceBody = body;
                }
            }
            
            // If we found a surface and we're slightly below it, correct position
            if (surfaceBody && footY < surfaceY) {
                // Move player up to be exactly on the surface
                playerBody.position.y += surfaceY - footY + 0.01;
                // Zero out any downward velocity
                if (playerBody.velocity.y < 0) {
                    playerBody.velocity.y = 0;
                }
            }
        }
        
        // Track frame count for periodic checks
        frameCount++;
        
        updatePlayerMovement();
        
        // Update the player mesh position to match the physics body
        playerMesh.position.copy(playerBody.position);
        
        // Calculate and update total horizontal distance traveled
        if (lastPosition === null) {
            lastPosition = new THREE.Vector3(playerBody.position.x, 0, playerBody.position.z);
        } else {
            const currentPosition = new THREE.Vector3(playerBody.position.x, 0, playerBody.position.z);
            const distanceMoved = currentPosition.distanceTo(lastPosition);
            
            // Only add meaningful movement (avoid tiny vibrations/physics jitter)
            if (distanceMoved > 0.01) {
                totalDistance += distanceMoved;
                lastPosition.copy(currentPosition);
                
                // Update distance display
                const distanceElement = document.getElementById('distance');
                if (distanceElement) {
                    distanceElement.textContent = `Distance: ${Math.round(totalDistance)}m`;
                }
            }
        }
        
        drones.forEach(drone => {
            const dronePos = drone.body.position;
            const playerPos = playerBody.position;
            const distanceToPlayer = new THREE.Vector3().subVectors(
                new THREE.Vector3(dronePos.x, 0, dronePos.z),
                new THREE.Vector3(playerPos.x, 0, playerPos.z)
            ).length();

            const distanceToNode = new THREE.Vector3().subVectors(
                new THREE.Vector3(dronePos.x, 0, dronePos.z),
                hackingNode.position
            ).length();

            if (distanceToNode < DRONE_DETECTION_RANGE && distanceToPlayer < DRONE_CHASE_RANGE) {
                drone.target = playerBody;
            } else {
                drone.target = null;
            }

            if (drone.target) {
                const direction = new THREE.Vector3().subVectors(
                    new THREE.Vector3(playerPos.x, 0, playerPos.z),
                    new THREE.Vector3(dronePos.x, 0, dronePos.z)
                ).normalize();
                drone.body.velocity.x = direction.x * DRONE_SPEED;
                drone.body.velocity.z = direction.z * DRONE_SPEED;
                drone.body.velocity.y = 0;
            } else {
                if (Math.random() < 0.01) {
                    const randomDirection = new THREE.Vector3(
                        Math.random() * 2 - 1,
                        0,
                        Math.random() * 2 - 1
                    ).normalize();
                    drone.body.velocity.x = randomDirection.x * DRONE_SPEED;
                    drone.body.velocity.z = randomDirection.z * DRONE_SPEED;
                    drone.body.velocity.y = 0;
                }
            }

            drone.body.position.y = 2;
            drone.mesh.position.copy(drone.body.position);
        });

        if (isSprinting && stamina > 0) {
            particleSystem.visible = true;
            const positions = particleSystem.geometry.attributes.position.array;
            const velocities = particleSystem.geometry.attributes.velocity.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3] += velocities[i * 3] * TIME_STEP;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * TIME_STEP;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * TIME_STEP;

                if (positions[i * 3 + 1] > 1 || positions[i * 3 + 1] < 0) {
                    positions[i * 3] = playerMesh.position.x;
                    positions[i * 3 + 1] = playerMesh.position.y;
                    positions[i * 3 + 2] = playerMesh.position.z;
                    velocities[i * 3] = (Math.random() - 0.5) * 0.5;
                    velocities[i * 3 + 1] = Math.random() * 0.5;
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
                }
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
            particleSystem.position.set(playerMesh.position.x, playerMesh.position.y, playerMesh.position.z);
        } else {
            particleSystem.visible = false;
        }

        if (!isHacking) {
            const pulseTime = Date.now() * 0.001;
            hackingNode.scale.set(
                1 + Math.sin(pulseTime * 2) * 0.05,
                1 + Math.sin(pulseTime * 2) * 0.05,
                1 + Math.sin(pulseTime * 2) * 0.05
            );
        }
        
        if (isSprinting && stamina > 0) {
            stamina -= STAMINA_DRAIN_RATE * TIME_STEP;
            if (stamina < 0) stamina = 0;
        } else if (!isSprinting && stamina < 100) {
            stamina += STAMINA_RECOVER_RATE * TIME_STEP;
            if (stamina > 100) stamina = 100;
        }
        
        // Update score messages animations
        updateScoreMessages();
        
        // Update camera to follow player
        updateCamera();
        
        // Update animated biome elements
        if (scene.userData && scene.userData.animatedObjects) {
            scene.userData.animatedObjects.forEach(obj => {
                if (obj.userData.particles) {
                    // Animate data stream particles
                    obj.userData.particles.children.forEach(particle => {
                        particle.position.y += particle.userData.speed;
                        
                        // Reset when reached the top
                        if (particle.position.y > particle.userData.maxHeight) {
                            particle.position.y = particle.userData.minHeight;
                        }
                    });
                }
            });
        }
        
        // Animate obstacles with animation data
        obstacles.forEach(obstacle => {
            if (obstacle.animate && obstacle.mesh) {
                // Apply rotation animation
                if (obstacle.mesh.userData.rotationSpeed) {
                    obstacle.mesh.rotation.x += obstacle.mesh.userData.rotationSpeed.x;
                    obstacle.mesh.rotation.y += obstacle.mesh.userData.rotationSpeed.y;
                    obstacle.mesh.rotation.z += obstacle.mesh.userData.rotationSpeed.z;
                    
                    // Update the physics body position (keeping it sync)
                    obstacle.body.position.copy(obstacle.mesh.position);
                    obstacle.body.quaternion.copy(obstacle.mesh.quaternion);
                }
            }
        });
        
        // Update jump trail particles
        updateJumpTrailParticles();
        
        renderer.render(scene, camera);
    } catch (error) {
        console.error("Error in animate:", error);
    }
}

// New function to create visible pillars with proper collision
function createPillars() {
    // Define locations for pillars (can be near important platforms)
    const pillarLocations = [
        { position: [20, 5, 20], height: 10, radius: 0.8, color: 0x6688cc },
        { position: [-20, 7.5, 20], height: 15, radius: 0.8, color: 0x88cc66 },
        { position: [20, 10, -20], height: 20, radius: 0.8, color: 0xcc6688 },
        { position: [-20, 12.5, -20], height: 25, radius: 0.8, color: 0xcc8866 },
        { position: [40, 5, 0], height: 10, radius: 0.8, color: 0x66cc88 },
        { position: [-40, 7.5, 0], height: 15, radius: 0.8, color: 0x8866cc },
        { position: [0, 10, 40], height: 20, radius: 0.8, color: 0xcc6688 },
        { position: [0, 12.5, -40], height: 25, radius: 0.8, color: 0x66aacc }
    ];
    
    pillarLocations.forEach(pillar => {
        // Create visual pillar
        const pillarGeometry = new THREE.CylinderGeometry(
            pillar.radius, 
            pillar.radius, 
            pillar.height, 
            16
        );
        
        const pillarMaterial = new THREE.MeshPhongMaterial({
            color: pillar.color,
            emissive: new THREE.Color(
                (pillar.color >> 16 & 0xff) / 4000,
                (pillar.color >> 8 & 0xff) / 4000,
                (pillar.color & 0xff) / 4000
            )
        });
        
        const pillarMesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
        
        // Position pillar with bottom at ground level
        pillarMesh.position.set(
            pillar.position[0],
            pillar.position[1] + pillar.height / 2,
            pillar.position[2]
        );
        
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        scene.add(pillarMesh);
        obstacles.push(pillarMesh);
        
        // Add neon rings around the pillar
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const ringGeometry = new THREE.TorusGeometry(pillar.radius + 0.1, 0.05, 8, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                emissive: 0x00ffff 
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            
            // Position rings at different heights
            const heightFactor = i / (ringCount - 1);
            const ringHeight = pillar.position[1] + pillar.height * heightFactor;
            
            ring.position.set(
                pillar.position[0],
                ringHeight,
                pillar.position[2]
            );
            
            ring.rotation.x = Math.PI / 2; // Rotate to be horizontal
            scene.add(ring);
        }
        
        // Create physics body
        const pillarShape = new CANNON.Cylinder(
            pillar.radius,
            pillar.radius,
            pillar.height,
            8
        );
        
        const pillarBody = new CANNON.Body({
            mass: 0,
            material: window.worldMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: 1
        });
        
        // Rotate the cylinder to match visual orientation
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        pillarBody.addShape(pillarShape, new CANNON.Vec3(), quat);
        
        pillarBody.position.set(
            pillar.position[0],
            pillar.position[1] + pillar.height / 2,
            pillar.position[2]
        );
        
        world.addBody(pillarBody);
    });
}

// New function to check if player landed on a platform and award points
function checkPlatformLanding(contactBody) {
    // Skip if it's not a platform or if player was already on ground
    if (!contactBody || contactBody.mass !== 0) return;
    
    // Get the height (y-position) of the platform
    const platformHeight = contactBody.position.y;
    
    // Skip if platform is the main ground (near y=0)
    if (platformHeight < 0.5) return;
    
    // Create a unique ID for the platform based on position
    // Use more precision to avoid duplicate IDs for nearby platforms
    const platformId = `${contactBody.position.x.toFixed(1)},${platformHeight.toFixed(1)},${contactBody.position.z.toFixed(1)}`;
    
    // Get current time
    const now = Date.now() / 1000;
    
    // Check for scoring cooldown and avoid duplicate scoring
    if (platformId === lastScoredPlatformId && now - lastScoredTime < SCORING_COOLDOWN) {
        return; // Prevent duplicate scoring on same platform within cooldown period
    }
    
    // Check if this is a new platform
    const isNewPlatform = !landedPlatforms.has(platformId);
    
    // Only award points for new platforms
    if (isNewPlatform) {
        // Calculate points based on height
        // Higher platforms award more points
        let points = Math.round(BASE_PLATFORM_SCORE + (platformHeight * 2));
        
        // Double points for new platforms
        points *= 2;
        
        // Add to landed platforms set
        landedPlatforms.add(platformId);
        
        // Check for combo multiplier
        if (now - lastScoreTime < COMBO_TIME) {
            // Increase multiplier for quick successive platform landings
            scoreMultiplier = Math.min(scoreMultiplier + 0.5, 5.0);
        } else {
            // Reset multiplier if too much time has passed
            scoreMultiplier = 1.0;
        }
        
        // Apply multiplier to points
        points = Math.round(points * scoreMultiplier);
        
        // Update score and last score time
        score += points;
        lastScoreTime = now;
        lastScoredPlatformId = platformId;
        lastScoredTime = now;
        
        // Update the score display
        document.getElementById('score').textContent = `Score: ${score}`;
        
        // Create visual feedback for score
        createScoreMessage(points, true, platformHeight);
    }
}

// Create floating score message for visual feedback
function createScoreMessage(points, isNewPlatform, height) {
    // Create message text
    let message = `+${points}`;
    if (scoreMultiplier > 1) {
        message += ` x${scoreMultiplier.toFixed(1)}`;
    }
    if (isNewPlatform) {
        message += " NEW!";
    }
    
    // Create HTML element for score popup
    const scoreElement = document.createElement('div');
    scoreElement.className = 'score-popup';
    scoreElement.textContent = message;
    
    // Brighter colors for better visibility
    if (isNewPlatform) {
        scoreElement.style.color = '#ffff00'; // Bright yellow
        scoreElement.style.fontSize = '28px'; // Slightly larger
    } else {
        scoreElement.style.color = '#ffffff'; // White
    }
    
    document.body.appendChild(scoreElement);
    
    // Position the score message near the player
    const updatePosition = () => {
        // Convert 3D position to screen coordinates
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(playerMesh.matrixWorld);
        vector.y += 2; // Position above player's head
        
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
        
        scoreElement.style.left = x + 'px';
        scoreElement.style.top = y + 'px';
    };
    
    // Add to active score messages
    const scoreMessage = {
        element: scoreElement,
        updatePosition: updatePosition,
        created: Date.now(),
        lifetime: 2000 // 2 seconds
    };
    
    scoreMessages.push(scoreMessage);
}

// Update score messages (animate and remove old ones)
function updateScoreMessages() {
    const now = Date.now();
    for (let i = scoreMessages.length - 1; i >= 0; i--) {
        const message = scoreMessages[i];
        
        // Update position to follow player
        message.updatePosition();
        
        // Calculate age and fade out
        const age = now - message.created;
        if (age > message.lifetime) {
            // Remove old messages
            document.body.removeChild(message.element);
            scoreMessages.splice(i, 1);
        } else {
            // Animate - fade out and float upward
            const progress = age / message.lifetime;
            message.element.style.opacity = 1 - progress;
            message.element.style.transform = `translateY(-${progress * 50}px)`;
        }
    }
}

// Create security drones that patrol and chase the player
function createDrones() {
    // Use more interesting geometry for drones
    const droneGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const droneMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2
    });

    // Add glow effect to drones
    const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < 2; i++) {
        const droneMesh = new THREE.Mesh(droneGeometry, droneMaterial);
        droneMesh.position.set(
            Math.random() * 10 - 5,
            2,
            Math.random() * 10 - 5
        );
        droneMesh.castShadow = true;
        scene.add(droneMesh);
        
        // Add glow effect around drone
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        droneMesh.add(glowMesh);
        
        // Add spotlight from drone
        const droneLight = new THREE.SpotLight(0xff0000, 1, 15, Math.PI/6, 0.8, 1);
        droneLight.position.set(0, 0, 0);
        droneLight.target.position.set(0, -1, 0);
        droneMesh.add(droneLight);
        droneMesh.add(droneLight.target);

        const droneBody = new CANNON.Body({ mass: 1 });
        const droneShape = new CANNON.Sphere(0.3);
        droneBody.addShape(droneShape);
        droneBody.position.copy(droneMesh.position);
        world.addBody(droneBody);

        drones.push({ mesh: droneMesh, body: droneBody, target: null, light: droneLight });
    }
}

// Initialize the game
function init() {
    console.log("init called");
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050530);
    scene.fog = new THREE.FogExp2(0x050530, 0.008); // Enhanced exponential fog for better depth perception

    // Create a cubemap for environment reflections
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    scene.environment = cubeRenderTarget.texture;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better quality shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // More cinematic color rendering
    renderer.toneMappingExposure = 1.2; // Slightly brighter exposure
    renderer.outputEncoding = THREE.sRGBEncoding; // Better color space
    document.body.appendChild(renderer.domElement);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x606080, 0.4); // Reduced intensity for more contrast
    scene.add(ambientLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0x80a0ff, 0x4060a0, 0.6); // Sky/ground light
    scene.add(hemisphereLight);
    
    // Main directional light with enhanced shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 25, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0005; // Reduce shadow acne
    scene.add(directionalLight);
    
    // Secondary fill light from opposite direction
    const secondaryLight = new THREE.DirectionalLight(0xa0c0ff, 0.6); // Slightly blue for contrast
    secondaryLight.position.set(-15, 10, -7.5);
    scene.add(secondaryLight);
    
    // Add spotlights at key locations for dramatic lighting
    const spotLight1 = new THREE.SpotLight(0x00ffff, 2.0, 100, Math.PI/4, 0.5, 1);
    spotLight1.position.set(50, 30, 0);
    spotLight1.castShadow = true;
    scene.add(spotLight1);
    
    const spotLight2 = new THREE.SpotLight(0xff00ff, 2.0, 100, Math.PI/4, 0.5, 1);
    spotLight2.position.set(-50, 30, 0);
    spotLight2.castShadow = true;
    scene.add(spotLight2);
    
    const spotLight3 = new THREE.SpotLight(0xffff00, 2.0, 100, Math.PI/4, 0.5, 1);
    spotLight3.position.set(0, 30, 50);
    spotLight3.castShadow = true;
    scene.add(spotLight3);

    // Add light beams for futuristic effect
    addLightBeams();
    
    // Update the environment map periodically
    function updateEnvironmentMap() {
        if (playerMesh) playerMesh.visible = false;
        cubeCamera.position.copy(camera.position);
        cubeCamera.update(renderer, scene);
        if (playerMesh) playerMesh.visible = true;
    }
    
    // Update environment map every few seconds
    setInterval(updateEnvironmentMap, 5000);
    
    // First environment map update
    setTimeout(updateEnvironmentMap, 1000);
    
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 10;

    // Increase solver tolerance for better collision response
    world.solver.tolerance = 0.0001; // Tighter tolerance to prevent sinking
    
    // Enable continuous collision detection for fast-moving objects
    world.defaultContactMaterial.contactEquationStiffness = 1e9; // Increased stiffness
    world.defaultContactMaterial.contactEquationRelaxation = 2; // Reduced relaxation

    createCyberpunkSkyline();
    
    // Create player first to get the world material
    const worldMaterial = createPlayer();
    
    // Store the world material as a global
    window.worldMaterial = worldMaterial;
    
    createRooftop();
    createObstacles();
    createBiomes();

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 1] = Math.random() * 0.5;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.visible = false;
    scene.add(particleSystem);

    // Initialize jump trail particle system
    initJumpTrailParticles();

    createHackingNode();
    createDrones();

    // Clear any existing key states to avoid issues
    keys = {};

    // Remove old event listeners and simplify to use only one set
    window.addEventListener('resize', onWindowResize);

    // Clean event listeners setup
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', onMouseClick);

    // Set the controls text
    const controlsElement = document.getElementById('controls');
    if (controlsElement) {
        controlsElement.textContent = 'WASD: Move | SPACE: Jump | SHIFT: Sprint | Q/E: Rotate Camera';
    }

    // Initialize frame counter
    frameCount = 0;

    // Start the animation loop if it's not already running
    if (!gameStarted) {
        animate();
    }
}

// Add vertical light beams for visual flair
function addLightBeams() {
    const beamPositions = [
        [50, 0, 0],
        [-50, 0, 0],
        [0, 0, 50],
        [0, 0, -50],
        [50, 0, 50],
        [-50, 0, 50],
        [50, 0, -50],
        [-50, 0, -50]
    ];
    
    beamPositions.forEach(position => {
        // Random beam color
        const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88, 0xff0088];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Create beam cylinder
        const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 100, 8, 1, true);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(position[0], position[1] + 50, position[2]);
        beam.rotation.x = Math.PI / 2;
        scene.add(beam);
        
        // Add inner beam for more intensity
        const innerBeamGeometry = new THREE.CylinderGeometry(0.2, 0.2, 100, 8, 1, true);
        const innerBeamMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        const innerBeam = new THREE.Mesh(innerBeamGeometry, innerBeamMaterial);
        innerBeam.position.set(position[0], position[1] + 50, position[2]);
        innerBeam.rotation.x = Math.PI / 2;
        scene.add(innerBeam);
    });
}

// Unified key handlers to avoid duplication
function handleKeyDown(e) {
    console.log("Key down:", e.code);
    keys[e.code] = true;
    if (isHackingMiniGame) {
        playerSequence.push(e.code);
        checkHackingSequence();
    }
}

function handleKeyUp(e) {
    console.log("Key up:", e.code);
    keys[e.code] = false;
}

function onMouseClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(hackingNode);
    if (intersects.length > 0 && playerMesh.position.distanceTo(hackingNode.position) < 3) {
        toggleHacking();
    }
}

function toggleHacking() {
    if (isHacking) return;

    isHacking = true;
    isHackingMiniGame = true;
    const infoElement = document.getElementById('info');

    const possibleKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    hackingSequence = [];
    for (let i = 0; i < 4; i++) {
        hackingSequence.push(possibleKeys[Math.floor(Math.random() * possibleKeys.length)]);
    }

    const sequenceText = hackingSequence.map(key => key.replace('Key', '')).join(' ');
    infoElement.textContent = `HACK: Press ${sequenceText}`;
    infoElement.style.opacity = 1;

    playerSequence = [];
}

function checkHackingSequence() {
    const infoElement = document.getElementById('info');

    for (let i = 0; i < playerSequence.length; i++) {
        if (playerSequence[i] !== hackingSequence[i]) {
            infoElement.textContent = "HACK FAILED";
            hackingNode.material.color.set(0xff0000);
            setTimeout(() => {
                infoElement.style.opacity = 0;
                hackingNode.material.color.set(0x00ff88);
                isHacking = false;
                isHackingMiniGame = false;
            }, 2000);
            return;
        }
    }

    if (playerSequence.length === hackingSequence.length) {
        infoElement.textContent = "HACK SUCCESSFUL";
        hackingNode.material.color.set(0x88ff00);
        score += 50;
        document.getElementById('score').textContent = `Score: ${score}`;
        setTimeout(() => {
            infoElement.style.opacity = 0;
            hackingNode.material.color.set(0x00ff88);
            isHacking = false;
            isHackingMiniGame = false;
        }, 2000);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add frame counter variable
let frameCount = 0;

// Create biomes for different areas of the level
function createBiomes() {
    // Create the main cyberpunk zone at the center (already exists)
    // Add other biome districts in different quadrants
    createNeonGardenBiome();
    createIndustrialBiome();
    createDigitalVoidBiome();
    
    // Create transitional platforms between biomes
    createBiomeTransitions();
}

function createNeonGardenBiome() {
    // Position the Neon Garden in the positive X, positive Z quadrant
    const biomeCenter = [200, 5, 200];
    const biomeRadius = 150;
    
    // Create a circular platform as the base for this biome
    const baseGeometry = new THREE.CylinderGeometry(biomeRadius, biomeRadius, 2, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x224422,
        roughness: 0.7,
        metalness: 0.2,
        emissive: 0x003300,
        emissiveIntensity: 0.3
    });
    
    const basePlatform = new THREE.Mesh(baseGeometry, baseMaterial);
    basePlatform.position.set(biomeCenter[0], biomeCenter[1], biomeCenter[2]);
    basePlatform.receiveShadow = true;
    scene.add(basePlatform);
    
    // Add physical body for the base platform
    const baseShape = new CANNON.Cylinder(
        biomeRadius, biomeRadius, 2, 16
    );
    const baseBody = new CANNON.Body({
        mass: 0,
        material: worldMaterial
    });
    baseBody.addShape(baseShape);
    baseBody.position.set(biomeCenter[0], biomeCenter[1], biomeCenter[2]);
    world.addBody(baseBody);
    
    // Create neon "plants" and structures
    for (let i = 0; i < 50; i++) {
        // Random position within the biome circle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (biomeRadius - 10);
        const x = biomeCenter[0] + Math.cos(angle) * radius;
        const z = biomeCenter[2] + Math.sin(angle) * radius;
        
        // Create glowing plant-like structures
        const height = Math.random() * 15 + 5;
        const plantGeometry = new THREE.CylinderGeometry(0.2, 0.5, height, 8);
        const plantMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(
                Math.random() * 0.1,
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.3
            ),
            emissive: new THREE.Color(
                Math.random() * 0.1,
                Math.random() * 0.8 + 0.2,
                Math.random() * 0.3
            ),
            emissiveIntensity: 1.5,
            roughness: 0.3,
            metalness: 0.1
        });
        
        const plant = new THREE.Mesh(plantGeometry, plantMaterial);
        plant.position.set(x, biomeCenter[1] + height / 2, z);
        plant.castShadow = true;
        scene.add(plant);
        
        // Create glowing orbs at the top of some plants
        if (Math.random() > 0.5) {
            const orbGeometry = new THREE.SphereGeometry(Math.random() * 2 + 1, 16, 16);
            const orbMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(
                    Math.random() * 0.3,
                    Math.random() * 0.5 + 0.5,
                    Math.random() * 0.3
                ),
                emissive: new THREE.Color(
                    Math.random() * 0.3,
                    Math.random() * 0.7 + 0.3,
                    Math.random() * 0.3
                ),
                emissiveIntensity: 2,
                roughness: 0.1,
                metalness: 0.9
            });
            
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(x, biomeCenter[1] + height + orbGeometry.parameters.radius, z);
            scene.add(orb);
            
            // Add point light inside the orb
            const light = new THREE.PointLight(
                orbMaterial.emissive.getHex(),
                1,
                10
            );
            light.position.copy(orb.position);
            scene.add(light);
        }
    }
    
    // Create floating platforms with organic shapes
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (biomeRadius - 30) + 15;
        const x = biomeCenter[0] + Math.cos(angle) * radius;
        const z = biomeCenter[2] + Math.sin(angle) * radius;
        const y = biomeCenter[1] + Math.random() * 40 + 10;
        
        // Create platform with curved/organic shape
        const size = Math.random() * 10 + 5;
        const platformGeometry = new THREE.BoxGeometry(size, 1, size);
        
        // Apply noise to vertices for organic appearance
        const positionAttribute = platformGeometry.getAttribute('position');
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            
            // Only modify the x and z coordinates, not y (keeps it flat on top)
            if (Math.abs(vertex.y) < 0.4) {
                vertex.x += (Math.random() - 0.5) * 1.5;
                vertex.z += (Math.random() - 0.5) * 1.5;
            }
            
            positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        platformGeometry.computeVertexNormals();
        
        // Green glowing material
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.1, 0.6, 0.1),
            emissive: new THREE.Color(0.0, 0.2, 0.0),
            roughness: 0.7,
            metalness: 0.3
        });
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        
        // Add physics body - use box for collision
        const boxShape = new CANNON.Box(new CANNON.Vec3(size/2, 0.5, size/2));
        const boxBody = new CANNON.Body({
            mass: 0,
            material: worldMaterial
        });
        boxBody.addShape(boxShape);
        boxBody.position.set(x, y, z);
        world.addBody(boxBody);
        
        // Add the platform to obstacles array for scoring
        obstacles.push({
            mesh: platform,
            body: boxBody,
            id: 'neon_garden_platform_' + i,
            biome: BIOMES.NEON_GARDEN
        });
    }
}

function createIndustrialBiome() {
    // Position the Industrial Zone in the negative X, positive Z quadrant
    const biomeCenter = [-200, 0, 200];
    const biomeSize = 250;
    
    // Create a square base platform with industrial look
    const baseGeometry = new THREE.BoxGeometry(biomeSize, 5, biomeSize);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.9,
        metalness: 0.7,
        emissive: 0x220000,
        emissiveIntensity: 0.2
    });
    
    const basePlatform = new THREE.Mesh(baseGeometry, baseMaterial);
    basePlatform.position.set(biomeCenter[0], biomeCenter[1] - 2.5, biomeCenter[2]);
    basePlatform.receiveShadow = true;
    scene.add(basePlatform);
    
    // Add physical body for the base platform
    const baseShape = new CANNON.Box(new CANNON.Vec3(biomeSize/2, 2.5, biomeSize/2));
    const baseBody = new CANNON.Body({
        mass: 0,
        material: worldMaterial
    });
    baseBody.addShape(baseShape);
    baseBody.position.set(biomeCenter[0], biomeCenter[1] - 2.5, biomeCenter[2]);
    world.addBody(baseBody);
    
    // Add industrial features - smokestacks, pipes, etc.
    for (let i = 0; i < 20; i++) {
        // Random position within the biome square
        const x = biomeCenter[0] + (Math.random() - 0.5) * (biomeSize - 20);
        const z = biomeCenter[2] + (Math.random() - 0.5) * (biomeSize - 20);
        
        // Create factory tower/smokestack
        const height = Math.random() * 30 + 20;
        const width = Math.random() * 8 + 5;
        const factoryGeometry = new THREE.CylinderGeometry(width/2, width/2 + 2, height, 8);
        const factoryMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(
                Math.random() * 0.2 + 0.3,
                Math.random() * 0.2 + 0.1,
                Math.random() * 0.2 + 0.1
            ),
            roughness: 0.8,
            metalness: 0.6
        });
        
        const factory = new THREE.Mesh(factoryGeometry, factoryMaterial);
        factory.position.set(x, biomeCenter[1] + height/2, z);
        factory.castShadow = true;
        scene.add(factory);
        
        // Add physical body for collision
        const factoryShape = new CANNON.Cylinder(width/2, width/2 + 2, height, 8);
        const factoryBody = new CANNON.Body({
            mass: 0,
            material: worldMaterial
        });
        factoryBody.addShape(factoryShape);
        factoryBody.position.set(x, biomeCenter[1] + height/2, z);
        world.addBody(factoryBody);
        
        // Add red warning lights on top of some towers
        if (Math.random() > 0.5) {
            const lightGeometry = new THREE.SphereGeometry(1, 16, 16);
            const lightMaterial = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 2,
                roughness: 0.3,
                metalness: 0.8
            });
            
            const warningLight = new THREE.Mesh(lightGeometry, lightMaterial);
            warningLight.position.set(x, biomeCenter[1] + height + 1, z);
            scene.add(warningLight);
            
            // Add point light
            const light = new THREE.PointLight(0xff0000, 1, 20);
            light.position.copy(warningLight.position);
            scene.add(light);
        }
    }
    
    // Create industrial platforms, pipes and walkways
    const pipePositions = [];
    for (let i = 0; i < 30; i++) {
        // Random position for platform
        const x = biomeCenter[0] + (Math.random() - 0.5) * (biomeSize - 30);
        const z = biomeCenter[2] + (Math.random() - 0.5) * (biomeSize - 30);
        const y = biomeCenter[1] + Math.random() * 40 + 10;
        
        // Create industrial platform
        const sizeX = Math.random() * 10 + 5;
        const sizeZ = Math.random() * 10 + 5;
        const platformGeometry = new THREE.BoxGeometry(sizeX, 1, sizeZ);
        
        // Rusty metal material
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(
                Math.random() * 0.2 + 0.4,
                Math.random() * 0.1 + 0.2,
                Math.random() * 0.1 + 0.1
            ),
            roughness: 0.9,
            metalness: 0.7
        });
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        
        // Add grate texture (simple wireframe on top)
        const grateGeometry = new THREE.BoxGeometry(sizeX - 0.5, 0.1, sizeZ - 0.5);
        const grateMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x333333, 
            wireframe: true 
        });
        const grate = new THREE.Mesh(grateGeometry, grateMaterial);
        grate.position.set(0, 0.55, 0);
        platform.add(grate);
        
        // Add physics body
        const boxShape = new CANNON.Box(new CANNON.Vec3(sizeX/2, 0.5, sizeZ/2));
        const boxBody = new CANNON.Body({
            mass: 0,
            material: worldMaterial
        });
        boxBody.addShape(boxShape);
        boxBody.position.set(x, y, z);
        world.addBody(boxBody);
        
        // Store platform for connecting pipes
        pipePositions.push({x, y, z});
        
        // Add to obstacles array
        obstacles.push({
            mesh: platform,
            body: boxBody,
            id: 'industrial_platform_' + i,
            biome: BIOMES.INDUSTRIAL
        });
    }
    
    // Create connecting pipes between platforms
    for (let i = 0; i < pipePositions.length - 1; i++) {
        if (Math.random() > 0.5) continue; // Only connect some platforms
        
        const start = pipePositions[i];
        const end = pipePositions[i + 1];
        
        // Calculate distance and direction
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const deltaZ = end.z - start.z;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
        
        // Create pipe geometry
        const pipeGeometry = new THREE.CylinderGeometry(0.8, 0.8, distance, 8);
        const pipeMaterial = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.7,
            metalness: 0.9
        });
        
        // Position and orient the pipe to connect the platforms
        const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
        pipe.position.set(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2,
            (start.z + end.z) / 2
        );
        
        // Orient the pipe
        pipe.lookAt(end.x, end.y, end.z);
        pipe.rotateX(Math.PI / 2);
        pipe.castShadow = true;
        
        scene.add(pipe);
    }
}

function createDigitalVoidBiome() {
    // Position the Digital Void in the negative X, negative Z quadrant
    const biomeCenter = [-200, -10, -200];
    const biomeSize = 200;
    
    // Create a translucent "void" platform
    const baseGeometry = new THREE.BoxGeometry(biomeSize, 1, biomeSize);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x000066,
        roughness: 0.1,
        metalness: 1.0,
        transparent: true,
        opacity: 0.7,
        emissive: 0x000044,
        emissiveIntensity: 1.0
    });
    
    const basePlatform = new THREE.Mesh(baseGeometry, baseMaterial);
    basePlatform.position.set(biomeCenter[0], biomeCenter[1], biomeCenter[2]);
    basePlatform.receiveShadow = true;
    scene.add(basePlatform);
    
    // Add physical body for the base platform
    const baseShape = new CANNON.Box(new CANNON.Vec3(biomeSize/2, 0.5, biomeSize/2));
    const baseBody = new CANNON.Body({
        mass: 0,
        material: worldMaterial
    });
    baseBody.addShape(baseShape);
    baseBody.position.set(biomeCenter[0], biomeCenter[1], biomeCenter[2]);
    world.addBody(baseBody);
    
    // Create a grid of digital-looking floating cubes/platforms
    for (let i = 0; i < 80; i++) {
        // Calculate grid-aligned positions with some randomness
        const gridX = Math.floor(Math.random() * 10) - 5;
        const gridZ = Math.floor(Math.random() * 10) - 5;
        const x = biomeCenter[0] + gridX * 20 + (Math.random() - 0.5) * 5;
        const z = biomeCenter[2] + gridZ * 20 + (Math.random() - 0.5) * 5;
        
        // Varied heights but maintain grid-like pattern
        const height = Math.sin(gridX * 0.5) * Math.cos(gridZ * 0.5) * 20 + 30;
        const y = biomeCenter[1] + height;
        
        // Create platform
        const size = Math.random() * 3 + 2;
        const platformGeometry = new THREE.BoxGeometry(size, size, size);
        
        // Digital glowing material
        const hue = Math.random() * 0.3 + 0.6; // Blue to purple range
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        const emissive = new THREE.Color().setHSL(hue, 1, 0.3);
        
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 1.0,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.8
        });
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        
        // Add subtle rotation animation
        platform.userData.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.01
        };
        
        scene.add(platform);
        
        // Add physics body - slightly smaller than visual for better gameplay
        const boxShape = new CANNON.Box(new CANNON.Vec3(size/2 - 0.1, size/2 - 0.1, size/2 - 0.1));
        const boxBody = new CANNON.Body({
            mass: 0,
            material: worldMaterial
        });
        boxBody.addShape(boxShape);
        boxBody.position.set(x, y, z);
        world.addBody(boxBody);
        
        // Add to obstacles array with reference for animation
        obstacles.push({
            mesh: platform,
            body: boxBody,
            id: 'digital_platform_' + i,
            biome: BIOMES.DIGITAL_VOID,
            animate: true
        });
    }
    
    // Add data stream visual effects
    for (let i = 0; i < 20; i++) {
        const x = biomeCenter[0] + (Math.random() - 0.5) * biomeSize;
        const z = biomeCenter[2] + (Math.random() - 0.5) * biomeSize;
        
        // Create vertical "data stream" beam
        const height = Math.random() * 100 + 50;
        const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, height, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(x, biomeCenter[1] + height/2, z);
        scene.add(beam);
        
        // Add animated particles flowing up the beam
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let j = 0; j < particleCount; j++) {
            const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Set initial position along the beam
            particle.position.y = Math.random() * height - height/2;
            
            // Small random offset from center of beam
            particle.position.x = (Math.random() - 0.5) * 0.5;
            particle.position.z = (Math.random() - 0.5) * 0.5;
            
            // Store animation data
            particle.userData.speed = Math.random() * 0.2 + 0.1;
            particle.userData.maxHeight = height/2;
            particle.userData.minHeight = -height/2;
            
            particles.add(particle);
        }
        
        beam.add(particles);
        
        // Track beam for animation
        beam.userData.particles = particles;
        beam.userData.animate = true;
        
        // Add to scene objects that need animation
        if (!scene.userData.animatedObjects) {
            scene.userData.animatedObjects = [];
        }
        scene.userData.animatedObjects.push(beam);
    }
}

function createBiomeTransitions() {
    // Create transitional bridges/paths between biomes
    
    // Bridge from center to Neon Garden
    createSuspendedBridge([100, 30, 100], [150, 5, 150], 10, 0x00ff88);
    
    // Bridge from center to Industrial
    createSuspendedBridge([-100, 30, 100], [-150, 0, 150], 10, 0xff4400);
    
    // Bridge from center to Digital Void
    createSuspendedBridge([-100, 30, -100], [-150, -10, -150], 10, 0x0088ff);
}

// Add biome detection to update the UI when player enters a new biome
function updateCurrentBiome() {
    // Get player position
    const playerPos = playerBody.position;
    
    // Check which biome the player is in based on position
    if (playerPos.x > 150 && playerPos.z > 150) {
        // Neon Garden zone
        if (currentBiome !== BIOMES.NEON_GARDEN) {
            currentBiome = BIOMES.NEON_GARDEN;
            displayBiomeTransition("NEON GARDEN");
        }
    } else if (playerPos.x < -150 && playerPos.z > 150) {
        // Industrial zone
        if (currentBiome !== BIOMES.INDUSTRIAL) {
            currentBiome = BIOMES.INDUSTRIAL;
            displayBiomeTransition("INDUSTRIAL ZONE");
        }
    } else if (playerPos.x < -150 && playerPos.z < -150) {
        // Digital Void zone
        if (currentBiome !== BIOMES.DIGITAL_VOID) {
            currentBiome = BIOMES.DIGITAL_VOID;
            displayBiomeTransition("DIGITAL VOID");
        }
    } else {
        // Central Cyberpunk zone
        if (currentBiome !== BIOMES.CYBERPUNK) {
            currentBiome = BIOMES.CYBERPUNK;
            displayBiomeTransition("CENTRAL DISTRICT");
        }
    }
}

function displayBiomeTransition(biomeName) {
    // Create visual notification when entering a new biome
    const infoElement = document.getElementById('info');
    infoElement.textContent = biomeName;
    infoElement.style.opacity = 1;
    
    // Fade out after a few seconds
    setTimeout(() => {
        infoElement.style.opacity = 0;
    }, 3000);
}

// Add function to initialize jump trail particles
function initJumpTrailParticles() {
    const jumpParticleCount = 30;
    const jumpParticleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(jumpParticleCount * 3);
    const velocities = new Float32Array(jumpParticleCount * 3);
    const lifeTimes = new Float32Array(jumpParticleCount);
    
    for (let i = 0; i < jumpParticleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
        lifeTimes[i] = 0;
    }
    
    jumpParticleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    jumpParticleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    jumpParticleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifeTimes, 1));
    
    const jumpParticleMaterial = new THREE.PointsMaterial({
        color: 0x33ccff,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    jumpTrailParticles = new THREE.Points(jumpParticleGeometry, jumpParticleMaterial);
    jumpTrailParticles.frustumCulled = false;
    scene.add(jumpTrailParticles);
}

// Add function to create jump trail effect
function createJumpTrailEffect() {
    if (!jumpTrailParticles) return;
    
    const positions = jumpTrailParticles.geometry.attributes.position.array;
    const velocities = jumpTrailParticles.geometry.attributes.velocity.array;
    const lifeTimes = jumpTrailParticles.geometry.attributes.lifetime.array;
    
    for (let i = 0; i < lifeTimes.length; i++) {
        // Only reset particles that are not active (lifetime <= 0)
        if (lifeTimes[i] <= 0) {
            const particleIndex = i * 3;
            
            // Position slightly below player's feet
            positions[particleIndex] = playerMesh.position.x + (Math.random() - 0.5) * 0.3;
            positions[particleIndex + 1] = playerMesh.position.y - PLAYER_HEIGHT / 2;
            positions[particleIndex + 2] = playerMesh.position.z + (Math.random() - 0.5) * 0.3;
            
            // Random slight velocity in all directions, but mostly down
            velocities[particleIndex] = (Math.random() - 0.5) * 0.04;
            velocities[particleIndex + 1] = -0.02 - Math.random() * 0.03;
            velocities[particleIndex + 2] = (Math.random() - 0.5) * 0.04;
            
            // Set lifetime (will decrease each frame)
            lifeTimes[i] = 1.0;
        }
    }
    
    jumpTrailParticles.geometry.attributes.position.needsUpdate = true;
    jumpTrailParticles.geometry.attributes.velocity.needsUpdate = true;
    jumpTrailParticles.geometry.attributes.lifetime.needsUpdate = true;
}

// Add function to update jump trail particles
function updateJumpTrailParticles() {
    if (!jumpTrailParticles) return;
    
    const positions = jumpTrailParticles.geometry.attributes.position.array;
    const velocities = jumpTrailParticles.geometry.attributes.velocity.array;
    const lifeTimes = jumpTrailParticles.geometry.attributes.lifetime.array;
    
    for (let i = 0; i < lifeTimes.length; i++) {
        if (lifeTimes[i] > 0) {
            const particleIndex = i * 3;
            
            // Update position based on velocity
            positions[particleIndex] += velocities[particleIndex] * TIME_STEP;
            positions[particleIndex + 1] += velocities[particleIndex + 1] * TIME_STEP;
            positions[particleIndex + 2] += velocities[particleIndex + 2] * TIME_STEP;
            
            // Decrease lifetime
            lifeTimes[i] -= 0.05;
            
            // Update opacity based on lifetime
            if (lifeTimes[i] <= 0) {
                lifeTimes[i] = 0;
            } else {
                // Update material opacity for all particles (limitation of THREE.Points)
                jumpTrailParticles.material.opacity = Math.max(0.1, Math.min(0.8, lifeTimes[0] * 0.8));
            }
        }
    }
    
    jumpTrailParticles.geometry.attributes.position.needsUpdate = true;
    jumpTrailParticles.geometry.attributes.lifetime.needsUpdate = true;
}