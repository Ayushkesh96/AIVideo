/**
 * AIVIDEO FILMMAKING PRODUCTION OS — REACTIVE GLOBAL STATE STORE
 * Manages complete project hierarchy, elements, scenes, shots, timeline,
 * reel history, settings, and localStorage persistence under key `filmOS_project`.
 */

(function () {
  const STORAGE_KEY = 'filmOS_project';

  // Bumped whenever the shape of a stored project changes in a way that makes
  // old data wrong to load. v2 is the move away from shipping the demo project
  // as the default state — anyone carrying the old demo in localStorage gets a
  // clean project instead of someone else's fictional film.
  const SCHEMA_VERSION = 2;

  /**
   * A new, empty project. This is what the studio opens with.
   *
   * It carries exactly one blank shot because the studio binds its controls to
   * an active shot; with no shot at all the prompt box, camera rig and FX
   * panel would have nothing to write to.
   */
  function blankProject() {
    return {
      schemaVersion: SCHEMA_VERSION,
      id: `proj-${Date.now()}`,
      name: "Untitled Project",
      logline: "",
      synopsis: "",
      aspectRatio: "16:9",
      resolution: "1080p",
      fps: 24,
      activeModel: "Seedance 2.5 (1080p)",
      activeSceneId: "scene-01",
      activeShotId: "shot-01",

      apiConfig: {
        llmEndpoint: "",
        llmKey: "",
        videoGenEndpoint: "",
        videoGenKey: "",
        isSimulatedMode: true
      },

      elements: { characters: [], locations: [], props: [], styles: [] },

      scenes: [
        {
          id: "scene-01",
          number: 1,
          title: "Scene 1",
          setting: "",
          summary: "",
          shots: [
            {
              id: "shot-01",
              code: "01A",
              title: "Shot 1",
              prompt: "",
              model: "Seedance 2.5 (1080p)",
              camera: "Orbit 360°",
              lens: "24mm",
              rig: "Dolly",
              motionRig: "Dolly",
              motionSpeed: 75,
              aspectRatio: "16:9",
              fx: { lut: "cyber", flare: 80, grain: 35, fog: 50, speed: 1.0 },
              keyframeApproved: false,
              status: "draft",
              referenceImage: null,
              videoUrl: null,
              duration: 5
            }
          ]
        }
      ],

      generationReel: [],

      timeline: {
        playhead: 0,
        zoom: 1.0,
        muxAudio: true,
        tracks: { video: [], voice: [], music: [] }
      }
    };
  }

  // Kept as a showcase, but no longer the state you start in. Loadable from the
  // studio via FilmOS.loadDemoProject().
  const DEMO_PROJECT = {
    schemaVersion: SCHEMA_VERSION,
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

          // Anything stored before v2 is the old demo project that used to
          // ship as the default. Merging it forward would hand the user a
          // fictional film they never created, so it is discarded.
          if (parsed && parsed.schemaVersion === SCHEMA_VERSION) {
            return Object.assign(blankProject(), parsed);
          }
        }
      } catch (e) {
        console.warn("Could not load stored FilmOS project:", e);
      }
      return blankProject();
    }

    /** Discards the current project and starts from empty. */
    newProject() {
      this.state = blankProject();
      this.save();
      return this.state;
    }

    /** Loads the bundled showcase project, for demoing the tooling. */
    loadDemoProject() {
      this.state = JSON.parse(JSON.stringify(DEMO_PROJECT));
      this.save();
      return this.state;
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

    // Update Reusable Element
    updateElement(type, id, updatedData) {
      if (!this.state.elements[type]) return;
      const idx = this.state.elements[type].findIndex(e => e.id === id);
      if (idx !== -1) {
        this.state.elements[type][idx] = Object.assign(this.state.elements[type][idx], updatedData);
        this.save();
      }
    }

    // Delete Element from Registry
    deleteElement(type, id) {
      if (!this.state.elements[type]) return;
      this.state.elements[type] = this.state.elements[type].filter(e => e.id !== id);
      this.save();
    }

    // Unlink element from active shot
    unlinkElementFromShot(shotId, tag) {
      const shot = this.getActiveShot();
      if (!shot) return;
      const reg = new RegExp(`@${tag}\\b`, 'gi');
      shot.prompt = shot.prompt.replace(reg, '').replace(/\s+/g, ' ').trim();
      if (shot.elementRefs) {
        shot.elementRefs = shot.elementRefs.filter(t => t.toLowerCase() !== tag.toLowerCase());
      }
      this.save();
    }

    // Link element to active shot
    linkElementToShot(shotId, tag) {
      const shot = this.getActiveShot();
      if (!shot) return;
      if (!shot.prompt.includes(`@${tag}`)) {
        shot.prompt = `${shot.prompt} @${tag}`.trim();
      }
      if (!shot.elementRefs) shot.elementRefs = [];
      if (!shot.elementRefs.includes(tag)) shot.elementRefs.push(tag);
      this.save();
    }

    // Get Active Elements for current shot
    getActiveShotElements() {
      const shot = this.getActiveShot();
      if (!shot) return [];
      const prompt = shot.prompt || "";
      const matched = [];

      // Extract all @mentions
      const mentions = (prompt.match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase());
      if (shot.elementRefs) {
        shot.elementRefs.forEach(r => {
          const l = r.toLowerCase();
          if (!mentions.includes(l)) mentions.push(l);
        });
      }

      // Check characters
      this.state.elements.characters.forEach(c => {
        if (mentions.includes(c.tag.toLowerCase()) || mentions.includes(c.name.toLowerCase())) {
          matched.push({
            id: c.id,
            type: 'character',
            tag: c.tag,
            name: c.name,
            aka: c.name,
            description: c.appearance || `${c.gender}, ${c.age} y/o`,
            tags: `${c.gender}, ${c.age} y/o`,
            avatarColor: c.avatarColor || '#ccff00'
          });
        }
      });

      // Check locations
      this.state.elements.locations.forEach(l => {
        if (mentions.includes(l.tag.toLowerCase()) || mentions.includes(l.name.toLowerCase())) {
          matched.push({
            id: l.id,
            type: 'location',
            tag: l.tag,
            name: l.name,
            aka: l.name,
            description: l.description || `${l.time}, ${l.weather}`,
            tags: l.time || 'Location',
            colorKey: l.colorKey || '#00f0ff'
          });
        }
      });

      // Check props
      this.state.elements.props.forEach(p => {
        if (mentions.includes(p.tag.toLowerCase()) || mentions.includes(p.name.toLowerCase())) {
          matched.push({
            id: p.id,
            type: 'prop',
            tag: p.tag,
            name: p.name,
            aka: p.name,
            description: p.description,
            tags: 'Prop'
          });
        }
      });

      // Check styles
      this.state.elements.styles.forEach(s => {
        if (mentions.includes(s.tag.toLowerCase()) || mentions.includes(s.name.toLowerCase())) {
          matched.push({
            id: s.id,
            type: 'style',
            tag: s.tag,
            name: s.name,
            aka: s.name,
            description: s.description,
            tags: 'Style'
          });
        }
      });

      return matched;
    }

    // AI Director (Script-to-Shots Generator)
    async generateFilmBreakdown(visionPrompt) {
      const config = this.state.apiConfig || {};

      if (config.llmEndpoint && config.llmKey) {
        try {
          const sysPrompt = `You are a Hollywood film director and cinematographer AI.
Convert the user's film vision into a structured JSON production breakdown containing scenes, shots, lenses, motion rigs, and reusable @elements.
Strictly return valid JSON only matching this schema without markdown code blocks:
{
  "scenes": [
    {
      "title": "string",
      "shots": [
        {
          "title": "string",
          "prompt": "detailed prompt with @Element tags",
          "lens": "16mm | 24mm | 35mm | 50mm | 85mm | 135mm",
          "cameraMovement": "Orbit 360° | Dolly | Truck | Crane | Handheld | FPV Drone",
          "aspectRatio": "16:9",
          "elementRefs": ["tag1", "tag2"]
        }
      ]
    }
  ],
  "elements": [
    { "name": "string", "aka": "string", "type": "character | location | prop | style", "description": "string", "tags": "string" }
  ]
}`;

          const res = await fetch(config.llmEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.llmKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: visionPrompt }
              ],
              temperature: 0.7
            })
          });

          if (!res.ok) throw new Error(`LLM Error: ${res.statusText}`);
          const jsonRes = await res.json();
          let raw = jsonRes.choices[0].message.content;
          raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(raw);
        } catch (err) {
          console.warn("Live LLM failed, falling back to simulated generator:", err);
        }
      }

      // Simulated local generator
      await new Promise(r => setTimeout(r, 1200));
      return this._generateSimulatedBreakdown(visionPrompt);
    }

    _generateSimulatedBreakdown(prompt) {
      const p = (prompt || "").toLowerCase();
      const isSpace = p.includes('space') || p.includes('planet') || p.includes('star');
      const isHeist = p.includes('heist') || p.includes('vault') || p.includes('laser');
      const isFashion = p.includes('fashion') || p.includes('runway') || p.includes('noir');

      if (isSpace) {
        return {
          scenes: [
            {
              title: "Atmospheric Entry",
              shots: [
                {
                  title: "Orbital Descent",
                  prompt: "FPV Drone tracking shot of @OdysseyVessel breaking through cloud layers above glowing @BiolumCanyons in @SpaceCinema",
                  lens: "16mm",
                  cameraMovement: "FPV Drone",
                  aspectRatio: "16:9",
                  elementRefs: ["OdysseyVessel", "BiolumCanyons", "SpaceCinema"]
                },
                {
                  title: "Commander Emergence",
                  prompt: "Low angle 35mm Prime tracking shot of @AriaVance stepping onto crystalline surface in @BiolumCanyons",
                  lens: "35mm",
                  cameraMovement: "Dolly",
                  aspectRatio: "16:9",
                  elementRefs: ["AriaVance", "BiolumCanyons"]
                }
              ]
            },
            {
              title: "The Artifact Discovery",
              shots: [
                {
                  title: "Beacon Orbit 360",
                  prompt: "Orbit 360 camera move around the towering alien monolith pulsing indigo energy in @BiolumCanyons",
                  lens: "24mm",
                  cameraMovement: "Orbit 360°",
                  aspectRatio: "16:9",
                  elementRefs: ["BiolumCanyons", "SpaceCinema"]
                }
              ]
            }
          ],
          elements: [
            { name: "Aria Vance", aka: "Commander Aria", type: "character", description: "Deep space explorer in pressurized titanium flight suit with gold-tinted visor", tags: "Female, 34 y/o" },
            { name: "Biolum Canyons", aka: "Sector 7 Monolith Basin", type: "location", description: "Planetary canyon glowing with violet bioluminescent flora under twin moons", tags: "Exoplanet Twilight" },
            { name: "Odyssey Vessel", aka: "Exo-Class Lander", type: "prop", description: "Sleek aerodynamic dropship with blue ion propulsion trail", tags: "Spaceship" }
          ]
        };
      }

      if (isHeist) {
        return {
          scenes: [
            {
              title: "The Infiltration",
              shots: [
                {
                  title: "Rooftop Rappel",
                  prompt: "Dramatic crane shot of @Cipher descending through glass ceiling of @ObsidianVault in @CyberpunkNeon",
                  lens: "24mm",
                  cameraMovement: "Crane",
                  aspectRatio: "16:9",
                  elementRefs: ["Cipher", "ObsidianVault", "CyberpunkNeon"]
                },
                {
                  title: "Laser Grid Evasion",
                  prompt: "Dynamic Handheld 35mm shot of @Cipher executing acrobatic slide under thermal security grid in @ObsidianVault",
                  lens: "35mm",
                  cameraMovement: "Handheld",
                  aspectRatio: "16:9",
                  elementRefs: ["Cipher", "ObsidianVault"]
                }
              ]
            },
            {
              title: "The Data Extraction",
              shots: [
                {
                  title: "Quantum Core Unlock",
                  prompt: "Macro 85mm close-up on @Cipher inserting biometric override key into obsidian server console",
                  lens: "85mm",
                  cameraMovement: "Dolly",
                  aspectRatio: "16:9",
                  elementRefs: ["Cipher", "ObsidianVault"]
                }
              ]
            }
          ],
          elements: [
            { name: "Cipher", aka: "Kaelen Cross", type: "character", description: "Tactical infiltrator in matte-black carbon nanofiber stealth suit with optic HUD", tags: "Male, 29 y/o" },
            { name: "Obsidian Vault", aka: "OmniCorp High Security Core", type: "location", description: "Subterranean titanium vault criss-crossed with scarlet security lasers", tags: "Sub-Level 4" }
          ]
        };
      }

      // Default: Nike Style Tokyo Runner
      return {
        scenes: [
          {
            title: "Tokyo Protocol: The Sprint",
            shots: [
              {
                title: "Wet Asphalt Launch",
                prompt: "Low angle wide 24mm tracking sprint of @Alex sprinting through neon reflections in @TokyoRain",
                lens: "24mm",
                cameraMovement: "Dolly",
                aspectRatio: "16:9",
                elementRefs: ["Alex", "TokyoRain"]
              },
              {
                title: "Neon Overpass FPV",
                prompt: "FPV Drone high-speed dive following @Alex vaulting over pedestrian rail in @TokyoRain into alleyway",
                lens: "16mm",
                cameraMovement: "FPV Drone",
                aspectRatio: "16:9",
                elementRefs: ["Alex", "TokyoRain"]
              }
            ]
          },
          {
            title: "The Cyber Rendezvous",
            shots: [
              {
                title: "Sarah Communication",
                prompt: "Medium 50mm Prime shot of @Sarah watching telemetry readouts on transparent holo-visor in @RooftopCafe",
                lens: "50mm",
                cameraMovement: "Orbit 360°",
                aspectRatio: "16:9",
                elementRefs: ["Sarah", "RooftopCafe"]
              },
              {
                title: "Climax Hand-off",
                prompt: "Handheld close-up of @Alex passing @NeuralDrive to @Sarah as rain pours over neon skyline",
                lens: "85mm",
                cameraMovement: "Handheld",
                aspectRatio: "16:9",
                elementRefs: ["Alex", "Sarah", "NeuralDrive", "TokyoRain"]
              }
            ]
          }
        ],
        elements: [
          { name: "Alex", aka: "Alex Vance", type: "character", description: "Athletic runner in technical windbreaker with cybernetic optical scanner", tags: "Male, 28 y/o" },
          { name: "Sarah", aka: "Sarah Chen", type: "character", description: "Mission operator in structured tailored blazer with emerald ocular implants", tags: "Female, 31 y/o" },
          { name: "Tokyo Rain", aka: "Neo-Tokyo Alleyways", type: "location", description: "Towering neon skyscraper canyons reflecting in rain-slicked obsidian asphalt", tags: "Night Rain" },
          { name: "Neural Drive", aka: "Cryo Storage Key", type: "prop", description: "Glowing cyan crystalline data capsule with pulsing fiber circuits", tags: "Prop" }
        ]
      };
    }

    // Apply breakdown to project
    applyGeneratedFilmBreakdown(data) {
      if (!data) return;

      // 1. Merge Elements into Registry
      if (data.elements && Array.isArray(data.elements)) {
        data.elements.forEach(el => {
          const type = (el.type || 'character').toLowerCase();
          const cleanTag = (el.name || el.aka || 'Element').replace(/\s+/g, '');
          const targetArray = this.state.elements[type === 'character' ? 'characters' : type === 'location' ? 'locations' : type === 'prop' ? 'props' : 'styles'] || this.state.elements.characters;
          
          const exists = targetArray.some(e => e.tag.toLowerCase() === cleanTag.toLowerCase() || e.name.toLowerCase() === el.name.toLowerCase());
          if (!exists) {
            if (type === 'character') {
              this.addCharacter({
                tag: cleanTag,
                name: el.name || cleanTag,
                appearance: el.description || "",
                gender: el.tags ? el.tags.split(',')[0] : "Any",
                age: el.tags && el.tags.includes('y/o') ? parseInt(el.tags) || 28 : 28
              });
            } else if (type === 'location') {
              this.addLocation({
                tag: cleanTag,
                name: el.name || cleanTag,
                description: el.description || "",
                time: el.tags || "Night",
                weather: "Rain"
              });
            } else if (type === 'prop') {
              this.addProp({
                tag: cleanTag,
                name: el.name || cleanTag,
                description: el.description || ""
              });
            }
          }
        });
      }

      // 2. Append Scenes
      if (data.scenes && Array.isArray(data.scenes)) {
        let firstNewShotId = null;
        data.scenes.forEach(sc => {
          const newScene = {
            id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            number: this.state.scenes.length + 1,
            title: sc.title || `Scene ${this.state.scenes.length + 1}`,
            setting: sc.setting || "EXT. CITY - NIGHT",
            summary: sc.summary || "",
            shots: []
          };

          (sc.shots || []).forEach((sh, sIdx) => {
            const shotId = `shot-${Date.now()}-${sIdx}`;
            if (!firstNewShotId) firstNewShotId = shotId;
            newScene.shots.push({
              id: shotId,
              code: `${newScene.number}${String.fromCharCode(65 + sIdx)}`,
              title: sh.title || `Shot ${newScene.number}${String.fromCharCode(65 + sIdx)}`,
              prompt: sh.prompt || "",
              model: this.state.activeModel,
              camera: sh.cameraMovement || "Orbit 360°",
              cameraMovement: sh.cameraMovement || "Orbit 360°",
              cameraBody: "ARRI Alexa Mini",
              lens: sh.lens || "24mm",
              rig: sh.cameraMovement || "Dolly",
              motionRig: sh.cameraMovement || "Dolly",
              motionSpeed: 75,
              aspectRatio: sh.aspectRatio || "16:9",
              elementRefs: sh.elementRefs || [],
              fx: { lut: "cyber", flare: 80, grain: 35, fog: 50, speed: 1.0 },
              keyframeApproved: false,
              status: "draft",
              referenceImage: null,
              videoUrl: null,
              duration: 4
            });
          });

          this.state.scenes.push(newScene);
        });

        if (firstNewShotId) {
          this.state.activeShotId = firstNewShotId;
        }
      }

      this.save();
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
            cameraBody: "ARRI Alexa Mini",
            lens: "35mm",
            rig: "Orbit 360°",
            motionRig: "Orbit 360°",
            motionSpeed: 75,
            aspectRatio: this.state.aspectRatio,
            elementRefs: [],
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
