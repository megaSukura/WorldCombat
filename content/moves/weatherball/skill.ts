/**
 * 气象球 / weatherball —— 注册与动作。
 *
 * 念头三幕：一幕聚气（提交前 `windup` 预告，天色可收时头顶的光更亮），一幕收集（提交后把此刻天色的元素
 * 收成一颗球，颜色就是收集到的元素色），一幕飞出命中（球沿直线飞出，命中处炸开同色元素）。
 * 属性与威力都来自 `parameters.ts` 的同一份天色读取；预览、AI 与命中读同一份。
 * 世界里不留东西：球命中即散。
 */
namespace PokemonSkills {
    const weatherballScene = "world_combat:move_weatherball";

    function weatherballFeatures(): HitFeatures {
        return <HitFeatures>damageFeatures("weatherball", "orb");
    }

    function weatherballHit(current: CombatAction, hit: CombatImpact, element: WeatherballElement, power: number, bursts: number): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        if (target === null) {
            WorldFeedback.emit(world, weatherballScene, 1, point, { moment: "fizzle", tint: element.colour, scale: 1 }, 22);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "weatherball", power, weatherballFeatures());
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound(element.sound, point, 16, "{}");
        WorldFeedback.emit(world, weatherballScene, 1, point, { moment: "impact", target: String(target.ref()), tint: element.colour,
            intensity: intensity, scale: p("weatherball", "halo", current), bursts: Math.round(bursts * (0.7 + intensity * 0.2)) }, 34);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)),
            "world_combat.move.weatherball.text.sky", [{ key: "cobblemon.type." + element.type, fallback: element.type }], 28);
        if (!landed) return;
    }

    function weatherballStrike(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), body = world.observe(actor);
        var origin = body ? body.position() : action.origin();
        var sky = weatherballSkyAt(world, origin), element = weatherballElementOf(sky);
        var power = p("weatherball", "orb", action), speed = p("weatherball", "velocity", action),
            radius = p("weatherball", "radius", action), bursts = p("weatherball", "bursts", action);
        sound(action, "minecraft:entity.illusioner.cast_spell");
        WorldFeedback.emit(world, weatherballScene, 1, origin, { moment: "gather", tint: element.colour, scale: 1,
            charged: sky === "clear" ? 0 : 1 }, 30);
        var appearance: any = { sprite: "cobblemon:particle/generic/orb/energyorb", scale: sky === "clear" ? 1.0 : 1.3,
            tint: element.colour, glow: true };
        if (config && config.pierce === true) appearance.pierce = 2;
        var flight = LivingActions.projectile(action, {
            speed: speed, range: action.range(), radius: radius, direction: aim(action), appearance: appearance,
            impact: function (current: CombatAction, hit: CombatImpact) { weatherballHit(current, hit, element, power, bursts); }
        }, done);
        WorldFeedback.emit(world, weatherballScene, 1, origin,
            { moment: "flight", projectile: flight, tint: element.colour, scale: 1 }, 60);
    }

    define({
        id: "weatherball",
        name: "气象球",
        description: "把此刻头顶的天色收进一颗球再甩出去：雨天是水、雷雨是电、晴空是火、沙暴是岩、雪天是冰，无天气则是一颗普通的球；天色可收时威力翻倍。",
        uses: ["看天出手的远程攻击", "在雷雨或晴空里放大威力"],
        kind: "enemy",
        range: 14,
        maxRange: 22,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "sky",
        defaults: { pierce: false },
        fields: [flag("pierce", "贯穿")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["weatherball"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("weatherball", "charge", context)), recover: 8, cooldown: 34, active: 0,
                range: p("weatherball", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var point = body ? body.position() : action.origin();
            var sky = weatherballSkyAt(action.sense(), point), element = weatherballElementOf(sky);
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:weatherball:" + action.id(), weatherballScene, 1, action.origin(), JSON.stringify({
                moment: "windup", tint: element.colour, scale: scale, charged: sky === "clear" ? 0 : 1 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            weatherballStrike(action, config, done);
        },
        indicator: function () { return { radius: 14, geometry: "line", style: "sky", label: "气象球" }; }
    });
}
