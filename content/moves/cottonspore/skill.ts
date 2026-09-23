/**
 * 棉孢子 / Cotton Spore — 执行组织。
 *
 * 核心念头：当场鼓开一团棉絮，孢子以自身为圆心扑向四周，黏住附近每一个人。它不要瞄准、不飞，
 *   所以想让它成立，必须自己走进人群——贴上去才是这招的代价，走开则是它的反制。
 *
 * 出手：短起手（windup 在身周鼓起棉絮）后提交，以自身为圆心炸开。
 * 命中：WorldGeometry.selectEnemies 取半径内的非友方，逐个挂共享的 world_combat:cotton_clung
 *       （身份 world_combat:status/cottoned），并 NativeEffects.boost 大幅下降速度；按 maxTargets 上限。
 * 反制：只作用于贴近的人，远远看到就散开即可；不造成伤害，也不阻止对方离场。
 */
namespace PokemonSkills {
    function cottonsporeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: cottonsporeId,
        cooldownParameter: "recharge",
        name: "棉孢子",
        description: "当场鼓开一团棉絮，孢子扑向四周，黏住附近所有敌人，大幅降低它们的速度。必须贴近才有效，因此要自己走进人群。",
        uses: ["一次拖住围上来的一群近战", "在被围住时开出一条退路", "打断对方的贴身追击"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 100,
        style: "cotton",
        defaults: { spread: false },
        fields: [
            flag("spread", "爆发")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[cottonsporeId], detail: { values: config }, world, actor, attributes };
            const burst = !!(config && config.spread);
            return {
                prepare: Math.round(p(cottonsporeId, "tempo", context)),
                recover: p(cottonsporeId, "recover", context),
                cooldown: Math.round(p(cottonsporeId, "recharge", context) * (burst ? 0.9 : 1.15)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("cottonspore-windup", cottonsporeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", spread: config && config.spread ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 3.0, geometry: "circle", style: "cotton", label: "棉孢子" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const radius = Math.max(1.6, Math.min(4.5, p(cottonsporeId, "burstRadius", action)));
            const drop = Math.max(1, Math.min(3, Math.round(p(cottonsporeId, "speedDrop", action))));
            const cling = Math.max(60, Math.round(p(cottonsporeId, "clingTicks", action)));
            const cap = Math.max(1, Math.round(p(cottonsporeId, "maxTargets", action)));
            const spores = Math.max(6, Math.round(p(cottonsporeId, "spores", action)));
            sound(action, "cobblemon:move.powder.actor");
            let caught = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(origin, 0, radius), function (actor) {
                if (caught >= cap) return;
                MobEffects.apply(world, actor, cottonsporeEffect, cling, 0);
                NativeEffects.boost(world, actor, "spe", -drop);
                caught++;
                const at = world.observe(actor);
                if (at === null) return;
                WorldFeedback.emit(world, cottonsporeScene, 1, at.position(),
                    { moment: "clung", target: String(actor.ref()), drop: drop, tufts: 6 + drop * 6 }, 26);
                WorldFeedback.text(world, cottonsporeAbove(at.position()), "world_combat.move.cottonspore.text.clung", [drop], 34);
            });
            WorldFeedback.emit(world, cottonsporeScene, 1, origin,
                { moment: "burst", radius: radius, caught: caught, drop: drop, spores: spores, scale: radius / 3.0 }, 34);
            done(action);
        }
    });

    // 棉絮黏着期间，目标身上持续飘着细小的棉绒。
    WorldCombat.on("world_combat:move_cottonspore/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cottonsporeEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "cottonspore:" + String(actor.ref()), cottonsporeScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
