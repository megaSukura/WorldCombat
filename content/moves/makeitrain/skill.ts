/**
 * 淘金潮 / makeitrain —— 注册与动作。
 *
 * 核心念头：把整座金库抖上头顶，一束束**真金币**向身周散开、沿真实弧线抛上去再落下来；
 *   哪一束真的碰到敌人，那一下才结算特殊钢伤害，每名敌人整次最多挨一次；散尽后自己的特攻被掏空，
 *   少数真硬币留在金币实际落地的终点。屋檐、低顶与方块会真的挡住金雨，站进遮挡下就能躲。
 *
 * 三幕：
 *   起（windup，提交前）：头顶聚起翻涌的金光与币影（`action.present` 预告）。
 *   雨（toss → beam → hit/clink/drop）：提交后按 `interval` 把 `beams` 束金币从自身向范围内散点抛出，
 *     每束是一枚有真实碰撞与重力的投掷物，上升与下落都走真实方块路径；碰到敌人按 `coin` 结算一次，
 *     碰到方块就在接触面叮响（顶面才算落地，屋顶/墙面只响不落钱），飞到尽头自然消失、不凭空掉在准点。
 *   留（drop）：每束按总掉落预算在**实际终点**散出少量真币，谁都能捡。
 *
 * 与同族分开：聚宝功是单体、快出手的一手钱；淘金潮是自身一圈、高威力、有自我代价的一大场真雨。
 * 配置 `hoard`（倾库式）由公式改威力／范围／束数／自损、由 resolve 改时序。
 */
namespace PokemonSkills {
    const makeitrainScene = "world_combat:move_makeitrain";
    const makeitrainHitText = "world_combat.move.makeitrain.text.hit";
    const makeitrainMissText = "world_combat.move.makeitrain.text.miss";
    const makeitrainCostText = "world_combat.move.makeitrain.text.cost";

    function makeitrainItem(world: CombatWorld): string {
        return world.item("cobblemon:relic_coin") !== null ? "cobblemon:relic_coin" : "minecraft:gold_nugget";
    }

    define({
        id: "makeitrain",
        cooldownParameter: "wait",
        maximumTicks: 400,
        name: "Make It Rain",
        description: "把整座金库抖上头顶，一束束真金币向身周抛起再沿真实弧线落下；真的落到敌人身上的那一下才结算特殊伤害，每名敌人整次最多挨一次，屋檐与低顶会挡住金雨。散尽后自己的特攻下降，少数真硬币留在金币实际落地的终点。倾库式更多更重、自损更深、回气更久。",
        uses: ["被围住时一次倾泻整片大范围", "在开阔近距对扎堆的敌人抛一场真雨", "用真实弹道与屋顶判断落点，站进遮挡就能躲"],
        kind: "self",
        range: 5.0,
        maxRange: 8.5,
        prepare: 18,
        active: 0,
        recover: 14,
        cooldown: 140,
        style: "gold",
        defaults: { hoard: false, ai: { maxChase: 7, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("makeitrain", "radius", pokemon), geometry: "area", style: "gold",
                color: 0xFFD24A, label: config && config.hoard === true ? "倾库淘金潮" : "淘金潮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["makeitrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("makeitrain", "tempo", context)),
                recover: Math.round(p("makeitrain", "aftercast", context)),
                cooldown: Math.round(p("makeitrain", "wait", context)),
                active: 0,
                range: p("makeitrain", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("makeitrain:gather", makeitrainScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hoard: config && config.hoard === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const radius = Math.max(3.5, p("makeitrain", "radius", action));
            const power = p("makeitrain", "coin", action);
            const beams = Math.max(12, Math.min(24, Math.round(p("makeitrain", "beams", action))));
            const interval = Math.max(2, Math.round(p("makeitrain", "interval", action)));
            const scatter = Math.max(3, Math.round(p("makeitrain", "scatter", action)));
            const selfDrop = Math.max(1, Math.min(2, Math.round(p("makeitrain", "selfDrop", action))));
            const fall = p("makeitrain", "fall", action);
            const scale = Math.max(0.6, Math.min(2.2, radius / 5.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const gravity = Math.max(0.012, fall * 0.05);
            const apex = Math.max(1.5, radius * (1.0 - fall * 0.5));
            const coinRadius = 0.34;
            const coinItem = makeitrainItem(world);
            const perBeam = scatter / beams;
            const actorRef = String(actor.ref());
            const hitSet: { [ref: string]: boolean } = {};
            const scenes = WorldFeedback.actionScenes(makeitrainScene);
            let fired = 0, active = 0, hitCount = 0, dropped = 0, budget = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled || fired < beams || active > 0) return;
                settled = true;
                const scope = current.world();
                if (hitCount > 0)
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)), makeitrainHitText, [hitCount], 30);
                else
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)), makeitrainMissText, [], 24);
                sound(current, "cobblemon:block.relic_coin_sack.hit");
                scenes.finish(current, done);
            }

            /** 自然结束兜底：弹道被卸载等异常丢失完成回调时，不把整招卡死。 */
            function forceFinish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            /** 分束分配固定掉落预算：总预算不随束数增加，只在实际终点按累积份额落币。 */
            function dropShare(scope: CombatWorld, at: CombatPoint): void {
                budget += perBeam;
                const count = Math.floor(budget);
                if (count <= 0) return;
                budget -= count;
                for (let index = 0; index < count; index++)
                    try { scope.dropItem(at, coinItem, 1, JSON.stringify({ pickupDelay: 16 })); } catch (error) { /* 掉落被拒绝时只保留机制与表现 */ }
                dropped += count;
                WorldFeedback.emit(scope, makeitrainScene, 1, at,
                    { moment: "drop", count: count, total: Math.round(scatter), scale: scale }, 20);
            }

            function release(current: CombatAction): void { active--; finish(current); }

            /** 抛出一束真金币：散点定水平距离与方向，弧顶与重力来自半径与体重；命中由真实撞击结算。 */
            function fire(current: CombatAction): void {
                if (settled) return;
                if (fired >= beams) { finish(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position().plus(WorldCombat.point(0, self.height() * 0.25, 0));
                const index = fired + 1;
                fired++;
                const angle = scope.random() * Math.PI * 2;
                const distance = radius * (0.22 + 0.78 * Math.sqrt(scope.random()));
                const flightTime = 2 * Math.sqrt(2 * gravity * apex) / gravity;
                const horizontal = distance / Math.max(6, flightTime);
                const velocity = WorldCombat.point(Math.cos(angle) * horizontal, Math.sqrt(2 * gravity * apex), Math.sin(angle) * horizontal);
                const range = distance + apex * 2.5 + 8;
                const lifetime = Math.max(50, Math.round(flightTime) + 40);
                const key = "beam:" + index;
                let dropAt: CombatPoint | null = null;
                active++;
                const flight = current.projectile(origin, velocity, gravity, coinRadius, range, lifetime,
                    function (inner: CombatAction, hit: CombatImpact): void {
                        const stage = inner.world();
                        const at = hit.position();
                        const block = hit.blockPosition();
                        scenes.stop(inner, key);
                        if (hit.hitEntity()) {
                            const victim = hit.target();
                            if (victim !== null && stage.valid(victim) && !stage.friendly(victim)) {
                                const ref = String(victim.ref());
                                if (!hitSet[ref]) {
                                    hitSet[ref] = true;
                                    if (impact(inner, hit, "makeitrain", power, { damage: damageSpec("makeitrain", "coin") })) {
                                        hitCount++;
                                        WorldFeedback.emit(stage, makeitrainScene, 1, at,
                                            { moment: "hit", target: ref, coin: power, scale: scale, intensity: intensity }, 22);
                                    }
                                } else {
                                    WorldFeedback.emit(stage, makeitrainScene, 1, at,
                                        { moment: "clink", target: ref, coin: power, spent: 1 }, 16);
                                }
                                dropAt = at;
                            }
                        } else if (block !== null) {
                            if (hit.blockFace() === "up") dropAt = WorldCombat.point(block.x() + 0.5, block.y() + 1.05, block.z() + 0.5);
                            WorldFeedback.emit(stage, makeitrainScene, 1, at,
                                { moment: "clink", scale: scale, face: hit.blockFace() }, 14);
                            sound(inner, "cobblemon:block.relic_coin_sack.step");
                        } else {
                            dropAt = at;
                        }
                    },
                    function (inner: CombatAction): void {
                        if (dropAt !== null) dropShare(inner.world(), dropAt);
                        release(inner);
                    },
                    JSON.stringify({ item: coinItem, glow: true, spin: true, scale: Math.max(0.6, Math.min(1.4, scale)) }));
                scenes.show(current, key, origin,
                    { moment: "beam", projectile: flight, index: index, beams: beams, coin: power, scale: scale, intensity: intensity });
                WorldFeedback.emit(scope, makeitrainScene, 1, origin,
                    { moment: "toss", index: index, beams: beams, intensity: intensity }, 16);
                if (fired < beams) current.after(interval, function (next: CombatAction) { fire(next); });
                else finish(current);
            }

            sound(action, "minecraft:block.beacon.activate");
            NativeEffects.boost(world, actor, "spa", -selfDrop);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.6, 0)), makeitrainCostText, [selfDrop], 32);
            fire(action);
            action.after(Math.round(beams * interval) + 140, function (next: CombatAction) { forceFinish(next); });
        }
    });
}
