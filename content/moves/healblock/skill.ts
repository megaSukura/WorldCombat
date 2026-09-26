/** A visible ward blocks native and shared healing attempts for its current carrier lifetime. */
namespace PokemonSkills {
    define({
        id: "healblock",
        cooldownParameter: "recharge",
        name: "回复封锁",
        description: "给敌人套上紫环，在持续期间拦住原生治疗与招式回复；一次恢复被挡下时，镇环会收紧。",
        uses: ["锁住靠回复拖时间的对手", "压制剩饭、吸取一类持续续航", "在爆发前先掐断对手的回血"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 100,
        style: "ward",
        defaults: { hold: false, ai: { maxChase: 13, sustain: true, leaveStation: false } },
        fields: [flag("hold", "久镇")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["healblock"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var hold = !!(config && config.hold);
            return { prepare: Math.round(p("healblock", "tempo", context)),
                recover: Math.round(p("healblock", "aftercast", context)),
                cooldown: Math.round(p("healblock", "recharge", context)) + (hold ? 6 : -4),
                active: 0, range: p("healblock", "reach", context) };
        },
        ready: function (action) {
            var world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            var self = world.observe(action.actor()), body = world.observe(target);
            if (self === null || body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("healblock", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, healBlockStatus)) return "already-warded";
            return "";
        },
        windup: function (action, config, prepare) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_healblock:windup", healBlockScene, 1, action.origin(), JSON.stringify({
                moment: "windup", scale: scale, veils: Math.round(p("healblock", "veils", action)),
                hold: config && config.hold ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), caster = action.actor(), target = action.target();
            var origin = action.origin(), targetPos = action.targetPosition();
            var delta = targetPos.minus(origin);
            var direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            var ticks = Math.max(60, Math.round(p("healblock", "lock", action)));
            var radius = Math.max(0.2, p("healblock", "radius", action));
            var rings = Math.max(6, Math.round(p("healblock", "rings", action)));
            var veils = Math.max(6, Math.round(p("healblock", "veils", action)));
            var scale = radius / 0.34;
            sound(action, "minecraft:entity.elder_guardian.curse");
            function fizzle(point: CombatPoint): void {
                WorldFeedback.emit(world, healBlockScene, 1, point, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), healBlockTextMiss, [], 24);
                done(action);
            }
            if (target === null || !world.valid(target) || world.friendly(target)) { fizzle(targetPos); return; }
            var body = world.observe(target);
            if (body === null || !world.clear(origin, body.position())) { fizzle(targetPos); return; }
            var at = body.position();
            var path: (string | number[])[] = [String(caster.ref()), String(target.ref())];
            WorldFeedback.emit(world, healBlockScene, 1, origin,
                { moment: "cast", target: String(target.ref()), path: path, veils: veils, scale: 1,
                    direction: [direction.x(), direction.y(), direction.z()],
                    reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())) }, 18);
            if (!healBlockArm(world, target, ticks)) { fizzle(at); return; }
            WorldFeedback.emit(world, healBlockScene, 1, at,
                { moment: "seal", target: String(target.ref()), rings: rings, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, ticks / 260)) }, 32);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), healBlockTextSeal, [], 34);
            world.sound("minecraft:block.beacon.deactivate", at, 14, "{}");
            done(action);
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["healblock"], detail: { values: config } };
            return { radius: pokemon ? p("healblock", "reach", context) : 10, geometry: "line", style: "ward", color: 0x9B6BE8,
                label: config && config.hold === true ? "回复封锁·久镇" : "回复封锁·急镇" };
        }
    });
}
