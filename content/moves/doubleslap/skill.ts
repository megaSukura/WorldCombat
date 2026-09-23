/**
 * 连环巴掌 / doubleslap 的出手方式。
 *
 * 核心念头：**贴身左右开弓**——施法者贴住对手不挪步，一只手掌接一只手掌地来回抽，每一掌把对手朝对侧拨一点，
 *   掌印在两颊之间来回跳。它是本族射程最短的一串：不把人推走，只把人拨得站不稳，所以对手要么硬吃整串，
 *   要么必须在起手时退出贴身距离。
 *
 * 幕：
 *   起（raise，提交前）：抬掌、掌心聚起一线掌风，只播预告。
 *   抽（swing → hit / miss，提交后）：最多 `slaps` 掌。每一掌沿身前 `reach` 判定，命中则结算一次 `slap` 接触伤害，
 *       并按交叉式把目标朝对侧拨开 `sway` 格（左右交替）；每掌独立掷 `accuracy`，擦空这串就停。
 *   收（settle）：抽完（或掌数用尽、目标先倒、被拨出臂展）收势，浮字报出这一串抽了几掌。
 *
 * 与同族分开：连续拳是双拳朝一点站定密集直击、每拳更重；猛推是双掌把人一路推开；投球在远处抛球。
 *   只有连环巴掌是**贴身横向来回拨**——反制方式是起手时退出贴身距离，或趁拨动的空当绕到侧面。
 *
 * 配置 `cross`（交叉式）由公式改威力／掌数／拨动／间距；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：掌击朝哪一侧拨；朝向接近竖直时退化为世界 X 轴。 */
    function doubleslapSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: doubleslapId,
        cooldownParameter: "recharge",
        name: "Double Slap",
        description: "The target is slapped repeatedly, back and forth, two to five times in a row.",
        uses: ["贴身一串快速的小掌击", "对低防目标靠掌数堆伤害", "交叉式把对手拨得左右晃，打断它的站位"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.2,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        maximumTicks: 220,
        style: "palm",
        defaults: { cross: false, ai: { maxChase: 4, steady: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[doubleslapId], detail: { values: config } };
            return { radius: p(doubleslapId, "reach", context), geometry: "circle", style: "palm", color: 0xF6C9D2,
                label: config && config.cross === true ? "连环巴掌·交叉式" : "连环巴掌·直抽式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[doubleslapId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(doubleslapId, "tempo", context)),
                recover: Math.round(p(doubleslapId, "settle", context)),
                cooldown: Math.round(p(doubleslapId, "recharge", context)),
                active: 0,
                range: p(doubleslapId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const slaps = Math.max(2, Math.min(5, Math.round(p(doubleslapId, "slaps", action))));
            const smack = Math.max(8, Math.round(p(doubleslapId, "smack", action)));
            action.present("doubleslap:raise:" + action.id(), doubleslapScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", slaps: slaps, smack: smack, windup: prepare,
                    cross: config && config.cross === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p(doubleslapId, "slap", action);
            const slaps = Math.max(2, Math.min(5, Math.round(p(doubleslapId, "slaps", action))));
            const gap = Math.max(2, Math.round(p(doubleslapId, "gap", action)));
            const reach = p(doubleslapId, "reach", action);
            const sway = Math.max(0, p(doubleslapId, "sway", action));
            const accuracy = Math.max(0.05, Math.min(0.99, p(doubleslapId, "accuracy", action)));
            const smack = Math.max(8, Math.round(p(doubleslapId, "smack", action)));
            const cross = !!(config && config.cross === true);
            const scale = Math.max(0.6, Math.min(1.6, reach / 2.4));
            const intensity = Math.max(0.5, Math.min(2.2, power / 16));
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 这一串收势：报出抽中了几掌。 */
            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, doubleslapScene, 1, at,
                    { moment: "settle", slaps: slaps, landed: landed, smack: smack, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), doubleslapTallyText, [landed], 22);
                finish(current);
            }

            function slap(current: CombatAction): void {
                if (settled) return;
                if (index >= slaps) { settle(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const self = scope.observe(actor);
                if (self === null || body === null) { settle(current); return; }
                const origin = self.position();
                let toTarget = body.position().minus(origin);
                if (toTarget.length() < 0.05) toTarget = current.direction();
                const shot = index + 1;
                // 对手被前一掌拨开、退出了臂展：这一串到此为止。
                if (toTarget.length() > reach + 0.4) {
                    WorldFeedback.emit(scope, doubleslapScene, 1, origin.plus(toTarget.unit().scale(reach)),
                        { moment: "away", index: shot, slaps: slaps, smack: smack, reach: Math.round(reach * 100) / 100, scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), doubleslapAwayText, [landed], 20);
                    settle(current);
                    return;
                }
                const heading = toTarget.unit();
                const side = doubleslapSide(heading);
                const sign = index % 2 === 0 ? 1 : -1;
                WorldFeedback.emit(scope, doubleslapScene, 1, body.position(),
                    { moment: "swing", target: targetRef, index: shot, slaps: slaps, side: sign, tilt: sign * 34,
                        smack: smack, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 18);
                sound(current, "minecraft:entity.player.attack.weak");
                // 命中 85：共享偏角让这一掌真的会歪。
                if (scope.random() > accuracy) {
                    WorldFeedback.emit(scope, doubleslapScene, 1, body.position(),
                        { moment: "miss", target: targetRef, index: shot, slaps: slaps, side: sign, smack: smack,
                            scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), doubleslapMissText, [shot], 18);
                    settle(current);
                    return;
                }
                if (!hurt(current, victim!, doubleslapId, power, { damage: damageSpec(doubleslapId, "slap"), contact: true })) {
                    settle(current);
                    return;
                }
                landed++;
                index = shot;
                if (sway > 0.01 && scope.valid(victim!)) scope.displace(victim!, side.scale(sway * sign));
                WorldFeedback.emit(scope, doubleslapScene, 1, body.position(),
                    { moment: "hit", target: targetRef, index: shot, slaps: slaps, side: sign, sway: Math.round(sway * 100) / 100,
                        smack: smack, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 20);
                scope.sound("cobblemon:impact.normal", body.position(), 14, "{}");
                if (index >= slaps) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { slap(next); });
            }

            sound(action, "minecraft:entity.player.attack.weak");
            WorldFeedback.emit(world, doubleslapScene, 1, action.origin(),
                { moment: "raise", slaps: slaps, smack: smack, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 16);
            slap(action);
        }
    });
}
