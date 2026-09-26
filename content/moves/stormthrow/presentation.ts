/** Grab contact and actual native turning path; an immovable grip uses a short palm impact. */
const StormthrowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        press: { duration: 14, emitters: [{ name: "grip_press", bind: "target", fit: "body", particle: "world_combat_core:cobblemon/generic/hit_yellow",
            burst: { count: 8 }, shape: { kind: "sphere_surface", radius: .45 }, speed: [.015, .045], lifetime: [6, 10], size: [.22, .04], alpha: [.8, 0] }] },
        windup: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "low_dust", bind: "source", offset: [0, 0.04, 0], height: 0.1, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.0, 0.04],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xC9A86A, alpha: [0.35, 0], light: "world", maxParticles: 30
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.1, 0], height: 0.9, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xE8C98A, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        grab: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "clutch", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 2, interval: 3 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.3, 0.12], sizeMode: "index",
                    color: 0xE8C98A, alpha: [0.9, 0], light: "full", maxParticles: 14
                },
                {
                    name: "grip_dust", bind: "target", offset: [0, 0.1, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xC9A86A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                { name: "actual_turn", bind: "path", fit: "none", particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "strands", fallback: 8 } }, shape: { kind: "polyline" }, speed: [.005, .02],
                    lifetime: [10, 20], size: [.16, .04], color: 0xC98B3A, alpha: [.5, 0] },
                {
                    name: "crater", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [12, 22], size: [0.5, 1.1],
                    color: 0xB07A3C, alpha: [0.7, 0], light: "world"
                },
                {
                    name: "clods", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 6 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.14, 0.42], spread: 18, spin: 120,
                    gravity: 0.06, drag: 0.97,
                    lifetime: [12, 22], size: [0.2, 0.06], sizeMode: "index",
                    color: 0xA8763C, alpha: [0.95, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.26], spread: 24, spin: 30,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [14, 26], size: [0.22, 0.05],
                    color: 0xC9A86A, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "hit", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: 8, size: [0.4, 0.08], sizeMode: "index",
                    color: 0xF2E4C9, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 12
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xC9A86A, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stormthrow", 1, StormthrowDefinition);
