/**
 * 毒击 / poisonjab —— 出手方式。
 *
 * 核心念头：一记**把带毒的肢体送出去的深刺**。施法者站定，把手臂或触手沿直线递到 `reach` 那么远，
 *   够长的肢体决定它相对同族的位置——比毒针近，比蹭蹭脸颊远。刺中后在伤口里留下毒，并把对手顶开一点；
 *   刺空就是彻底的空。
 *
 * 幕：
 *   起（windup，提交前）：肢体盘起、毒滴在末端聚集的预告（`action.present`，可被打断、不花 PP）。
 *   刺（thrust）：提交后 `action.trace` 沿直线做权威判定，直线上的第一个非友方被扎中；画面留一条毒绿延长线。
 *   中（sting / whiff）：结算 `jab` 物理伤害、按概率施加共享中毒身份并顶开目标；只碰到墙或没人则播落空。
 *
 * 与同族分开：毒针是飞出去的小针、双针是一记两下、臂贝武器是重炮；只有毒击是**不出身体、只出肢体**的一记
 *   近身延长重刺，反制方式是退出它的出臂距离、侧身站开，或把别的身体挡在线上。
 *
 * 自由瞄准：`kind: "aim"` 可对任何阵营实体、方块或世界里一个点出刺；空刺合法，刺中谁由真实 trace 的**首碰**决定，
 *   前排的身体（哪怕友方）会先挡下这一记，不能隔着它去扎后排。
 */
namespace PokemonSkills {
    const poisonjabScene = "world_combat:move_poisonjab";
    const poisonjabHitText = "world_combat.move.poisonjab.text.hit";
    const poisonjabVenomText = "world_combat.move.poisonjab.text.venom";
    const poisonjabImmuneText = "world_combat.move.poisonjab.text.immune";
    const poisonjabWhiffText = "world_combat.move.poisonjab.text.whiff";

    define({
        id: "poisonjab",
        cooldownParameter: "recharge",
        name: "Poison Jab",
        description: "站定把带毒的肢体沿直线递向瞄准的对手：物理重击，按概率在伤口里留下毒，并把它顶开一点。深刺式更狠，代价是够得更近、起手更慢。",
        uses: ["近身延长的一记重刺", "把靠近的目标扎毒并顶开", "在对手出手前先手压制"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.2,
        prepare: 8,
        active: 2,
        recover: 8,
        cooldown: 18,
        style: "venom",
        defaults: { deep: false, ai: { maxChase: 9, seekUnpoisoned: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["poisonjab"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("poisonjab", "tempo", context)),
                recover: Math.round(p("poisonjab", "settle", context)),
                cooldown: Math.round(p("poisonjab", "recharge", context)),
                active: 2,
                range: p("poisonjab", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const drops = Math.max(4, Math.round(p("poisonjab", "drops", action)));
            action.present("poisonjab:coil:" + action.id(), poisonjabScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, drops: drops, deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["poisonjab"], detail: { values: config } };
            return { radius: p("poisonjab", "reach", context), geometry: "line", style: "venom", color: 0x9BE86B,
                label: config && config.deep === true ? "毒击·深刺" : "毒击" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            let heading = action.targetPosition().minus(origin);
            if (heading.length() < 0.01) heading = action.direction();
            const direction = heading.length() < 0.01 ? WorldCombat.point(0, 0, 1) : heading.unit();
            const reach = Math.max(0.5, p("poisonjab", "reach", action));
            const radius = p("poisonjab", "touchReach", action);
            const power = p("poisonjab", "jab", action);
            const chance = p("poisonjab", "poisonChance", action);
            const venomTicks = Math.max(40, Math.round(p("poisonjab", "venomTicks", action)));
            const push = p("poisonjab", "push", action);
            const drops = Math.max(6, Math.round(p("poisonjab", "drops", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.95));
            const intensity = Math.max(0.6, Math.min(2, power / 80));
            const end = origin.plus(direction.scale(reach));
            const swing = Math.max(3, Math.round(8 + power * 0.1));

            // 判定与画面同源：肢体沿这条 3D 直线递出去，首碰（实体或墙）就是它真正停在的地方，友方身体也会先挡下。
            const hit = action.trace(origin, end, radius, true);
            const victim = hit.hitEntity() ? hit.target() : null;
            const contact = hit.position();
            const span = Math.max(0.4, Math.min(reach, contact.minus(origin).length()));

            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, poisonjabScene, 1, origin,
                { moment: "thrust", drops: drops, swing: swing, scale: scale, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()], reach: span }, 20);

            if (victim !== null && !world.friendly(victim)) {
                const dealt = hurt(action, victim, "poisonjab", power,
                    { damage: damageSpec("poisonjab", "jab"), contact: true });
                if (dealt) {
                    // 伤害成功才推、才播毒；被拒绝时不推动也不声称中毒。
                    world.hitDisplace(victim, direction.scale(push));
                    let poisoned = false;
                    if (world.valid(victim) && world.random() < chance)
                        poisoned = CombatStatus.inflict(world, victim, "poison", venomTicks, 0, { secondary: true });
                    const wound = world.valid(victim) ? world.observe(victim) : null;
                    const at = wound === null ? contact : wound.position();
                    WorldFeedback.emit(world, poisonjabScene, 1, at,
                        { moment: "sting", target: String(victim.ref()), drops: drops, swing: swing,
                            scale: scale, intensity: intensity }, 24);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)),
                        poisoned ? poisonjabVenomText : poisonjabHitText, [], 24);
                    if (poisoned) world.sound("cobblemon:impact.poison", at, 14, "{}");
                } else {
                    WorldFeedback.emit(world, poisonjabScene, 1, contact,
                        { moment: "whiff", drops: Math.round(drops * 0.5), swing: swing, scale: scale }, 20);
                    WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 1.0, 0)), poisonjabImmuneText, [], 22);
                }
                done(action);
                return;
            }

            // 首碰是墙、身体挡住的是友方、或整条线是空的：只收回肢体。
            WorldFeedback.emit(world, poisonjabScene, 1, contact,
                { moment: "whiff", drops: Math.round(drops * 0.4), swing: swing, scale: scale }, 18);
            WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 0.6, 0)), poisonjabWhiffText, [], 20);
            done(action);
        }
    });
}
