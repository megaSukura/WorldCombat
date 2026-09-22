/**
 * 冰冻拳 / icepunch 的出手方式。
 *
 * 核心念头：**先把寒气按进目标、再一把握走冻实**——第一拳在目标身上结一层会拖慢它的寒霜（共享身份
 * world_combat:status/chill，本单元自己的载体）；当目标已经带着霜、或它本来就浸在水里时，下一拳会收走那层霜，
 * 把它冻在原地（world_combat:status/frozen，宝可梦同步为原生冰冻）。它是本族唯一的控制招：一拳伤害最低，
 * 但能把目标按停；能不能冻住读得出来——看目标身上有没有霜、脚边有没有水。
 *
 * 三幕：
 *   起（windup，提交前）：拳面凝起寒霜、地面结一圈霜，只播预告。
 *   击（jab → hit）：提交后凝霜 `jab` 刻，朝目标冲拳；命中结算 frost 接触+拳伤害。
 *   结（chill / freeze）：目标已带寒霜或浸水 → 收走寒霜并冻结（浸水时长 ×1.5）；否则只留下一层寒霜。
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
        name: "Ice Punch",
        description: "A frost-covered fist strikes the target and leaves it chilled. If the target is already chilled, or standing in water, the frost is pulled away and the target is frozen solid instead.",
        uses: ["贴身给目标结一层拖慢它的寒霜", "对已经结霜或浸水的目标补一拳冻住", "把关键目标按停"],
        kind: "enemy",
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
                JSON.stringify({ moment: "charge", deepfreeze: config && config.deepfreeze === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const power = p("icepunch", "frost", action);
            const chillTicks = Math.max(40, Math.round(p("icepunch", "chillTicks", action)));
            const freezeBase = Math.max(20, Math.round(p("icepunch", "freezeTicks", action)));
            const radius = p("icepunch", "collisionRadius", action);
            const shards = Math.max(5, Math.round(p("icepunch", "shards", action)));
            const jab = Math.max(1, Math.round(p("icepunch", "jab", action)));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function victim(scope: CombatWorld): CombatActor | null { const value = targetRef === "" ? null : scope.actor(targetRef); return value !== null && scope.valid(value) ? value : null; }

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, icepunchScene, 1, me.position(), { moment: "whiff", shards: shards, intensity: intensity }, 18);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.2, 0)), icepunchMissText, [], 20);
                }
                finish(current);
            }

            /** 命中后决定结霜还是冻结：已带寒霜、或浸在水里 → 收走寒霜并冻住；否则留下一层寒霜。 */
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
                CombatStatus.cure(scope, struck, "chill");
                const duration = Math.max(20, Math.round(wet ? freezeBase * 1.5 : freezeBase));
                const frozen = CombatStatus.inflict(scope, struck, "frozen", duration);
                WorldFeedback.emit(scope, icepunchScene, 1, point,
                    { moment: "freeze", target: String(struck.ref()), shards: shards, intensity: intensity, wet: wet ? 1 : 0 }, 26);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), frozen ? icepunchFreezeText : icepunchImmuneText, [], 24);
                if (frozen) {
                    sound(current, "minecraft:block.glass.break");
                    sound(current, "minecraft:entity.player.hurt_freeze");
                }
            }

            function strike(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null || body === null) { whiff(current); return; }
                const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                const forward = WorldCombat.point(dx / distance, 0, dz / distance);
                const hit = current.trace(me.position(), me.position().plus(forward.scale(Math.min(4.2, distance + 0.7))), radius);
                if (!hit.hitEntity()) { whiff(current); return; }
                const struck = hit.target(), point = hit.position();
                sound(current, "minecraft:block.powder_snow.break");
                WorldFeedback.emit(scope, icepunchScene, 1, point,
                    { moment: "hit", target: struck !== null ? String(struck.ref()) : "", shards: shards, intensity: intensity }, 22);
                const landed = impact(current, hit, "icepunch", power,
                    { damage: damageSpec("icepunch", "frost"), contact: true, punch: true });
                if (landed && struck !== null && scope.valid(struck)) {
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
