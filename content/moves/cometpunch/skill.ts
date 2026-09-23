/**
 * 连续拳 / cometpunch 的出手方式。
 *
 * 核心念头：**站定、双拳朝身前一片密集直击**——施法者扎住脚步，一双拳头一下接一下砸出去，拳影在身前叠成
 *   一片白光；本族单拳最重，拳数靠物攻与耐力堆。它是唯一的「拳」招，带 punch flag，会与铁拳一类的拳击加成联动。
 *
 * 幕：
 *   起（brace，提交前）：沉肩收拳、拳面亮起一线白光，只播预告。
 *   击（flurry → hit / miss，提交后）：最多 `punches` 拳。每一拳沿身前 `reach` 判定——聚焦式砸在同一个点、
 *       只打目标一个；乱打式在 `cone` 扇面里铺开，一记能同时盖到并排的目标（`maxTargets`）。命中结算一次
 *       `punch` 接触伤害并按 `push` 顶退；每拳独立掷 `accuracy`，擦空这串就停。
 *   收（settle）：这一串砸完（或目标先倒/被推出臂展）收拳，浮字报出命中了几拳。
 *
 * 与同族分开：连环巴掌是两只手掌贴身横向来回拨、每掌更轻；猛推是双掌把人一路推开；投球在远处抛球。
 *   只有连续拳是**站定、双拳朝一点或一小片密集直击**，也是唯一的拳击（punch）招。
 *
 * 配置 `scatter`（乱打式）由公式改威力／拳数／扇面／顶退；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 把水平方向绕世界 Y 轴转 `degrees`，做乱打的微小摆拳。 */
    function cometpunchTurn(direction: CombatPoint, degrees: number): CombatPoint {
        const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: cometpunchId,
        cooldownParameter: "recharge",
        name: "Comet Punch",
        description: "The target is hit with a flurry of punches that strike two to five times in a row.",
        uses: ["站定用双拳朝身前一片密集直击", "对单个厚目标用聚焦式堆单拳份量", "乱打式一记盖到并排的第二个敌人"],
        kind: "enemy",
        range: 2.7,
        maxRange: 3.7,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 240,
        style: "flurry",
        defaults: { scatter: false, ai: { maxChase: 6, crowds: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[cometpunchId], detail: { values: config } };
            return { radius: p(cometpunchId, "reach", context), geometry: "cone", style: "flurry", color: 0xFFE08A,
                label: config && config.scatter === true ? "连续拳·乱打式" : "连续拳·聚焦式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[cometpunchId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(cometpunchId, "tempo", context)),
                recover: Math.round(p(cometpunchId, "settle", context)),
                cooldown: Math.round(p(cometpunchId, "recharge", context)),
                active: 0,
                range: p(cometpunchId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const punches = Math.max(2, Math.min(5, Math.round(p(cometpunchId, "punches", action))));
            const sparks = Math.max(10, Math.round(p(cometpunchId, "sparks", action)));
            action.present("cometpunch:brace:" + action.id(), cometpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", punches: punches, sparks: sparks, windup: prepare,
                    scatter: config && config.scatter === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p(cometpunchId, "punch", action);
            const punches = Math.max(2, Math.min(5, Math.round(p(cometpunchId, "punches", action))));
            const gap = Math.max(2, Math.round(p(cometpunchId, "gap", action)));
            const reach = p(cometpunchId, "reach", action);
            const cone = p(cometpunchId, "cone", action);
            const cap = Math.max(1, Math.round(p(cometpunchId, "maxTargets", action)));
            const push = p(cometpunchId, "push", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(cometpunchId, "accuracy", action)));
            const sparks = Math.max(10, Math.round(p(cometpunchId, "sparks", action)));
            const scatter = !!(config && config.scatter === true);
            const band = { below: 1.0, above: 2.0 };
            const scale = Math.max(0.6, Math.min(1.6, reach / 2.7));
            const intensity = Math.max(0.5, Math.min(2.4, power / 19));
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, cometpunchScene, 1, at,
                    { moment: "settle", punches: punches, landed: landed, sparks: sparks, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), cometpunchTallyText, [landed, punches], 22);
                finish(current);
            }

            function flurry(current: CombatAction): void {
                if (settled) return;
                if (index >= punches) { settle(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const self = scope.observe(actor);
                if (self === null || body === null) { settle(current); return; }
                const origin = self.position();
                let toTarget = body.position().minus(origin);
                if (toTarget.length() < 0.05) toTarget = current.direction();
                const shot = index + 1;
                // 聚焦式够不到就断；乱打式的扇面由下面的区域判定。
                if (!scatter && toTarget.length() > reach + 0.4) {
                    WorldFeedback.emit(scope, cometpunchScene, 1, body.position(),
                        { moment: "miss", target: targetRef, index: shot, punches: punches, sparks: sparks, scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), cometpunchMissText, [shot], 18);
                    settle(current);
                    return;
                }
                const heading = toTarget.unit();
                // 乱打：每一拳的落点略偏，读作「怒涛般的乱拳」。
                const swing = scatter ? cometpunchTurn(heading, (scope.random() * 2 - 1) * cone / 2) : heading;
                WorldFeedback.emit(scope, cometpunchScene, 1, body.position(),
                    { moment: "flurry", target: targetRef, index: shot, punches: punches, sparks: sparks,
                        direction: [swing.x(), swing.y(), swing.z()], scale: scale, intensity: intensity,
                        scatter: scatter ? 1 : 0 }, 16);
                sound(current, "minecraft:entity.player.attack.strong");
                if (scope.random() > accuracy) {
                    WorldFeedback.emit(scope, cometpunchScene, 1, body.position(),
                        { moment: "miss", target: targetRef, index: shot, punches: punches, sparks: sparks, scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), cometpunchMissText, [shot], 18);
                    settle(current);
                    return;
                }
                let hits = 0;
                function connect(other: CombatActor, at: CombatPoint): void {
                    if (!hurt(current, other, cometpunchId, power, { damage: damageSpec(cometpunchId, "punch"), contact: true })) return;
                    hits++;
                    landed++;
                    if (scope.valid(other)) scope.displace(other, WorldCombat.point(heading.x(), 0, heading.z()).scale(push));
                    WorldFeedback.emit(scope, cometpunchScene, 1, at,
                        { moment: "hit", target: String(other.ref()), index: shot, punches: punches, sparks: sparks,
                            push: Math.round(push * 100) / 100, scale: scale, intensity: intensity, scatter: scatter ? 1 : 0 }, 20);
                    scope.sound("cobblemon:impact.normal", at, 14, "{}");
                }
                if (scatter) {
                    WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, heading, reach, Math.max(12, cone), band), function (other, facts) {
                        if (hits >= cap) return;
                        connect(other, facts.position());
                    });
                } else if (scope.valid(victim!)) {
                    connect(victim!, body.position());
                }
                if (hits === 0) {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), cometpunchMissText, [shot], 18);
                    settle(current);
                    return;
                }
                index = shot;
                if (index >= punches) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { flurry(next); });
            }

            sound(action, "cobblemon:move.closecombat.actor_1");
            WorldFeedback.emit(world, cometpunchScene, 1, action.origin(),
                { moment: "brace", punches: punches, sparks: sparks, scale: scale, intensity: intensity, scatter: scatter ? 1 : 0 }, 16);
            flurry(action);
        }
    });
}
