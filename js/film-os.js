/**
 * AIVIDEO FILMMAKING PRODUCTION OS — CORE STATE & STORAGE ENGINE
 * Manages Projects, Elements (@Characters, @Locations, @Props, @Styles),
 * AI Co-Director, Keyframe Workflow, and Multi-Track NLE Timelines.
 */

(function () {
  const STORAGE_KEY = 'aivideo_filmmaking_os_v1';

  const defaultProject = {
    id: "proj-neo-runner",
    name: "Midnight Runner: Tokyo Protocol",
    logline: "A rogue courier sprints through rain-soaked Neo-Tokyo to deliver an encrypted neural drive before dawn.",
    aspectRatio: "16:9",
    resolution: "1080p",
    fps: 24,
    activeMode: "pro", // 'beginner' | 'pro' | 'director' | 'elements' | 'timeline'
    
    // Elements Library (@Mentionable)
    elements: {
      characters: [
        {
          id: "char-alex",
          tag: "Alex",
          name: "Alex Vance",
          age: 28,
          gender: "Male",
          appearance: "Athletic build, sharp jawline, short textured dark hair, hazel eyes, cybernetic optic scanner over left temple",
          clothing: "Weathered obsidian technical windbreaker, charcoal compression pants, neon crimson accented running sneakers",
          personality: "Focused, resilient, breathless determination",
          avatarColor: "#00f0ff"
        },
        {
          id: "char-sarah",
          tag: "Sarah",
          name: "Sarah Chen",
          age: 31,
          gender: "Female",
          appearance: "Elegant features, emerald green eyes, shoulder-length raven hair with subtle cyber-braids",
          clothing: "High-collar mustard tailored blazer, tailored trousers, emerald hoop earrings",
          personality: "Calm, calculating, authoritative operator",
          avatarColor: "#ccff00"
        }
      ],
      locations: [
        {
          id: "loc-tokyo-night",
          tag: "TokyoRain",
          name: "Neo-Tokyo Rain Alley",
          time: "Night",
          weather: "Heavy Rain / Volumetric Mist",
          description: "Narrow alley framed by towering skyscrapers, flickering neon signs in kanji, reflective wet obsidian asphalt, steam vents",
          colorKey: "#ff0055"
        },
        {
          id: "loc-cafe-rooftop",
          tag: "RooftopCafe",
          name: "Skyline Lounge Cafe",
          time: "Twilight / Dusk",
          weather: "Golden Hour Glow",
          description: "Minimalist glass interior overlooking panoramic futuristic metropolis skyline",
          colorKey: "#ffaa00"
        }
      ],
      props: [
        {
          id: "prop-drive",
          tag: "NeuralDrive",
          name: "Quantum Neural Data Drive",
          description: "Compact obsidian glass cartridge pulsing with internal crimson fiber-optic data light"
        },
        {
          id: "prop-katana",
          tag: "Katana",
          name: "Thermal Katana",
          description: "High-frequency cybernetic blade with glowing red thermal edge"
        }
      ],
      styles: [
        {
          id: "style-kodak",
          tag: "Cinematic35mm",
          name: "Kodak 35mm Neo-Noir",
          description: "Anamorphic lens flares, rich shadows, 35mm organic film grain, warm skin tones with cool shadow contrasts"
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
            prompt: "Wide establishing tracking shot of @Alex sprinting through @TokyoRain holding @NeuralDrive in @Cinematic35mm",
            cameraBody: "ARRI Alexa Mini LF",
            lens: "24mm Ultra Wide",
            focalLength: "24mm",
            aperture: "f/2.8",
            motion: "Tracking Forward",
            speed: "Fast (1.5x)",
            duration: 4,
            keyframeApproved: true,
            status: "ready", // 'draft' | 'keyframe' | 'ready' | 'rendered'
            videoUrl: null
          },
          {
            id: "shot-01b",
            code: "01B",
            title: "Medium Hero Orbit",
            prompt: "Cinematic medium close-up shot of @Alex checking pulse while running through @TokyoRain under crimson neon rain, 8k",
            cameraBody: "RED V-Raptor 8K",
            lens: "50mm Prime",
            focalLength: "50mm",
            aperture: "f/1.8",
            motion: "Orbit 360°",
            speed: "Normal (1.0x)",
            duration: 5,
            keyframeApproved: true,
            status: "ready",
            videoUrl: null
          },
          {
            id: "shot-01c",
            code: "01C",
            title: "Extreme Close-Up Eyes",
            prompt: "Macro close-up on @Alex cybernetic optic eye scanner analyzing street route in @TokyoRain",
            cameraBody: "Sony Venice 2",
            lens: "85mm Telephoto Macro",
            focalLength: "85mm",
            aperture: "f/1.4",
            motion: "Push-In Slow",
            speed: "Slow-Mo (0.5x)",
            duration: 4,
            keyframeApproved: false,
            status: "draft",
            videoUrl: null
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
            cameraBody: "ARRI Alexa Mini LF",
            lens: "50mm Prime",
            focalLength: "50mm",
            aperture: "f/2.0",
            motion: "Dolly Push",
            speed: "Normal (1.0x)",
            duration: 5,
            keyframeApproved: true,
            status: "ready",
            videoUrl: null
          }
        ]
      }
    ],

    // Multi-Track NLE Timeline Data
    timeline: {
      activePlayhead: 0,
      zoomLevel: 1.0,
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
        ],
        captions: [
          { id: "clip-c1", start: 0.5, duration: 3.5, text: "[Sarah]: Vance, you have two minutes before sector lockdown." },
          { id: "clip-c2", start: 5.0, duration: 3.0, text: "[Alex]: I'm already on the lower boulevard." }
        ]
      }
    }
  };

  class FilmOSStore {
    constructor() {
      this.project = this.loadProject();
      this.listeners = [];
    }

    loadProject() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn("Error loading stored project:", e);
      }
      return JSON.parse(JSON.stringify(defaultProject));
    }

    saveProject() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.project));
        this.notify();
      } catch (e) {
        console.error("Error saving project:", e);
      }
    }

    subscribe(fn) {
      this.listeners.push(fn);
      return () => {
        this.listeners = this.listeners.filter(l => l !== fn);
      };
    }

    notify() {
      this.listeners.forEach(fn => fn(this.project));
    }

    // Resolves @Character, @Location, @Prop, @Style into full enriched prompt
    resolveMentions(promptText) {
      if (!promptText) return "";
      let resolved = promptText;

      // Characters
      this.project.elements.characters.forEach(c => {
        const reg = new RegExp(`@${c.tag}\\b`, 'gi');
        if (reg.test(resolved)) {
          resolved = resolved.replace(reg, `${c.name} (${c.appearance}, wearing ${c.clothing})`);
        }
      });

      // Locations
      this.project.elements.locations.forEach(l => {
        const reg = new RegExp(`@${l.tag}\\b`, 'gi');
        if (reg.test(resolved)) {
          resolved = resolved.replace(reg, `${l.name} (${l.time}, ${l.weather}, ${l.description})`);
        }
      });

      // Props
      this.project.elements.props.forEach(p => {
        const reg = new RegExp(`@${p.tag}\\b`, 'gi');
        if (reg.test(resolved)) {
          resolved = resolved.replace(reg, `${p.name} (${p.description})`);
        }
      });

      // Styles
      this.project.elements.styles.forEach(s => {
        const reg = new RegExp(`@${s.tag}\\b`, 'gi');
        if (reg.test(resolved)) {
          resolved = resolved.replace(reg, `${s.name} (${s.description})`);
        }
      });

      return resolved;
    }

    // AI Director: Script/Concept to Scene & Shot Breakdown
    generateShotsFromConcept(conceptText) {
      const p = conceptText.toLowerCase();
      let newSceneTitle = "Cinematic Sequence";
      let newSetting = "EXT. CINEMATIC ENVIRONMENT - NIGHT";

      if (p.includes("commercial") || p.includes("nike") || p.includes("runner")) {
        newSceneTitle = "Nike Style Night Runner";
        newSetting = "EXT. RAIN-SLICKED CITY - NIGHT";
      } else if (p.includes("space") || p.includes("mars")) {
        newSceneTitle = "Mars Orbital Descent";
        newSetting = "EXT. MARS ATMOSPHERE - DAY";
      } else if (p.includes("ocean") || p.includes("water")) {
        newSceneTitle = "Abyssal Wave Expedition";
        newSetting = "EXT. BIOLUMINESCENT OCEAN - DUSK";
      }

      const newScene = {
        id: `scene-${Date.now()}`,
        number: this.project.scenes.length + 1,
        title: newSceneTitle,
        setting: newSetting,
        summary: conceptText,
        shots: [
          {
            id: `shot-${Date.now()}-1`,
            code: `${this.project.scenes.length + 1}A`,
            title: "Wide Establishing Atmosphere",
            prompt: `Wide establishing cinematic shot of ${conceptText}, 35mm film grain, volumetric fog`,
            cameraBody: "ARRI Alexa Mini LF",
            lens: "24mm Ultra Wide",
            focalLength: "24mm",
            aperture: "f/2.8",
            motion: "Dolly Push",
            speed: "Normal (1.0x)",
            duration: 4,
            keyframeApproved: false,
            status: "draft",
            videoUrl: null
          },
          {
            id: `shot-${Date.now()}-2`,
            code: `${this.project.scenes.length + 1}B`,
            title: "Hero Subject Motion Tracking",
            prompt: `Medium tracking shot following hero in ${conceptText}, high tension motion blur, 8k`,
            cameraBody: "RED V-Raptor 8K",
            lens: "50mm Prime",
            focalLength: "50mm",
            aperture: "f/1.8",
            motion: "Tracking Forward",
            speed: "Fast (1.5x)",
            duration: 5,
            keyframeApproved: false,
            status: "draft",
            videoUrl: null
          },
          {
            id: `shot-${Date.now()}-3`,
            code: `${this.project.scenes.length + 1}C`,
            title: "Dynamic 360 Climax Orbit",
            prompt: `Dramatic 360 orbit camera rotation around subject in ${conceptText}, anamorphic lens flare`,
            cameraBody: "Sony Venice 2",
            lens: "85mm Telephoto",
            focalLength: "85mm",
            aperture: "f/1.4",
            motion: "Orbit 360°",
            speed: "Slow-Mo (0.5x)",
            duration: 4,
            keyframeApproved: false,
            status: "draft",
            videoUrl: null
          }
        ]
      };

      this.project.scenes.push(newScene);
      this.syncTimelineFromShots();
      this.saveProject();
      return newScene;
    }

    // Synchronize Timeline clips from scenes & shots
    syncTimelineFromShots() {
      let curTime = 0;
      const vClips = [];

      this.project.scenes.forEach(scene => {
        scene.shots.forEach(shot => {
          vClips.push({
            id: `clip-${shot.id}`,
            shotId: shot.id,
            start: curTime,
            duration: shot.duration || 4,
            label: `Shot ${shot.code} (${shot.title})`
          });
          curTime += shot.duration || 4;
        });
      });

      this.project.timeline.tracks.video = vClips;
    }

    // Add Character
    addCharacter(charData) {
      const newChar = {
        id: `char-${Date.now()}`,
        tag: charData.tag || `Char${this.project.elements.characters.length + 1}`,
        name: charData.name || "Unnamed Character",
        age: charData.age || 25,
        gender: charData.gender || "Any",
        appearance: charData.appearance || "",
        clothing: charData.clothing || "",
        personality: charData.personality || "",
        avatarColor: charData.avatarColor || "#ccff00"
      };
      this.project.elements.characters.push(newChar);
      this.saveProject();
      return newChar;
    }

    // Add Location
    addLocation(locData) {
      const newLoc = {
        id: `loc-${Date.now()}`,
        tag: locData.tag || `Loc${this.project.elements.locations.length + 1}`,
        name: locData.name || "Unnamed Location",
        time: locData.time || "Night",
        weather: locData.weather || "Clear",
        description: locData.description || "",
        colorKey: locData.colorKey || "#00f0ff"
      };
      this.project.elements.locations.push(newLoc);
      this.saveProject();
      return newLoc;
    }

    // Add Prop
    addProp(propData) {
      const newProp = {
        id: `prop-${Date.now()}`,
        tag: propData.tag || `Prop${this.project.elements.props.length + 1}`,
        name: propData.name || "Unnamed Prop",
        description: propData.description || ""
      };
      this.project.elements.props.push(newProp);
      this.saveProject();
      return newProp;
    }
  }

  window.FilmOS = new FilmOSStore();
})();
