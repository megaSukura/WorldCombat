WorldCombatParticles.scene("world_combat:work_electric_supply", 1, {
    interrupt: "drain",
    moments: { transfer: { duration: 8, emitters: [
        { name: "input", bind: "point", particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
            burst: { count: { data: "sparks", fallback: 4 } }, shape: { kind: "sphere_surface", radius: 0.45 },
            direction: "inward", speed: [0.03, 0.08], lifetime: [5, 8], size: [0.12, 0.03],
            color: 0xFFD84A, alpha: [0.8, 0], light: "full", maxParticles: 24 }
    ] } }
});
