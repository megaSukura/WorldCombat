/**
 * 闪光 / Flash — 执行组织。
 *
 * 核心念头：施法者自身炸开一团强光，凡是看得见这道光的敌人当场被晃花眼睛；光不走路、走位躲不开，
 *   但墙能把光挡住——掩体就是这招的空门，离得近的晃得更深。这是一个以自身为圆心的即时爆发：
 *   没有弹道、没有落点，只有一句「谁看得见我」。
 *
 * 出手：短起手（windup 在施法者身上聚光）后提交；光势由配置在覆盖面与深度之间取舍。
 * 命中：WorldGeometry.ring 圈住半径内的非友方，再按 world.clear 要求通视；近端掉 blindStage 级、
 *       远端只掉一级（最少一级）。目标挂共享的 world_combat:flash_dazzled（身份 world_combat:status/dazzled），
 *       宝可梦再调用 NativeEffects.boost 下降原生命中等级。
 * 反制：躲到墙后、柱子后、拉开到半径之外；光没有飞行时间，靠走位是避不开的。
 */
namespace PokemonSkills {
    function flashAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: flashId,
        cooldownParameter: "recharge",
        name: "闪光",
        description: "自身炸开一团强光，把看得见它的敌人全部晃花：命中下降、攻击变弱。光不走路，走位躲不开，但墙能把它挡住。",
        uses: ["被围住时一次晃开一圈敌人", "在开阔地削弱一整群对手的命中", "给队友创造一轮安全的输出窗口"],
        kind: "self",
        range: 6,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 180,
        style: "light",
        defaults: { form: "wide" },
        fields: [
            choice("form", "光势", ["wide", "tight"], ["散射", "聚光"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[flashId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const tight = config && config.form === "tight";
            return {
                prepare: Math.round(p(flashId, "tempo", context)) + (tight ? 3 : 0),
                recover: p(flashId, "recover", context),
                cooldown: Math.round(p(flashId, "recharge", context) * (tight ? 1.2 : 1)),
                active: 1,
                range: Math.min(10, Math.round(p(flashId, "radius", context) * (tight ? 0.75 : 1.35) * 10) / 10)
            };
        },
        windup: function (action, config, prepare) {
            action.present("flash-windup", flashScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", form: config && config.form === "tight" ? "tight" : "wide" }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[flashId], detail: { values: config } };
            const tight = config && config.form === "tight";
            return { radius: Math.round(p(flashId, "radius", context) * (tight ? 0.75 : 1.35) * 10) / 10,
                geometry: "circle", style: "light", color: 0xFFE9A0, label: tight ? "闪光·聚光" : "闪光·散射" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const tight = !!(config && config.form === "tight");
            const radius = Math.max(2.5, Math.round(p(flashId, "radius", action) * (tight ? 0.75 : 1.35) * 10) / 10);
            const stage = Math.max(1, Math.min(3, Math.round(p(flashId, "blindStage", action)) + (tight ? 1 : 0)));
            const duration = Math.max(60, Math.round(p(flashId, "duration", action) * (tight ? 1.2 : 1)));
            const afterimage = Math.max(16, Math.round(p(flashId, "afterimage", action)));
            const near = radius * 0.55;
            sound(action, "minecraft:block.beacon.activate");
            let caught = 0;
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, radius), function (actor, facts) {
                if (facts.friendly() || String(actor.ref()) === String(self.ref())) return;
                if (!world.clear(origin, facts.position())) return;
                const gap = facts.position().minus(origin).length();
                const landed = Math.max(1, stage - (gap > near ? 1 : 0));
                MobEffects.apply(world, actor, flashEffect, duration, 0);
                NativeEffects.boost(world, actor, "accuracy", -landed);
                const at = world.observe(actor);
                if (at !== null) {
                    WorldFeedback.emit(world, flashScene, 1, at.position(),
                        { moment: "dazzle", target: String(actor.ref()), stage: landed, burst: 26 + landed * 22, afterimage: afterimage }, 34);
                    WorldFeedback.text(world, flashAbove(at.position()), "world_combat.move.flash.text.dazzle", [landed], 36);
                }
                caught++;
            });
            WorldFeedback.emit(world, flashScene, 1, origin,
                { moment: "flare", radius: radius, caught: caught, stage: stage, afterimage: afterimage,
                    sparks: 30 + stage * 20 + caught * 8, scale: radius / 6 }, 30);
            sound(action, "minecraft:entity.firework_rocket.blast");
            done(action);
        }
    });

    // 晃眼存续期间，目标头顶持续散出没缓过来的余光。
    WorldCombat.on("world_combat:move_flash/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== flashEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "flash:" + String(actor.ref()), flashScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
