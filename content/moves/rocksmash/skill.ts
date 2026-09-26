/**
 * 碎岩 / rocksmash 的出手方式。
 *
 * 核心念头：贴脸连出几记快拳，拳骨专砸对手正面最硬的地方，收拳时若打实就可能砸出一处缺口，把它的防御压低。
 * 它不是靠单下重，而是靠打得勤、拆得动——是破防四打里最便宜、最快、最常被放出来的一记。
 *
 * 两幕：
 *   起（windup，提交前）：半沉抬手，拳上聚起一层薄土。
 *   击（strike ×jabs → crack）：提交后逐记朝瞄准方向短促出拳，每记各走一次 trace 与接触伤害；整套打完若
 *       有命中，就把破防归给**挨拳最多**的那个人（次数相同取最先命中的），按破防几率对它降防并挂上破防标记，
 *       画面在它身上裂开缺口。一套拳打散多人时，缺口跟着真正挨得最多的人走。
 *       打空、目标先离场都算这一套落空，不降防。
 *
 * 瞄准：kind 为 aim——方向、点或任意阵营实体都能放，不要求提交时存在敌人；命中权限仍由命中层判断。
 * 与同族分开：铁尾是慢而重的钢铁下砸，撕裂爪是一记交叉撕甲，暗影之骨是远程骨投；碎岩是贴脸连点的快拳。
 * 共享身份 world_combat:status/guardbroken 由 startup.ts 声明，别的招式可消费。
 */
namespace PokemonSkills {
    const rocksmashScene = "world_combat:move_rocksmash";
    const rocksmashMark = "world_combat:rocksmash_cracked";
    const rocksmashCrackText = "world_combat.move.rocksmash.text.crack";

    define({
        id: "rocksmash",
        name: "Rock Smash",
        description: "贴脸连出几记快拳，拳骨砸在对手最硬的地方：每记造成少量接触伤害，收拳时若打实，有机会把对手防御砸低一级；出手快、冷却短，适合反复拆防。",
        uses: ["贴脸连打拆防", "用便宜的快拳反复消耗", "先用碎岩砸开缺口，再让重击兑现"],
        kind: "aim",
        range: 3.0,
        maxRange: 3.8,
        prepare: 4,
        active: 22,
        recover: 4,
        cooldown: 26,
        style: "punch",
        defaults: { ai: { maxChase: 7, chipFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rocksmash", "reach", pokemon) * 0.9, geometry: "line", style: "punch", color: 0xC9A06A, label: "碎岩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["rocksmash"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("rocksmash", "prepare", context),
                recover: p("rocksmash", "recover", context),
                cooldown: p("rocksmash", "cooldown", context),
                range: Math.max(3.0, p("rocksmash", "reach", context) * 1.6)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_rocksmash:windup", rocksmashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const reach = p("rocksmash", "reach", action);
            const radius = p("rocksmash", "collisionRadius", action);
            const power = p("rocksmash", "jab", action);
            const jabs = Math.max(2, Math.round(p("rocksmash", "jabs", action)));
            const gap = Math.max(2, Math.round(p("rocksmash", "jabGap", action)));
            const chance = p("rocksmash", "crackChance", action);
            const stages = Math.max(1, Math.round(p("rocksmash", "crackStages", action)));
            const markTicks = Math.max(40, Math.round(p("rocksmash", "markTicks", action)));
            const direction = aim(action);
            const notes = Math.max(8, Math.round(power * 1.2));
            // 整套拳的结果按实际命中次数归属：挨得最多的那个人才是被拆防的人，次数相同取最先命中的。
            const records: { actor: CombatActor; count: number; first: number }[] = [];
            let landed = false, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function noteHit(victim: CombatActor, index: number): void {
                const ref = String(victim.ref());
                for (let i = 0; i < records.length; i++)
                    if (String(records[i].actor.ref()) === ref) { records[i].count++; return; }
                records.push({ actor: victim, count: 1, first: index });
            }
            function mostHit(): CombatActor | null {
                let best: { actor: CombatActor; count: number; first: number } | null = null;
                for (let i = 0; i < records.length; i++) {
                    const entry = records[i];
                    if (best === null || entry.count > best.count || (entry.count === best.count && entry.first < best.first)) best = entry;
                }
                return best === null ? null : best.actor;
            }

            sound(action, "minecraft:entity.player.attack.strong");

            function jab(current: CombatAction, index: number): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const from = body.position();
                const selected = action.target();
                const selectedBody = selected !== null && scope.valid(selected) ? scope.observe(selected) : null;
                const to = selectedBody !== null ? selectedBody.position() : from.plus(direction.scale(reach));
                const hit = current.trace(from, to, radius);
                const point = hit.hitEntity() || hit.blocked() ? hit.position() : to;
                const victim = hit.hitEntity() ? hit.target() : null;
                if (victim !== null && !scope.friendly(victim)
                    && hurt(current, victim, "rocksmash", power, { damage: damageSpec("rocksmash", "jab"), contact: true, punch: true })) {
                    noteHit(victim, index);
                    landed = true;
                }
                // 每拳只画命中点附近的一小段触痕，让画面读成点触而不是一整条拳路。
                const line = point.minus(from), span = line.length();
                const tail = span > 0.75 ? point.minus(line.unit().scale(0.75)) : from;
                WorldFeedback.emit(scope, rocksmashScene, 1, point,
                    { moment: "strike", target: victim ? String(victim.ref()) : "", hit: victim !== null, index: index + 1, jabs: jabs,
                        notes: notes, scale: radius / 0.4, direction: [direction.x(), direction.y(), direction.z()],
                        path: [[tail.x(), tail.y(), tail.z()], [point.x(), point.y(), point.z()]] }, 20);
                sound(current, index + 1 >= jabs ? "minecraft:entity.player.attack.strong" : "minecraft:entity.player.attack.weak");
                const next = index + 1;
                if (next < jabs) { current.after(gap, function (later: CombatAction) { jab(later, next); }); return; }
                current.after(gap, function (later: CombatAction) { settle(later); });
            }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const chosen = mostHit();
                if (landed && chosen !== null && scope.valid(chosen) && scope.random() < chance) {
                    // 只有防御真的被砸低（未被免疫挡下）才留裂纹与标记，画面与实际结果一致。
                    const dropped = NativeEffects.boost(scope, chosen, "def", -stages);
                    if (dropped !== 0 && MobEffects.apply(scope, chosen, rocksmashMark, markTicks, 0) !== null) {
                        const body = scope.observe(chosen);
                        if (body !== null) {
                            WorldFeedback.emit(scope, rocksmashScene, 1, body.position(),
                                { moment: "crack", target: String(chosen.ref()), stages: stages, scale: 1 }, 24);
                            WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), rocksmashCrackText, [stages], 28);
                            sound(current, "minecraft:block.stone.break");
                        }
                    }
                }
                finish(current);
            }

            action.after(1, function (first: CombatAction) { jab(first, 0); });
        }
    });
}
