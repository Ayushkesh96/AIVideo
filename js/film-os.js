/**
 * AIVIDEO FILMMAKING PRODUCTION OS — REACTIVE GLOBAL STATE STORE
 * Manages complete project hierarchy, elements, scenes, shots, timeline,
 * reel history, settings, and localStorage persistence under key `filmOS_project`.
 */

(function () {
  const STORAGE_KEY = 'filmOS_project';

  const initialProjectData = {
    id: "proj-tokyo-protocol",
    name: "Midnight Runner: Tokyo Protocol",
    logline: "A rogue courier sprints through rain-soaked Neo-Tokyo to deliver an encrypted neural drive before dawn.",
    synopsis: "In the shadow of monolithic megacorporations, courier Alex Vance navigates glowing neon alleys and high-speed hovercraft patrols to transmit the last uncensored artificial intelligence archive.",
    aspectRatio: "16:9",
    resolution: "1080p",
    fps: 24,
    activeModel: "Seedance 2.5 (1080p)",
    activeSceneId: "scene-01",
    activeShotId: "shot-01a",

    // API Configuration
    apiConfig: {
      llmEndpoint: "",
      llmKey: "",
      videoGenEndpoint: "",
      videoGenKey: "",
      isSimulatedMode: true
    },

    // Reusable Elements Library (@Mentionable)
    elements: {
      characters: [
        {
          id: "char-alex",
          tag: "Alex",
          name: "Alex Vance",
          age: 28,
          gender: "Male",
          appearance: "Athletic runner, sharp jawline, textured raven hair, cybernetic optic scanner over left temple",
          clothing: "Obsidian technical windbreaker, charcoal compression pants, crimson accented running sneakers",
          avatarColor: "#00f0ff"
        },
        {
          id: "char-sarah",
          tag: "Sarah",
          name: "Sarah Chen",
          age: 31,
          gender: "Female",
          appearance: "Refined posture, emerald green eyes, shoulder-length bob with subtle cyber-braids",
          clothing: "High-collar mustard tailored blazer, dark tailored trousers, emerald hoop earrings",
          avatarColor: "#ccff00"
        }
      ],
      locations: [
        {
          id: "loc-tokyo-rain",
          tag: "TokyoRain",
          name: "Neo-Tokyo Rain Alley",
          time: "Night",
          weather: "Heavy Rain & Volumetric Mist",
          description: "Towering skyscraper canyon, glowing kanji holograms, reflective wet obsidian asphalt",
          colorKey: "#ff0055"
        },
        {
          id: "loc-skyline-cafe",
          tag: "RooftopCafe",
          name: "Skyline Lounge Cafe",
          time: "Twilight / Dusk",
          weather: "Golden Hour Sunset",
          description: "Minimalist floor-to-ceiling glass lounge overlooking the sprawling futuristic metropolis",
          colorKey: "#ffaa00"
        }
      ],
      props: [
        {
          id: "prop-drive",
          tag: "NeuralDrive",
          name: "Quantum Neural Drive",
          description: "Compact obsidian glass cartridge pulsing with internal crimson fiber-optic data light"
        },
        {
          id: "prop-katana",
          tag: "Katana",
          name: "Thermal Katana",
          description: "Cybernetic high-frequency combat blade with glowing red thermal edge"
        }
      ],
      styles: [
        {
          id: "style-35mm",
          tag: "Cinematic35mm",
          name: "Kodak 35mm Neo-Noir",
          description: "Anamorphic horizontal blue flare, rich shadow contrast, organic 35mm film grain"
        }
      ]
    },

    // Scenes & Shot List Hierarchy
    scenes: [
      {
        id: "scene-01",
        number: 1,
        title: "The Midnight Sprint",
        setting: "EXT. NEO-TOKYO STREETS - NIGHT",
        summary: "Alex navigates the neon rain alleyways at maximum sprint speed.",
        shots: [
          {
            id: "shot-01a",
            code: "01A",
            title: "Wide Establishing Sprint",
            prompt: "Wide establishing cinematic tracking shot of @Alex sprinting through @TokyoRain holding @NeuralDrive in @Cinematic35mm",
            model: "Seedance 2.5 (1080p)",
            camera: "Tracking Forward",
            lens: "24mm",
            rig: "Dolly",
            motionSpeed: 75,
            aspectRatio: "16:9",
            fx: {
              lut: "cyber",
              flare: 80,
              grain: 35,
              fog: 50,
              speed: 1.0
            },
            keyframeApproved: true,
            status: "ready",
            referenceImage: null,
            videoUrl: null,
            duration: 4
          },
          {
            id: "shot-01b",
            code: "01B",
            title: "Medium Hero Orbit",
            prompt: "Cinematic medium close-up shot of @Alex checking pulse while running through @TokyoRain under crimson neon rain, 8k",
            model: "Seedance 2.5 (1080p)",
            camera: "Orbit 360°",
            lens: "50mm",
            rig: "Orbit 360°",
            motionSpeed: 80,
            aspectRatio: "16:9",
            fx: {
              lut: "cyber",
              flare: 85,
              grain: 30,
              fog: 45,
              speed: 1.0
            },
            keyframeApproved: true,
            status: "ready",
            referenceImage: null,
            videoUrl: null,
            duration: 5
          },
          {
            id: "shot-01c",
            code: "01C",
            title: "Extreme Close-Up Eyes",
            prompt: "Macro close-up on @Alex cybernetic optic eye scanner analyzing street route in @TokyoRain",
            model: "Seedance 2.5 (1080p)",
            camera: "Zoom In",
            lens: "85mm",
            rig: "Handheld",
            motionSpeed: 60,
            aspectRatio: "16:9",
            fx: {
              lut: "cyber",
              flare: 70,
              grain: 40,
              fog: 50,
              speed: 1.0
            },
            keyframeApproved: false,
            status: "draft",
            referenceImage: null,
            videoUrl: null,
            duration: 4
          }
        ]
      },
      {
        id: "scene-02",
        number: 2,
        title: "The Operator Contact",
        setting: "INT. SKYLINE CAFE - TWILIGHT",
        summary: "Sarah watches the city grid from the rooftop lounge cafe.",
        shots: [
          {
            id: "shot-02a",
            code: "02A",
            title: "Sarah Overlook Medium",
            prompt: "Medium portrait shot of @Sarah in mustard blazer looking at city grid from @RooftopCafe in @Cinematic35mm",
            model: "Seedance 2.5 (1080p)",
            camera: "Dolly Push",
            lens: "50mm",
            rig: "Dolly",
            motionSpeed: 70,
            aspectRatio: "16:9",
            fx: {
              lut: "solar",
              flare: 60,
              grain: 25,
              fog: 30,
              speed: 1.0
            },
            keyframeApproved: true,
            status: "ready",
            referenceImage: null,
            videoUrl: null,
            duration: 5
          }
        ]
      }
    ],

    // Recent Generation Reel (Keep last 12)
    generationReel: [
      {
        id: "gen-1",
        title: "Clip #1: Neon Runner",
        prompt: "Wide establishing tracking shot of @Alex sprinting through @TokyoRain holding @NeuralDrive",
        model: "Seedance 2.5 (1080p)",
        camera: "Tracking Forward",
        timestamp: Date.now() - 60000,
        url: null
      },
      {
        id: "gen-2",
        title: "Clip #2: Sarah Cafe",
        prompt: "Medium portrait shot of @Sarah in mustard blazer looking at city grid from @RooftopCafe",
        model: "Seedance 2.5 (1080p)",
        camera: "Dolly Push",
        timestamp: Date.now() - 120000,
        url: null
      }
    ],

    // Multi-Track NLE Timeline Data
    timeline: {
      playhead: 0,
      zoom: 1.0,
      muxAudio: true,
      tracks: {
        video: [
          { id: "clip-v1", shotId: "shot-01a", start: 0, duration: 4, label: "Shot 01A (Wide Sprint)" },
          { id: "clip-v2", shotId: "shot-01b", start: 4, duration: 5, label: "Shot 01B (Medium Orbit)" },
          { id: "clip-v3", shotId: "shot-02a", start: 9, duration: 5, label: "Shot 02A (Sarah Cafe)" }
        ],
        voice: [
          { id: "clip-vo1", start: 0.5, duration: 3.5, text: "Vance, you have two minutes before sector lockdown.", speaker: "Sarah" },
          { id: "clip-vo2", start: 5.0, duration: 3.0, text: "I'm already on the lower boulevard.", speaker: "Alex" }
        ],
        music: [
          { id: "clip-m1", start: 0, duration: 14, title: "Synthwave Pulse OST", genre: "Cyberpunk Cinematic" }
        ]
      }
    }
  };

  class FilmOSProjectStore {
    constructor() {
      this.state = this.load();
      this.listeners = [];

      // Auto-save every 10s
      setInterval(() => {
        this.save();
      }, 10000);
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Object.assign({}, initialProjectData, parsed);
        }
      } catch (e) {
        console.warn("Could not load stored FilmOS project:", e);
      }
      return JSON.parse(JSON.stringify(initialProjectData));
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        this.notify();
      } catch (e) {
        console.error("Error saving FilmOS project:", e);
      }
    }

    subscribe(fn) {
      this.listeners.push(fn);
      return () => {
        this.listeners = this.listeners.filter(l => l !== fn);
      };
    }

    notify() {
      this.listeners.forEach(fn => fn(this.state));
    }

    // Get Active Shot Object
    getActiveShot() {
      for (const scene of this.state.scenes) {
        const shot = scene.shots.find(s => s.id === this.state.activeShotId);
        if (shot) return shot;
      }
      // Fallback first shot
      if (this.state.scenes[0] && this.state.scenes[0].shots[0]) {
        this.state.activeShotId = this.state.scenes[0].shots[0].id;
        return this.state.scenes[0].shots[0];
      }
      return null;
    }

    // Set Active Shot
    setActiveShot(shotId) {
      this.state.activeShotId = shotId;
      this.save();
    }

    // Update Shot Properties
    updateActiveShot(updates) {
      const shot = this.getActiveShot();
      if (shot) {
        Object.assign(shot, updates);
        this.save();
      }
    }

    // Resolve @Mentions
    resolveMentions(text) {
      if (!text) return "";
      let resolved = text;
      this.state.elements.characters.forEach(c => {
        const reg = new RegExp(`@${c.tag}\\b`, 'gi');
        resolved = resolved.replace(reg, `${c.name} (${c.appearance}, wearing ${c.clothing})`);
      });
      this.state.elements.locations.forEach(l => {
        const reg = new RegExp(`@${l.tag}\\b`, 'gi');
        resolved = resolved.replace(reg, `${l.name} (${l.time}, ${l.weather}, ${l.description})`);
      });
      this.state.elements.props.forEach(p => {
        const reg = new RegExp(`@${p.tag}\\b`, 'gi');
        resolved = resolved.replace(reg, `${p.name} (${p.description})`);
      });
      this.state.elements.styles.forEach(s => {
        const reg = new RegExp(`@${s.tag}\\b`, 'gi');
        resolved = resolved.replace(reg, `${s.name} (${s.description})`);
      });
      return resolved;
    }

    // Add Generation to Reel
    addReelItem(item) {
      this.state.generationReel.unshift(item);
      if (this.state.generationReel.length > 12) {
        this.state.generationReel.pop();
      }
      // Update shot status to READY
      const shot = this.getActiveShot();
      if (shot) {
        shot.status = 'ready';
        shot.keyframeApproved = true;
      }
      this.save();
    }

    // Add Character
    addCharacter(charData) {
      const newChar = Object.assign({
        id: `char-${Date.now()}`,
        tag: `Char${this.state.elements.characters.length + 1}`,
        name: "New Character",
        age: 25,
        gender: "Any",
        appearance: "",
        clothing: "",
        avatarColor: "#ccff00"
      }, charData);
      this.state.elements.characters.push(newChar);
      this.save();
      return newChar;
    }

    // Add Location
    addLocation(locData) {
      const newLoc = Object.assign({
        id: `loc-${Date.now()}`,
        tag: `Loc${this.state.elements.locations.length + 1}`,
        name: "New Location",
        time: "Night",
        weather: "Clear",
        description: "",
        colorKey: "#00f0ff"
      }, locData);
      this.state.elements.locations.push(newLoc);
      this.save();
      return newLoc;
    }

    // Add Prop
    addProp(propData) {
      const newProp = Object.assign({
        id: `prop-${Date.now()}`,
        tag: `Prop${this.state.elements.props.length + 1}`,
        name: "New Prop",
        description: ""
      }, propData);
      this.state.elements.props.push(newProp);
      this.save();
      return newProp;
    }

    // Add Scene & Shots
    createScene(title, setting = "EXT. CITY - NIGHT") {
      const newScene = {
        id: `scene-${Date.now()}`,
        number: this.state.scenes.length + 1,
        title: title || `Scene ${this.state.scenes.length + 1}`,
        setting: setting,
        summary: "",
        shots: [
          {
            id: `shot-${Date.now()}-1`,
            code: `${this.state.scenes.length + 1}A`,
            title: "Establishing Shot",
            prompt: `Cinematic establishing shot of ${title}`,
            model: this.state.activeModel,
            camera: "Orbit 360°",
            lens: "35mm",
            rig: "Orbit 360°",
            motionSpeed: 75,
            aspectRatio: this.state.aspectRatio,
            fx: { lut: "cyber", flare: 80, grain: 35, fog: 50, speed: 1.0 },
            keyframeApproved: false,
            status: "draft",
            referenceImage: null,
            videoUrl: null,
            duration: 4
          }
        ]
      };
      this.state.scenes.push(newScene);
      this.state.activeSceneId = newScene.id;
      this.state.activeShotId = newScene.shots[0].id;
      this.save();
      return newScene;
    }

    // Delete Clip from Timeline
    deleteTimelineClip(trackName, clipId) {
      if (this.state.timeline.tracks[trackName]) {
        this.state.timeline.tracks[trackName] = this.state.timeline.tracks[trackName].filter(c => c.id !== clipId);
        this.save();
      }
    }
  }

  window.FilmOS = new FilmOSProjectStore();
})();
