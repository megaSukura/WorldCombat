/**
 * 泪眼汪汪 / Tearful Look — 执行组织。
 *
 * 核心念头：把自己的伤摆到对手眼前。眼圈一红，对方下不去手——所以这招的威力来自施法者自己掉的血，
 *   满血时几乎只是挠痒，残血时能一口气垮掉对方的物攻与特攻。眼泪要被看见，因此需要通视。
 *
 * 出手：windup 在眼角聚起泪光后提交；含泪只盯一个看得见的目标，放声大哭朝面前张成一片扇形。
 * 命中：目标挂共享的 world_combat:disheartened_tears（身份 world_combat:status/disheartened），
 *       再 NativeEffects.boost 同时下降攻击与特攻；宝可梦损失原生等级，其他生物把两项折进攻击属性。
 * 通视：眼泪要被看见，视线被挡就落空（不结算）。
 * 反制：躲到掩体后、或者干脆背对；施法者满血时降幅很小，先手打满它再逼它示弱。
 */
namespace PokemonSkills {
    function tearfullookAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 让一个人看见眼泪：挂身份、扣攻击与特攻、播命中表现与浮字。 */
    function tearfullookMourn(world: CombatWorld, target: CombatActor, despair: number, linger: number, tears: number): void {
        MobEffects.apply(world, target, tearfullookEffect, linger, 0);
        NativeEffects.boost(world, target, "atk", -despair);
        NativeEffects.boost(world, target, "spa", -despair);
        const at = world.observe(target);
        if (at === null) return;
        WorldFeedback.emit(world, tearfullookScene, 1, at.position(),
            { moment: "tears", target: String(target.ref()), despair: despair, tears: tears }, 30);
        WorldFeedback.text(world, tearfullookAbove(at.position()), "world_combat.move.tearfullook.text.tears", [despair], 40);
    }

    define({
        id: tearfullookId,
        cooldownParameter: "recharge",
        name: "泪眼汪汪",
        description: "眼圈一红，让对手丧失斗志，同时降低它的攻击和特攻。威力来自施法者自己掉的血：越接近见底，夺走的斗志越多。眼泪要被看见才成立。放声大哭能把面前扇形里的人都卷进来，但起手更慢。",
        uses: ["残血时反手削掉对方的物攻与特攻", "在被围时用哭声同时压住正面的几个敌人", "给撤退争取一段对方下不去手的时间"],
        kind: "enemy",
        range: 5,
        maxRange: 8,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "tears",
        defaults: { sob: false },
        fields: [
            flag("sob", "放声大哭")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tearfullookId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(tearfullookId, "tempo", context)),
                recover: p(tearfullookId, "recover", context),
                cooldown: Math.round(p(tearfullookId, "recharge", context)),
                active: 1,
                range: p(tearfullookId, "tearRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("tearfullook-windup", tearfullookScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", sob: config && config.sob ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const sob = !!(config && config.sob);
            return { radius: sob ? 4 : 5, geometry: sob ? "area" : "line", style: "tears", color: 0x7FB3E0,
                label: sob ? "泪眼汪汪·放声大哭" : "泪眼汪汪" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const despair = Math.max(1, Math.min(2, Math.round(p(tearfullookId, "despair", action))));
            const linger = Math.max(50, Math.round(p(tearfullookId, "lingerTicks", action)));
            const tears = Math.max(8, Math.round(p(tearfullookId, "tears", action)));
            const sob = !!(config && config.sob);
            sound(action, "minecraft:entity.fox.hurt");
            if (sob) {
                const radius = Math.max(2.0, p(tearfullookId, "sobRadius", action));
                const angle = Math.max(50, p(tearfullookId, "sectorAngle", action));
                let caught = 0;
                WorldGeometry.select(world, WorldGeometry.sector(origin, aim(action), radius, angle), function (actor, facts) {
                    if (facts.friendly() || !facts.visible()) return;
                    tearfullookMourn(world, actor, despair, linger, tears);
                    caught++;
                });
                world.sound("minecraft:entity.generic.splash", origin, 16, "{}");
                WorldFeedback.emit(world, tearfullookScene, 1, origin,
                    { moment: "sob", radius: radius, caught: caught, despair: despair, tears: tears,
                        scale: radius / 3.0, direction: [aim(action).x(), aim(action).y(), aim(action).z()] }, 34);
                if (caught > 0)
                    WorldFeedback.text(world, tearfullookAbove(origin), "world_combat.move.tearfullook.text.sob", [caught, despair], 40);
                done(action);
                return;
            }
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, tearfullookScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                // 眼泪被掩体挡住：对方看不到，落空。
                WorldFeedback.emit(world, tearfullookScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                done(action);
                return;
            }
            tearfullookMourn(world, target, despair, linger, tears);
            world.sound("minecraft:entity.generic.splash", point, 14, "{}");
            done(action);
        }
    });

    // 失落期间，目标头顶持续落下零星的泪滴。
    WorldCombat.on("world_combat:move_tearfullook/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tearfullookEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "tearfullook:" + String(actor.ref()), tearfullookScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
