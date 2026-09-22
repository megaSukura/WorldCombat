/**
 * 大地波动 / terrainpulse —— 注册与动作。
 *
 * 念头三幕：一幕顿地（提交前 `windup` 预告，脚下的地纹先亮），一幕推出（提交后贴地的波沿地面向目标推进，
 * 颜色是脚下场地的元素，没场地就是灰白），一幕命中（目标脚下炸起同色的地环与碎屑）。
 * 共鸣配置下，第一波落下后再补一波以落点为中心的地环，两波各 ×0.7。
 * 属性与是否翻倍都来自 `parameters.ts` 的同一份场地读取；预览、AI 与命中读同一份。世界不留持久物。
 */
namespace PokemonSkills {
    const terrainpulseScene = "world_combat:move_terrainpulse";

    function terrainpulseFeatures(): HitFeatures {
        return <HitFeatures>damageFeatures("terrainpulse", "pulse");
    }

    function terrainpulseHit(current: CombatAction, hit: CombatImpact, power: number, colour: number, bursts: number, ring: number): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        if (target === null) {
            WorldFeedback.emit(world, terrainpulseScene, 1, point, { moment: "fizzle", tint: colour, scale: 1 }, 22);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "terrainpulse", power, terrainpulseFeatures());
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound("cobblemon:move.bulldoze.target", point, 16, "{}");
        WorldFeedback.emit(world, terrainpulseScene, 1, point, { moment: "impact", target: String(target.ref()), tint: colour,
            intensity: intensity, scale: ring, bursts: Math.round(bursts * (0.7 + intensity * 0.2)) }, 32);
        if (!landed) return;
    }

    /** 共鸣的第二波：以第一波落点为心的一圈贴地冲击。 */
    function terrainpulseSecond(current: CombatAction, x: number, y: number, z: number, power: number, colour: number, ring: number, bursts: number): void {
        var world = current.world(), centre = WorldCombat.point(x, y, z);
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, ring, { below: 1, above: 3 }), function (enemy: CombatActor) {
            if (world.valid(enemy)) hurt(world, enemy, "terrainpulse", power, terrainpulseFeatures());
        });
        world.sound("cobblemon:move.bulldoze.target", centre, 16, "{}");
        WorldFeedback.emit(world, terrainpulseScene, 1, centre, { moment: "secondary", tint: colour, scale: ring,
            bursts: Math.round(bursts * 0.7) }, 30);
    }

    function terrainpulseStrike(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), body = world.observe(actor);
        var origin = body ? body.position() : action.origin();
        var terrain = body && body.grounded() ? terrainpulseTerrainAt(world, origin) : null;
        var colour = terrain ? terrain.colour : 0x9AA0A8;
        var power = p("terrainpulse", "pulse", action), speed = p("terrainpulse", "velocity", action),
            radius = p("terrainpulse", "radius", action), bursts = p("terrainpulse", "bursts", action),
            ring = p("terrainpulse", "ring", action);
        var resonate = !!(config && config.resonate === true);
        sound(action, "cobblemon:move.bulldoze.actor");
        WorldFeedback.emit(world, terrainpulseScene, 1, origin, { moment: "stomp", tint: colour, scale: 1,
            charged: terrain ? 1 : 0 }, 28);
        var landing: number[] | null = null;
        var appearance: any = { sprite: "cobblemon:particle/generic/orb/flat", scale: 0.9, tint: colour, glow: true };
        var flight = LivingActions.projectile(action, {
            speed: speed, range: action.range(), radius: radius, direction: aim(action), appearance: appearance,
            impact: function (current: CombatAction, hit: CombatImpact) {
                var point = hit.position();
                landing = [point.x(), point.y(), point.z()];
                terrainpulseHit(current, hit, power, colour, bursts, ring);
            }
        }, function (current: CombatAction) {
            if (resonate && landing !== null) {
                var site = landing;
                current.after(Math.max(1, Math.round(p("terrainpulse", "repeatDelay", current))), function (later: CombatAction) {
                    terrainpulseSecond(later, site[0], site[1], site[2], power, colour, ring, bursts);
                    done(later);
                });
                return;
            }
            done(current);
        });
        WorldFeedback.emit(world, terrainpulseScene, 1, origin, { moment: "travel", projectile: flight, tint: colour, scale: 1 }, 70);
    }

    define({
        id: "terrainpulse",
        name: "大地波动",
        description: "一脚顿地，把地脉沿地面推向目标；站在电气、青草、薄雾或精神场地上时，波带上那片场地的元素、威力翻倍。",
        uses: ["看脚下的场地出手", "在场地里放大威力"],
        kind: "enemy",
        range: 12,
        maxRange: 20,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 32,
        style: "ground",
        defaults: { resonate: false },
        fields: [flag("resonate", "共鸣")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["terrainpulse"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("terrainpulse", "charge", context)), recover: 8, cooldown: 32, active: 0,
                range: p("terrainpulse", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var point = body ? body.position() : action.origin();
            var terrain = body && body.grounded() ? terrainpulseTerrainAt(action.sense(), point) : null;
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:terrainpulse:" + action.id(), terrainpulseScene, 1, action.origin(), JSON.stringify({
                moment: "windup", tint: terrain ? terrain.colour : 0x9AA0A8, scale: scale, charged: terrain ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            terrainpulseStrike(action, config, done);
        },
        indicator: function () { return { radius: 12, geometry: "line", style: "ground", label: "大地波动" }; }
    });
}
