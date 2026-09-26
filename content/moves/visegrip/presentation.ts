/** Claws follow real short paths; the held connection ends with the action. */
const VisegripDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        close: { duration: 7, emitters: [{ name: "claw_edge",bind:"path",fit:"world",particle:"world_combat_core:cobblemon/generic/spike",rate:24,shape:{kind:"polyline"},lifetime:[3,6],size:[.12,.04],color:0xE89080,alpha:[.75,0] }] },
        hold: { emitters: [{name:"held_joint",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/grab",rate:14,shape:{kind:"sphere_surface",radius:.35},lifetime:[2,4],size:[.25,.12],color:0xE89080,alpha:[.6,.1]}] },
        release: { duration:8,emitters:[{name:"open_again",bind:"target",fit:"body",particle:"world_combat_core:cobblemon/generic/spike",burst:{count:4},shape:{kind:"sphere_surface",radius:.3},direction:"outward",speed:[.02,.05],lifetime:[3,6],size:[.1,.02],alpha:[.5,0]}] },
        open: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gape", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 14,
                    lifetime: [8, 14], size: [0.2, 0.05], spin: 6,
                    color: 0xE8B0A0, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.15, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], spread: 16,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC8A898, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        clamp: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "grip", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.5, 0.6], sizeMode: "index",
                    color: 0xF0D8C8, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "crush", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "specks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "motes", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xDCC3B0, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "squeeze", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "drag", fallback: 0.9 } },
                    direction: "inward", speed: [0.04, 0.14], spread: 8,
                    lifetime: [10, 18], size: [0.4, 0.5], sizeMode: "linear",
                    color: 0xE8B0A0, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "source", offset: [0, 0.4, 0.2], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], spread: 14,
                    lifetime: [8, 14], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xD8C0A8, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_visegrip", 1, VisegripDefinition);
