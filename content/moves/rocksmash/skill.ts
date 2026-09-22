/**
 * 碎岩 / rocksmash 的出手方式。
 *
 * 核心念头：贴脸连出几记快拳，拳骨专砸对手正面最硬的地方，收拳时若打实就可能砸出一处缺口，把它的防御压低。
 * 它不是靠单下重，而是靠打得勤、拆得动——是破防四打里最便宜、最快、最常被放出来的一记。
 *
 * 两幕：
 *   起（windup，提交前）：半沉抬手，拳上聚起一层薄土。
 *   击（strike ×jabs → crack）：提交后逐记沿瞄准方向短促出拳，每记各走一次 trace 与接触伤害；整套打完若
 *       有一记打实，按破防几率对最后命中的人降防并挂上破防标记，画面在目标身上裂开缺口。
 *       打空、目标先离场都算这一套落空，不降防。
 *
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
        description: "The user attacks with a punch. This may also lower the target's Defense stat.",
        uses: ["贴脸连打拆防", "用便宜的快拳反复消耗", "先用碎岩砸开缺口，再让重击兑现"],
        kind: "enemy",
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
            let lastHit: CombatActor | null = null, landed = false, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

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
                    lastHit = victim;
                    landed = true;
                }
                WorldFeedback.emit(scope, rocksmashScene, 1, point,
                    { moment: "strike", target: victim ? String(victim.ref()) : "", hit: victim !== null, index: index + 1, jabs: jabs,
                        notes: notes, scale: radius / 0.4, direction: [direction.x(), direction.y(), direction.z()],
                        path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 20);
                sound(current, index + 1 >= jabs ? "minecraft:entity.player.attack.strong" : "minecraft:entity.player.attack.weak");
                const next = index + 1;
                if (next < jabs) { current.after(gap, function (later: CombatAction) { jab(later, next); }); return; }
                current.after(gap, function (later: CombatAction) { settle(later); });
            }

            function settle(current: CombatAction): void {
                const scope = current.world();
                if (landed && lastHit !== null && scope.valid(lastHit) && scope.random() < chance) {
                    NativeEffects.boost(scope, lastHit, "def", -stages);
                    if (MobEffects.apply(scope, lastHit, rocksmashMark, markTicks, 0) !== null) {
                        const body = scope.observe(lastHit);
                        if (body !== null) {
                            WorldFeedback.emit(scope, rocksmashScene, 1, body.position(),
                                { moment: "crack", target: String(lastHit.ref()), stages: stages, scale: 1 }, 24);
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
