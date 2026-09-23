/**
 * 刷刷茶炮 / matchagotcha 的出手方式。
 *
 * 核心念头：端出一盏打好的茶，泼成一炮——茶汤带热气，落点周围一片都被烫，沾上的人还可能被灼伤；
 *   热茶同时把冻住的目标化开。它是本族唯一的远程炮击、也是唯一带灼伤的一口，一次能泼到弹着点周围一片。
 *
 * 两幕：
 *   起（windup，提交前）：盏里搅起茶泡与绿汽，只播预告。
 *   泼（jet → splash / dud，提交后）：一颗茶泡沿瞄准方向抛出，命中活体或落地即按 `burst` 半径炸开一片；
 *       圈内每个敌人各结算一次 `brew` 特殊伤害，伤害的一部分经共享 `drain` 抽回自身，并按 `scald` 概率挂上共享灼伤
 *       （宝可梦同步为原生灼伤），命中即解冻；打空或落地则只在落点散开一圈茶沫。
 *
 * 与同族分开：超级吸取先抛孢荚再分拍抽、终极吸取原地立根、吸取拳与木角近身；只有刷刷茶炮是**远程溅射炮**，
 *   也是唯一留下灼伤的一招。配置 `whisk` 让它在「点茶聚焦一束」与「刷泡泼开一片」之间取舍。
 *
 * 命中、防御、相性与暴击走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const matchaGotchaScene = "world_combat:move_matchagotcha";
    const matchaGotchaHitText = "world_combat.move.matchagotcha.text.hit";
    const matchaGotchaScaldText = "world_combat.move.matchagotcha.text.scald";
    const matchaGotchaDudText = "world_combat.move.matchagotcha.text.dud";

    define({
        id: "matchagotcha",
        cooldownParameter: "recharge",
        name: "Matcha Gotcha",
        description: "抛出一颗茶泡砸向远处的敌人，落点炸开一圈，圈内每个敌人各挨一记并汲取生命，有机会使目标灼伤，并解冻被泼到的冰冻目标。",
        uses: ["从一段距离外把茶汤泼到一小片人身上", "顺手挂灼伤并解冻被冻住的目标", "目标挤在一起时一次烫到几个并回血"],
        kind: "enemy",
        range: 8.0,
        maxRange: 12.0,
        prepare: 10,
        active: 1,
        recover: 10,
        cooldown: 34,
        style: "tea",
        defaults: { whisk: false, ai: { maxChase: 11, healBelow: 0.85 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("matchagotcha", "burst", pokemon) + 0.4, geometry: "area", style: "tea", color: 0x8CBF3F,
                label: config && config.whisk === true ? "刷刷茶炮·刷泡" : "刷刷茶炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["matchagotcha"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("matchagotcha", "tempo", context)),
                recover: Math.round(p("matchagotcha", "aftercast", context)),
                cooldown: Math.round(p("matchagotcha", "recharge", context)),
                active: skills["matchagotcha"].active,
                range: p("matchagotcha", "jet", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:matchagotcha:" + action.id(), matchaGotchaScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", whisk: config && config.whisk === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const whisk = config && config.whisk === true;
            const power = p("matchagotcha", "brew", action);
            const share = p("matchagotcha", "sap", action);
            const jet = p("matchagotcha", "jet", action);
            const burst = p("matchagotcha", "burst", action);
            const scald = Math.max(0.02, Math.min(0.9, p("matchagotcha", "scald", action)));
            const burnTicks = Math.max(40, Math.round(p("matchagotcha", "brewtime", action)));
            const radius = Math.max(0.2, Math.min(0.6, burst * 0.25));
            const motes = Math.max(14, Math.round(power * 0.25 + share * 30));
            const scale = Math.max(0.6, Math.min(1.8, burst / 1.4));
            const intensity = Math.max(0.6, Math.min(2.4, power / 80));
            const castSpeed = 0.7;
            let splashed = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function splash(current: CombatAction, point: CombatPoint): void {
                const scope = current.world(), me = scope.observe(current.actor());
                const from = me === null ? current.origin() : me.position();
                let hits = 0;
                sound(current, "cobblemon:impact.grass");
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, burst, { below: 1.5, above: 2.6 }),
                    function (enemy: CombatActor, facts: CombatObservation) {
                        if (CombatStatus.has(scope, enemy, "frozen")) CombatStatus.cure(scope, enemy, "frozen");
                        const at = facts.position();
                        const landed = hurt(current, enemy, "matchagotcha", power,
                            { damage: damageSpec("matchagotcha", "brew"), status: "burn", chance: scald, statusTicks: burnTicks, drain: share });
                        if (!landed) return;
                        hits++;
                        const flow = from.minus(at), span = flow.length();
                        const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                        WorldFeedback.emit(scope, matchaGotchaScene, 1, at,
                            { moment: "drain", path: ["target", "source"], target: String(enemy.ref()),
                                direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, scale: scale, hits: hits }, 24);
                        if (CombatStatus.has(scope, enemy, "burn")) {
                            WorldFeedback.emit(scope, matchaGotchaScene, 1, at,
                                { moment: "scald", target: String(enemy.ref()), motes: motes, scale: scale, intensity: intensity }, 22);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), matchaGotchaScaldText, [], 20);
                        }
                    });
                WorldFeedback.emit(scope, matchaGotchaScene, 1, point,
                    { moment: "splash", point: [point.x(), point.y(), point.z()], burst: burst, whisk: whisk ? 1 : 0,
                        hits: hits, motes: motes, scale: scale, intensity: intensity }, 26);
                if (hits > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.05, 0)), matchaGotchaHitText, [], 20);
            }

            sound(action, "minecraft:block.brewing_stand.brew");
            const flight = LivingActions.projectile(action, {
                speed: castSpeed, range: jet, radius: radius,
                lifetime: Math.max(24, Math.round(jet / castSpeed + 16)),
                appearance: { sprite: "cobblemon:generic/bubble/smallbubble_broth", tint: 0x9CCB4F, glow: true,
                    scale: Math.max(0.6, Math.min(1.4, burst / 1.4)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    if (!hit.hitEntity()) return;
                    splashed = true;
                    sound(current, "minecraft:entity.llama.spit");
                    splash(current, hit.position());
                }
            }, function (current: CombatAction) {
                if (!splashed) {
                    const scope = current.world(), point = current.targetPosition();
                    WorldFeedback.emit(scope, matchaGotchaScene, 1, point,
                        { moment: "dud", point: [point.x(), point.y(), point.z()], motes: motes, scale: scale }, 18);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), matchaGotchaDudText, [], 18);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "world_combat:matchagotcha:" + action.id(), matchaGotchaScene, 1, origin,
                { moment: "jet", projectile: flight, burst: burst, whisk: whisk ? 1 : 0, motes: motes, scale: scale, intensity: intensity }, 80);
        }
    });
}
