/**
 * 木角 / hornleech 的出手方式。
 *
 * 核心念头：低头、木角朝前撞进去，角扎在对手肉里，养分顺着角身一路抽回自己身上——本族里唯一用身体出手
 * 的吸招：整段位移 ＋ 贴身贯穿，力量来自体格而非念力。
 *
 * 两幕：
 *   起（windup，提交前）：低头刨地、角上聚起一点绿光，只播预告。
 *   冲（charge → gore / whiff，提交后）：沿瞄准方向逐刻推进，脚下扬起尘土；trace 撞上活体即结算 `gore`
 *       接触伤害，把伤口处的养分沿「目标→自身」抽回（共享 `drain`）。贯穿式可穿过一个已扎中的目标继续
 *       冲向下一个，最多两个目标；撞空则冲到尽头刹住。
 *
 * 与同族分开：三条特殊吸路都不移动身体（吸取探藤、超级吸取抛荚、终极吸取立根），只有木角用角撞进去；
 * 只有它可能一次扎中两个目标，也只有它的力量随物攻与体重长。
 *
 * 命中、防御、相性与暴击走共享 `impact`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const hornLeechScene = "world_combat:move_hornleech";
    const hornLeechGoreText = "world_combat.move.hornleech.text.gore";
    const hornLeechSapText = "world_combat.move.hornleech.text.sap";
    const hornLeechMissText = "world_combat.move.hornleech.text.miss";

    define({
        freeMovement: true,
        id: "hornleech",
        cooldownParameter: "recharge",
        name: "Horn Leech",
        description: "用角攻击目标，将造成的部分伤害转化为自身治疗。",
        uses: ["低头撞进去，用身体把一段距离变成命中", "扎中时把伤害换成回血，边打边续航", "贯穿式一次冲过两个目标"],
        kind: "enemy",
        range: 3.0,
        maxRange: 5.8,
        prepare: 8,
        active: 1,
        recover: 9,
        cooldown: 40,
        style: "grass",
        defaults: { gore: false, ai: { maxChase: 10, healBelow: 0.9 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hornleech", "reach", pokemon) * 1.4, geometry: "line", style: "grass", color: 0x6DA83A,
                label: config && config.gore === true ? "木角·贯穿" : "木角" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["hornleech"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("hornleech", "tempo", context)),
                recover: Math.round(p("hornleech", "aftercast", context)),
                cooldown: Math.round(p("hornleech", "recharge", context)),
                active: 1,
                range: p("hornleech", "reach", context) + 0.35
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:hornleech:" + action.id(), hornLeechScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", gore: config && config.gore === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(hornLeechScene);
            const world = action.world();
            const length = p("hornleech", "reach", action);
            const speed = p("hornleech", "charge", action);
            const radius = p("hornleech", "tusk", action);
            const power = p("hornleech", "gore", action);
            const share = p("hornleech", "sap", action);
            const maxHits = (config && config.gore === true ? 2 : 1);
            const direction = aim(action);
            const scale = radius / 0.42;
            const motes = Math.max(10, Math.round(power * 0.28 + share * 50));
            const hitRefs: string[] = [];
            let travelled = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }
            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, hornLeechScene, 1, at, { moment: "miss", scale: scale, motes: motes }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), hornLeechMissText, [], 18);
                sound(current, "minecraft:block.grass.break");
                finish(current);
            }

            movementScenes.show(action, "charge", action.origin(), { moment: "charge", direction: [direction.x(), direction.y(), direction.z()], motes: motes });
            sound(action, "cobblemon:move.leechseed.actor");

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { if (hits === 0) whiff(current, origin); else finish(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const ref = target === null ? "" : String(target.ref());
                    if (target !== null && hitRefs.indexOf(ref) < 0 && !scope.friendly(target)) {
                        hitRefs.push(ref);
                        const at = hit.position();
                        const landed = impact(current, hit, "hornleech", power,
                            { damage: damageSpec("hornleech", "gore"), contact: true, drain: share });
                        hits++;
                        const self = scope.observe(current.actor());
                        const from = self === null ? current.origin() : self.position();
                        const flow = from.minus(at), span = flow.length();
                        const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                        WorldFeedback.emit(scope, hornLeechScene, 1, at,
                            { moment: "gore", target: ref, scale: scale, motes: motes, carried: hits }, 24);
                        WorldFeedback.emit(scope, hornLeechScene, 1, at,
                            { moment: "sap", path: ["target", "source"], target: ref,
                                direction: [inward.x(), inward.y(), inward.z()], span: span,
                                motes: motes, carried: hits }, 30);
                        sound(current, "cobblemon:move.horndrill.target_1");
                        if (landed) {
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), hornLeechGoreText, [], 22);
                            WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.2, 0)), hornLeechSapText, [Math.round(share * 100)], 22);
                        }
                        if (hits >= maxHits) { finish(current); return; }
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("hornleech", "minimumMove", current) || travelled >= length) {
                    if (hits === 0) whiff(current, origin); else finish(current);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
