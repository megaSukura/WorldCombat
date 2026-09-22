/**
 * 铁尾 / irontail 的出手方式。
 *
 * 核心念头：转身把沉甸甸的钢尾抡到头顶，沿锁定的一条线狠狠砸在目标所在的地面上——力大、范围清晰，但抬尾的
 * 动静看得见，对手有时间退出落点。命中 75 就是这段预告：砸不中不是因为瞄偏，而是因为人已经走开。
 *
 * 三幕：
 *   起（charge，提交前 + 抬尾期）：尾巴抡起、钢光聚在尾尖，地面画出即将砸落的线与落点圈。
 *   击（slam）：提交后略一停顿，尾尖砸下；落点圈内的敌人挨一记重击并被顶开，按几率把护甲砸陷（降防）
 *       并挂上砸凹标记。落点圈里没人就是砸空（miss），只留一地碎屑。
 *
 * 与同族分开：碎岩是贴脸连点的快拳，撕裂爪是一记交叉撕甲，暗影之骨是远程骨投；铁尾是慢而重、能被走位躲开的
 * 钢铁下砸。共享身份 world_combat:status/guardbroken 由 startup.ts 声明。
 */
namespace PokemonSkills {
    const irontailScene = "world_combat:move_irontail";
    const irontailMark = "world_combat:irontail_dented";
    const irontailDentText = "world_combat.move.irontail.text.dent";
    const irontailMissText = "world_combat.move.irontail.text.miss";

    define({
        id: "irontail",
        name: "Iron Tail",
        description: "The target is slammed with a steel-hard tail. This may also lower the target's Defense stat.",
        uses: ["把抬尾的预告做成压力", "一记重砸把目标连同落点一起砸开", "对硬目标砸出更深的凹陷"],
        kind: "enemy",
        range: 3.8,
        maxRange: 5.8,
        prepare: 12,
        active: 20,
        recover: 12,
        cooldown: 44,
        style: "slam",
        defaults: { ai: { maxChase: 9, heavyFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("irontail", "impactRadius", pokemon), geometry: "line", style: "slam", color: 0x9FB0C0, label: "铁尾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["irontail"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("irontail", "charge", context))),
                recover: p("irontail", "recover", context),
                cooldown: p("irontail", "cooldown", context),
                range: Math.max(3.8, p("irontail", "tailReach", context) + 0.6)
            };
        },
        windup: function (action, config, prepare) {
            var origin = action.origin(), point = action.targetPosition();
            action.present("world_combat:move_irontail:charge", irontailScene, 1, origin,
                JSON.stringify({ moment: "charge", windup: prepare,
                    point: [point.x(), point.y(), point.z()],
                    path: [[origin.x(), origin.y(), origin.z()], [point.x(), point.y(), point.z()]],
                    direction: [action.direction().x(), action.direction().y(), action.direction().z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const point = action.targetPosition();
            const power = p("irontail", "slam", action);
            const radius = p("irontail", "impactRadius", action);
            const chance = p("irontail", "dentChance", action);
            const stages = Math.max(1, Math.round(p("irontail", "dentStages", action)));
            const markTicks = Math.max(40, Math.round(p("irontail", "dentTicks", action)));
            const push = p("irontail", "push", action);
            const notes = Math.max(14, Math.round(power * 1.4));
            const scale = radius / 1.2;
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.ravager.step");

            action.after(2, function (drop: CombatAction) {
                const world = drop.world();
                const region = WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                    const landed = hurt(drop, victim, "irontail", power, { damage: damageSpec("irontail", "slam"), contact: true });
                    if (!landed) return;
                    hits++;
                    const away = facts.position().minus(point);
                    if (away.length() >= 0.05) world.displace(victim, away.unit().scale(push));
                    if (!world.valid(victim) || world.random() >= chance) return;
                    NativeEffects.boost(world, victim, "def", -stages);
                    if (MobEffects.apply(world, victim, irontailMark, markTicks, 0) === null) return;
                    const body = world.observe(victim);
                    if (body === null) return;
                    WorldFeedback.emit(world, irontailScene, 1, body.position(),
                        { moment: "dent", target: String(victim.ref()), stages: stages, scale: 1 }, 26);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), irontailDentText, [stages], 30);
                    world.sound("cobblemon:impact.steel", body.position(), 14, "{}");
                });
                WorldFeedback.emit(world, irontailScene, 1, point,
                    { moment: "slam", hits: hits, notes: notes, scale: scale,
                        direction: [action.direction().x(), action.direction().y(), action.direction().z()] }, 30);
                sound(drop, "cobblemon:impact.steel");
                sound(drop, "minecraft:block.anvil.land");
                if (hits === 0) {
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), irontailMissText, [], 26);
                    WorldFeedback.emit(world, irontailScene, 1, point, { moment: "miss", scale: scale }, 22);
                }
                finish(drop);
            });
        }
    });
}
