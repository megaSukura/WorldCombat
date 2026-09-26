/**
 * 冰冻拳 / icepunch 的出手方式。
 *
 * 核心念头：**先把寒气按进目标、再一把握走冻实**——第一拳在目标身上结一层会拖慢它的寒霜（共享身份
 * world_combat:status/chill，本单元自己的载体）；当目标已经带着霜、或它本来就浸在水里时，下一拳会尝试把它冻住
 * （world_combat:status/frozen，宝可梦同步为原生冰冻）。它是本族唯一的控制招：一拳伤害最低，但能把目标按停；
 * 能不能冻住读得出来——看目标身上有没有霜、脚边有没有水。
 *
 * 拳是**自由 3D 短拳**：从身体中心沿瞄准方向伸出 `fistReach`，由 `action.trace` 判首碰（墙与其他身体会挡住，
 * 也可以空拳），不会为了逃开的选定对象自动伸长。冻结**先尝试、再消费**：只有 `CombatStatus.inflict` 真的成功，
 * 才收走这层寒霜；免冻的 Boss 会保留原霜的剩余时间，画面也只给碎霜与抵抗反馈，不假装冻住。
 *
 * 配置 `deepfreeze`（深冻式）由 resolve 改时序、由公式改威力／时长，提交后才触碰世界。
 */
namespace PokemonSkills {
    const icepunchScene = "world_combat:move_icepunch";
    const icepunchChill = "world_combat:icepunch_chill";
    const icepunchHitText = "world_combat.move.icepunch.text.hit";
    const icepunchChillText = "world_combat.move.icepunch.text.chill";
    const icepunchFreezeText = "world_combat.move.icepunch.text.freeze";
    const icepunchImmuneText = "world_combat.move.icepunch.text.immune";
    const icepunchMissText = "world_combat.move.icepunch.text.miss";

    define({
        id: "icepunch",
        cooldownParameter: "recharge",
        name: "Ice Punch",
        description: "一记覆满寒霜的拳沿瞄准方向打出，命中第一个挡在拳程里的目标，给它留下一层拖慢行动的寒霜；若目标已经带霜、或正浸在水里，则先尝试把它冻在原地（浸水时冻得更久），冻结真的成功才收走那层霜。冻结免疫的目标会保留原有的霜，拳伤照样成立。",
        uses: ["贴身给目标结一层拖慢它的寒霜", "对已经结霜或浸水的目标补一拳冻住", "把关键目标按停"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.4,
        prepare: 6,
        active: 16,
        recover: 6,
        cooldown: 24,
        style: "punch",
        defaults: { deepfreeze: false, ai: { maxChase: 6, finishFrozen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("icepunch", "fistReach", pokemon) + 0.3, geometry: "line", style: "ice", color: 0x8FD8F0,
                label: config && config.deepfreeze === true ? "深冻拳" : "冰冻拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["icepunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("icepunch", "tempo", context)),
                recover: Math.round(p("icepunch", "aftercast", context)),
                cooldown: Math.round(p("icepunch", "recharge", context)),
                active: skills["icepunch"].active,
                range: p("icepunch", "fistReach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_icepunch:windup", icepunchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const reach = p("icepunch", "fistReach", action);
            const power = p("icepunch", "frost", action);
            const chillTicks = Math.max(40, Math.round(p("icepunch", "chillTicks", action)));
            const freezeBase = Math.max(20, Math.round(p("icepunch", "freezeTicks", action)));
            const radius = p("icepunch", "collisionRadius", action);
            const shards = Math.max(5, Math.round(p("icepunch", "shards", action)));
            const jab = Math.max(1, Math.round(p("icepunch", "jab", action)));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, icepunchScene, 1, me.position(), { moment: "whiff", shards: shards, intensity: intensity }, 18);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.2, 0)), icepunchMissText, [], 20);
                }
                finish(current);
            }

            /** 命中后决定结霜还是冻结：先尝试合法冻结，成功才收走寒霜；失败保留原霜，只给抵抗反馈。 */
            function settle(current: CombatAction, struck: CombatActor, point: CombatPoint): void {
                const scope = current.world(), body = scope.observe(struck);
                const wet = body !== null && body.wet();
                const chilled = CombatStatus.has(scope, struck, "chill");
                if (!chilled && !wet) {
                    CombatStatus.apply(scope, struck, "chill", icepunchChill, chillTicks, 0, { unique: true });
                    WorldFeedback.emit(scope, icepunchScene, 1, point,
                        { moment: "chill", target: String(struck.ref()), shards: shards, intensity: intensity }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icepunchChillText, [], 22);
                    return;
                }
                const duration = Math.max(20, Math.round(wet ? freezeBase * 1.5 : freezeBase));
                const frozen = CombatStatus.inflict(scope, struck, "frozen", duration);
                if (frozen) {
                    CombatStatus.cure(scope, struck, "chill");
                    const melt = Math.max(1, Math.min(6, Math.round(duration / 60)));
                    WorldFeedback.emit(scope, icepunchScene, 1, point,
                        { moment: "freeze", target: String(struck.ref()), shards: shards, intensity: intensity, floor: wet ? 18 : 8, melt: melt }, 26);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icepunchFreezeText, [], 24);
                    sound(current, "minecraft:block.glass.break");
                    sound(current, "minecraft:entity.player.hurt_freeze");
                } else {
                    // 免冻：不消费本招的寒霜，画面只给碎霜与抵抗，不假装冻结。
                    WorldFeedback.emit(scope, icepunchScene, 1, point,
                        { moment: "resist", target: String(struck.ref()), shards: shards, intensity: intensity }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icepunchImmuneText, [], 24);
                }
            }

            function strike(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me === null) { whiff(current); return; }
                const direction = aim(current);
                const from = me.position(), to = from.plus(direction.scale(reach));
                const contact = current.trace(from, to, radius, true);
                if (!contact.hitEntity()) { whiff(current); return; }
                const struck = contact.target();
                if (struck === null || String(struck.ref()) === String(actor.ref()) || scope.friendly(struck)) { whiff(current); return; }
                const point = contact.position();
                sound(current, "minecraft:block.powder_snow.break");
                WorldFeedback.emit(scope, icepunchScene, 1, point,
                    { moment: "hit", target: String(struck.ref()), shards: shards, intensity: intensity }, 22);
                const landed = impact(current, contact, "icepunch", power,
                    { damage: damageSpec("icepunch", "frost"), contact: true, punch: true });
                if (landed && scope.valid(struck)) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), icepunchHitText, [], 22);
                    sound(current, "cobblemon:impact.ice");
                    settle(current, struck, point);
                }
                finish(current);
            }

            if (jab > 0) action.after(jab, function (later: CombatAction) { strike(later); });
            else strike(action);
        }
    });
}
