# 🏃‍♂️ Cyber Parkour

**Hack the skyline. Rewrite your reality. Escape the net.**

> *A 3D cyberpunk parkour game built with Three.js and real-time physics.*

## What It Does

Cyber Parkour is a browser-based 3D platformer set in a neon-lit cyberpunk world. Run, jump, and combo your way across procedurally placed platforms with real-time physics. Features dynamic music that intensifies with your combo multiplier, particle trails on jumps, ripple effects on landings, and a competition badge system.

## ✨ Features

- 🌆 3D cyberpunk environment rendered with Three.js
- 🎮 Physics-based movement powered by cannon-es
- 🎵 Dynamic music that responds to combo intensity
- ✨ Jump particle trails and landing ripple effects
- 📏 Total horizontal distance tracking
- 🏅 Competition badge system
- 🎯 Course structure with freestyle sections
- 🔗 Social media integration
- 📱 Browser-based — no install required

## 🛠️ Tech Stack

- **Three.js** — 3D rendering with GLTF model support
- **cannon-es** — Real-time physics engine
- **JavaScript** — Game logic (126KB)
- **Vite** — Development server and bundling
- **HTML/CSS** — UI and styling

## 🚀 Getting Started

```bash
git clone https://github.com/THETECHFAI/parkour.git
cd parkour
npm install
npx vite
```

Open the local URL shown in your terminal to play.

## 🎮 Controls

- **Arrow Keys / WASD** — Move
- **Space** — Jump
- **Chain jumps** — Build combos for bonus points and dynamic music

## 📁 Project Structure

```
parkour/
├── index.html       # Entry point and UI
├── src/
│   └── main.js      # All game logic (scene, physics, controls, audio, scoring)
├── package.json     # Dependencies
└── node_modules/    # Three.js, cannon-es, Vite
```

## 📄 License

MIT
