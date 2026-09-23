/**
 * 回复封锁 / healblock —— 注册与动作。
 *
 * 念头：一道镇住回复的紫环套在目标身上——在这段时间里，任何往回涨的生命都被环抽走、按回原位。
 * 三幕：
 *   起（windup，提交前）：掌心拢起一枚预转的紫环（只观察、只预告，可被打断且不花代价）。
 *   镇（execute，提交后）：一条紫条连成的线从施法者射向目标；命中后挂上共享身份
 *     `world_combat:status/healblock` 的镇环，并通过 healBlockArm 记下生命地板、封住回血通道。
 *   续／松（mob_effect_tick 续表现／mob_effect_removed 到期或被人清除）：期间任何高于地板的净回升
 *     都被按回地板并画出一段「回血被吸走」（rules.ts）；到期自己松开，被牛奶清除是硬拔下来。
 *
 * 单体、跟随；不碰道具。别的单元的交付招式要消费这条身份，用 `CombatStatus.has(world, actor, "healblock")`。
 */
namespace PokemonSkills {
    /** 目标身上镇环的数量，供持续表现复用。 */
    var healBlockRings: { [ref: string]: number } = Object.create(null);

    // 持续：镇环跟着目标走，每 25 刻续一次低密度的转动。
    WorldCombat.on("world_combat:move_healblock/hold", "world_combat:mob_effect_tick", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== healBlockEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 25 !== 0) return;
        var body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_healblock/hold/" + String(actor.ref()), healBlockScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), rings: healBlockRings[String(actor.ref())] || 10 }, 40);
    });

    define({
        id: "healblock",
        cooldownParameter: "recharge",
        name: "回复封锁",
        description: "向对手套上一道镇住回复的紫环：在紫环松开前，它无法通过招式、特性或携带的道具回复生命，任何回升都被按回原位。",
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
            healBlockRings[String(target.ref())] = rings;
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
