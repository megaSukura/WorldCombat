/**
 * 泪眼汪汪 / Tearful Look — 执行组织。
 *
 * 核心念头：把自己的伤摆到对手眼前。眼圈一红，对方下不去手——所以这招的威力来自施法者自己掉的血，
 *   满血时几乎只是挠痒，残血时能一口气垮掉对方的物攻与特攻。眼泪要被看见，因此需要通视。
 *
 * 出手：windup 在眼角聚起泪光后提交；含泪只盯一个看得见的目标，放声大哭朝面前张成一片扇形。
 * 命中：目标挂共享的 world_combat:disheartened_tears（身份 world_combat:status/disheartened），
 *       再用 NativeEffects.boostWindow 同时下降攻击与特攻，并把这份下降绑在该载体上；标记结束、被驱散或
 *       同源重施刷新时，贡献随之收回或换成最新档位。宝可梦走原生等级，其他生物折进攻击属性。
 * 档位：普通档 1 级；自身生命不高于 35% 时才用危机档 2 级——「越接近见底越强」落在这一道明确门槛上。
 * 命中回执真实：降不动（免疫或到下限）时不挂标记、不报成功；释放时复核当前距离与通视。
 * 通视：眼泪要被看见，视线被挡就落空（不结算）。
 * 反制：躲到掩体后、或者干脆背对；施法者满血时降幅很小，先手打满它再逼它示弱。
 */
namespace PokemonSkills {
    function tearfullookAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 本招贡献的身份；同源重施时用它识别并结束上一窗口。 */
    const tearfullookContribution = "world_combat:move/tearfullook";

    /** 结束同一来源留下的旧下降窗口：同源重施把贡献刷新成最新档位，而不是叠加。 */
    function tearfullookClear(world: CombatWorld, target: CombatActor): void {
        const definition = String(target.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
        world.effects(target, definition).forEach(function (view) {
            try {
                const data = JSON.parse(String(view.data()));
                if (data.source === tearfullookContribution) NativeEffects.windowClose(world, view.id());
            } catch (error) { /* not this unit's window */ }
        });
    }

    /** 让一个人看见眼泪：挂身份、按有界窗口降攻击与特攻、播命中表现与浮字；没真正降下去就不报成功。 */
    function tearfullookMourn(world: CombatWorld, target: CombatActor, despair: number, linger: number, tears: number): boolean {
        tearfullookClear(world, target);
        const carrier = MobEffects.apply(world, target, tearfullookEffect, linger, 0);
        if (carrier === null) return false;
        const before = NativeEffects.effectiveStages(world, target);
        // 下降绑在「丧失斗志」载体上：窗口存在才降，标记结束、被驱散或刷新替换时这份贡献随之收回。
        const window = NativeEffects.boostWindow(world, target, { atk: -despair, spa: -despair }, linger,
            tearfullookContribution, carrier);
        const after = NativeEffects.effectiveStages(world, target);
        const lost = Math.max((before.atk || 0) - (after.atk || 0), (before.spa || 0) - (after.spa || 0));
        // 降不动（免疫、已到下限）时不留一个没有收益的标记，也不报一次假成功。
        if (!window || lost <= 0) {
            if (window) NativeEffects.windowClose(world, window);
            world.removeMobEffect(target, tearfullookEffect, carrier.key());
            return false;
        }
        const at = world.observe(target);
        if (at === null) return true;
        const ref = String(target.ref());
        WorldFeedback.emit(world, tearfullookScene, 1, at.position(),
            { moment: "tears", target: ref, despair: lost, tears: tears }, 30);
        WorldFeedback.text(world, tearfullookAbove(at.position()), "world_combat.move.tearfullook.text.tears", [lost], 40);
        // 目标身上的余韵绑在这次真正的下降窗口上：窗口走完或被清除时表现一起收，不留驱散后的残影。
        WorldFeedback.onEffect(world, window, "tearfullook:linger:" + ref, tearfullookScene, 1, at.position(),
            { moment: "linger", target: ref });
        return true;
    }

    define({
        id: tearfullookId,
        cooldownParameter: "recharge",
        name: "泪眼汪汪",
        description: "眼圈一红，让对手丧失斗志，同时降低它的攻击和特攻；这份下降绑在「丧失斗志」标记上，标记结束或被驱散时收回。含泪示弱需要通视与距离；放声大哭则席卷面前扇形内可见的非友方，但起手更慢。自身生命不高于 35% 时才是 2 级的危机档。",
        uses: ["残血时反手削掉对方的物攻与特攻", "被围时用哭声同时压住正面的几个敌人", "给撤退争取一段对方下不去手的时间"],
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
        indicator: function (config, pokemon) {
            const sob = !!(config && config.sob);
            const context: NumberContext = { pokemon: pokemon!, skill: skills[tearfullookId], detail: { values: config } };
            const radius = pokemon ? p(tearfullookId, sob ? "sobRadius" : "tearRange", context) : sob ? 3 : 5;
            return { radius: radius, geometry: sob ? "area" : "line", style: "tears", color: 0x7FB3E0,
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
                const heading = aim(action);
                let caught = 0;
                // 判定与画面共用同一片真实扇形：身体箱与扇面相交、且与施法者之间没有实墙的可见非友方才被卷入。
                const region = WorldGeometry.bodySector(origin, heading, radius, angle, { below: 1.5, above: 2.5 });
                WorldGeometry.selectBodies(world, region, function (actor, facts) {
                    if (facts.friendly() || !facts.visible()) return;
                    if (!world.clear(origin, facts.position())) return;
                    if (tearfullookMourn(world, actor, despair, linger, tears)) caught++;
                });
                world.sound("minecraft:entity.generic.splash", origin, 16, "{}");
                WorldFeedback.emit(world, tearfullookScene, 1, origin,
                    { moment: "sob", radius: radius, angle: angle, caught: caught, despair: despair, tears: tears,
                        direction: [heading.x(), heading.y(), heading.z()] }, 34);
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
            // 释放时复核当前距离：起手后目标跑出泪眼距离就落空。
            if (point.minus(origin).length() > action.range()) {
                WorldFeedback.emit(world, tearfullookScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 16);
                done(action);
                return;
            }
            if (!world.clear(origin, point)) {
                // 眼泪被掩体挡住：对方看不到，落空。
                WorldFeedback.emit(world, tearfullookScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                done(action);
                return;
            }
            if (tearfullookMourn(world, target, despair, linger, tears))
                world.sound("minecraft:entity.generic.splash", point, 14, "{}");
            done(action);
        }
    });
}
