/**
 * 三连踢 / triplekick 的出手方式。
 *
 * 核心念头：正面站定，朝释放时锁定的方向一脚接一脚地直踢——每一脚独立掷命中，取一段真实短距离的三维首碰：
 * 第一个挡在踢线上的敌体吃一记，撞墙或踢空就停。它的身份是「直、快、准」：与三旋击的分别在于三连踢不转身、
 * 不滑步、只把脚沿同一条释放方向前后弹出。
 *
 * 三拍：
 *   起（windup，提交前）：重心下沉，脚边尘土扬起，正对释放方向。
 *   踢（kick，提交后）：站定不动，每脚从身体中心沿**释放时锁定的方向**伸出 `reach` 长、`halfWidth` 粗的一条短三维线，
 *       取真实首碰：第一个非友方敌体各吃一记 `kick`（第 n 脚威力 = kick × (1 + ramp × 已踢脚数)）；
 *       命中把人顶开——前两脚只轻推总推力 push 的四分之一，最后一脚补足余量，整串总推力维持 push。
 *       脚落空（掷空、线首碰是墙、或伤害被拒）这串就停，停在真实位置，不隔空追击。
 *   收（whiff / done）：脚回站姿。
 *
 * 与同族分开：三旋击是原地旋身、宽弧横扫、每脚更重够得更远；三连踢是**定身、直线、贴地快而准**的三脚直踢，
 * 靠推力节奏把最后一脚的分量单独做出来。
 */
namespace PokemonSkills {
    define({
        id: triplekickId,
        cooldownParameter: "recharge",
        name: "Triple Kick",
        description: "正面站定，朝释放时锁定的方向一脚接一脚地直踢：每一脚独立掷命中、取真正的短距离首碰，第 n 脚威力递增，任一脚落空这串就停。前两脚只是轻点、把目标留在踢线上，最后一脚才把整串的推力一次送出。",
        uses: ["朝前直线连踢三脚", "每中一脚，下一脚更重", "最后一脚把目标一次踢开"],
        kind: "aim",
        range: 2.3,
        maxRange: 3.6,
        prepare: 5,
        active: 0,
        recover: 5,
        cooldown: 24,
        maximumTicks: 140,
        style: "kick",
        defaults: { drive: false, ai: { maxChase: 4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(triplekickId, "reach", pokemon), geometry: "line", style: "kick", color: 0xE8B87A,
                label: config && config.drive === true ? "抽射三连踢" : "快踢三连踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[triplekickId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(triplekickId, "tempo", context)),
                recover: Math.round(p(triplekickId, "recover", context)),
                cooldown: Math.round(p(triplekickId, "recharge", context)),
                active: skills[triplekickId].active,
                range: p(triplekickId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_triplekick:windup", triplekickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", drive: config && config.drive === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const kick = p(triplekickId, "kick", action);
            const kicks = Math.max(1, Math.round(p(triplekickId, "kicks", action)));
            const ramp = p(triplekickId, "ramp", action);
            const reach = p(triplekickId, "reach", action);
            const halfWidth = p(triplekickId, "halfWidth", action);
            const gap = Math.max(1, Math.round(p(triplekickId, "gap", action)));
            const accuracy = p(triplekickId, "accuracy", action);
            const push = p(triplekickId, "push", action);
            const sparks = Math.max(6, Math.round(p(triplekickId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(2.4, halfWidth / 0.4));
            // 整串总推力维持标称 push：前两脚各只出四分之一，最后一脚补足余量（原来误乘脚数，整串实为 3×）。
            const lightPush = push * 0.25;
            const lastPush = Math.max(0, push - lightPush * (kicks - 1));
            const up = WorldCombat.point(0, 1.1, 0);
            const selfRef = String(actor.ref());
            const scene = WorldFeedback.actionScenes(triplekickScene);
            // 释放时锁定的瞄准方向：三脚之间身体原地不滑不跳，只沿同一条线前后弹出。
            const locked = (function (): CombatPoint {
                try {
                    const delta = action.targetPosition().minus(self.position());
                    if (delta.length() >= 0.05) return delta.unit();
                } catch (error) { }
                const direction = action.direction();
                return direction.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : direction.unit();
            })();
            // 序列结束前留一小段，让最后一脚的主踢生命周期至少跑出可见帧再收势。
            const kickTail = 6;
            let index = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scene.finish(current, done);
            }

            function step(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null || index >= kicks) { finish(current); return; }
                current.stopMovement();
                const origin = body.position();
                const heading = locked;
                current.face(origin.plus(heading), 24, 24);
                const power = kick * (1 + ramp * index);
                const intensity = Math.max(0.6, Math.min(2.4, power / 12));
                const from = origin;
                const to = origin.plus(heading.scale(reach));
                // 先取真实首碰，脚路截到实际接触处，而不是画到满射程。
                const contact = current.trace(from, to, Math.max(0.24, halfWidth));
                const stop = contact.position();
                const path = [[from.x(), from.y(), from.z()], [stop.x(), stop.y(), stop.z()]];
                const foot = Math.max(0.18, Math.min(0.5, 0.24 + index * 0.07));
                const key = "kick:" + (index + 1);
                scene.show(current, key, stop,
                    { moment: "kick", path: path, direction: [heading.x(), heading.y(), heading.z()],
                        index: index, kicks: kicks, reach: Math.round(reach * 10) / 10, power: Math.round(power * 10) / 10,
                        sparks: sparks, foot: Math.round(foot * 100) / 100, scale: scale, intensity: intensity });

                // 每脚独立掷命中：掷空这串就停，停在真实位置。
                if (scope.random() >= accuracy) {
                    WorldFeedback.emit(scope, triplekickScene, 1, stop,
                        { moment: "whiff", path: path, index: index, kicks: kicks, scale: scale, sparks: Math.round(sparks * 0.5) }, 16);
                    WorldFeedback.text(scope, from.plus(up), triplekickMissText, [index + 1], 22);
                    current.after(kickTail, finish);
                    return;
                }

                const victim = contact.hitEntity() ? contact.target() : null;
                if (victim !== null && String(victim.ref()) !== selfRef && scope.valid(victim) && !scope.friendly(victim)) {
                    const landed = hurt(current, victim, triplekickId, power, { damage: damageSpec(triplekickId, "kick") });
                    if (landed) {
                        const body2 = scope.observe(victim);
                        const at = body2 === null ? contact.position() : body2.position();
                        if (scope.valid(victim)) {
                            const shove = index >= kicks - 1 ? lastPush : lightPush;
                            if (shove > 0) scope.hitDisplace(victim, WorldGeometry.flatUnit(heading, WorldCombat.point(0, 0, 1)).scale(shove));
                        }
                        WorldFeedback.emit(scope, triplekickScene, 1, at,
                            { moment: "hit", target: String(victim.ref()), path: path, direction: [heading.x(), heading.y(), heading.z()],
                                index: index, kicks: kicks, power: Math.round(power * 10) / 10, sparks: sparks,
                                foot: Math.round(foot * 100) / 100, scale: scale, intensity: intensity }, 20);
                        WorldFeedback.text(scope, from.plus(up), triplekickRiseText, [index + 1, Math.round(power)], 22);
                        sound(current, "minecraft:entity.player.attack.weak");
                        index++;
                        if (index >= kicks) { current.after(kickTail, finish); return; }
                        current.after(gap, step);
                        return;
                    }
                }

                // 踢线首碰是墙、什么也没碰到，或伤害被拒：停在真实位置，不隔空追击后方。
                WorldFeedback.emit(scope, triplekickScene, 1, stop,
                    { moment: "whiff", path: path, index: index, kicks: kicks, scale: scale, sparks: Math.round(sparks * 0.5),
                        blocked: contact.blocked() ? 1 : 0, face: contact.blockFace() }, 16);
                WorldFeedback.text(scope, from.plus(up), triplekickMissText, [index + 1], 22);
                current.after(kickTail, finish);
            }

            sound(action, "cobblemon:impact.fighting");
            step(action);
        }
    });
}
