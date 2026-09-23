/**
 * 金属音 / metalsound — 执行组织。
 *
 * 核心念头：用身上的金属相互摩擦，慢慢刮出一声让人牙酸的高频音。声音贴着墙也能送到对手耳里，
 *   在它体内拉出一条长长的回响，特防被一层层刮掉。它不飞、不铺地，也不需要看见对方——但要把音磨出来，
 *   施法者得先站定，这是本组起手最久、回响最久的一招。
 *
 * 出手：长起手（windup 在身上刮出金属火花与一圈圈声纹）后提交；起手可被打断，打断不花代价。
 * 命中：目标挂共享身份 world_combat:status/grating（本单元效果 world_combat:metal_sound_grating，只借身份），
 *       再 NativeEffects.boost 大幅下降特防；宝可梦损失原生特防等级，其他生物落到护甲属性。
 * 反制：拉开到回响距离之外就听不见；它不造成伤害，站定磨音的时间正是对手冲上来的窗口。
 */
namespace PokemonSkills {
    function metalsoundAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: metalsoundId,
        cooldownParameter: "wait",
        name: "金属音",
        description: "摩擦身上的金属，发出让人牙酸的高频声，隔着掩体也能送到对手耳里，大幅降低它的特防。要把音磨出来就得先站定，起手很长；长磨降得更多、回响更久，但更慢。",
        uses: ["隔着掩体磨掉一个特防位", "把特防大降挂满一整个交战窗口", "在安全的掩体后慢慢起手再送到墙上对面"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 15,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "metal",
        defaults: { long: false },
        fields: [
            flag("long", "长磨")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[metalsoundId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(metalsoundId, "tempo", context)),
                recover: p(metalsoundId, "recover", context),
                cooldown: Math.round(p(metalsoundId, "wait", context)),
                active: 1,
                range: p(metalsoundId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("metalsound-windup", metalsoundScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", long: config && config.long ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: config && config.long ? 9 : 6, geometry: "line", style: "metal", color: 0xC9B04C,
                label: config && config.long ? "金属音·长磨" : "金属音·短刮" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(metalsoundId, "drop", action))));
            const ring = Math.max(80, Math.round(p(metalsoundId, "ring", action)));
            const cycles = Math.max(6, Math.round(p(metalsoundId, "cycles", action)));
            const long = !!(config && config.long);
            sound(action, "minecraft:block.amethyst_block.resonate");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, metalsoundScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            // 声音不需要通视：掩体挡不住金属音，这正是它不用瞄准的价值。
            MobEffects.apply(world, target, metalsoundEffect, ring, 0);
            NativeEffects.boost(world, target, "spd", -drop);
            WorldFeedback.emit(world, metalsoundScene, 1, origin,
                { moment: "grate", path: ["source", "target"], target: String(target.ref()),
                    cycles: cycles, long: long ? 1 : 0, drop: drop }, 28);
            WorldFeedback.emit(world, metalsoundScene, 1, point,
                { moment: "hit", target: String(target.ref()), cycles: cycles, drop: drop,
                    sparks: Math.round(8 + drop * 6) }, 26);
            WorldFeedback.text(world, metalsoundAbove(point), "world_combat.move.metalsound.text.grate", [drop], 36);
            done(action);
        }
    });

    // 回响未消期间，目标身上持续荡开一圈圈金属声纹。
    WorldCombat.on("world_combat:move_metalsound/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== metalsoundEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "metalsound:" + String(actor.ref()), metalsoundScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
