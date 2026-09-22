/**
 * 淘金潮 / makeitrain —— 注册与动作。
 *
 * 核心念头：把整座金库抖上头顶，金币像暴雨一样从上方一圈圈砸落，扫过身周所有敌人；
 *   金子散尽后自己的特攻被掏空（Sp. Atk −1），地上铺满真能捡的 Relic Coin。它是金币二式里唯一的大招，
 *   也是唯一有明确自我代价的一发：倾得越空，自己越虚。
 *
 * 三幕：
 *   起（windup，提交前）：头顶聚起翻涌的金光与币影（`action.present` 预告）。
 *   雨（downpour → hit）：提交后金币从上方分 `waves` 圈砸落，每圈扫过圈内尚未命中的非友方各结算一次
 *     特殊钢伤害；放开的同时立刻支付自损（`NativeEffects.boost(spa, -selfDrop)`）。
 *   留（settle）：雨停后把 `scatter` 枚真币撒在覆盖圈里，谁都能捡。
 *
 * 与同族分开：聚宝功是单体、快出手的一手钱；淘金潮是自身一圈、高威力、有自我代价的大雨。
 * 配置 `hoard`（倾库式）由公式改威力／范围／数量／自损、由 resolve 改时序。
 */
namespace PokemonSkills {
    const makeitrainScene = "world_combat:move_makeitrain";
    const makeitrainHitText = "world_combat.move.makeitrain.text.hit";
    const makeitrainMissText = "world_combat.move.makeitrain.text.miss";
    const makeitrainCostText = "world_combat.move.makeitrain.text.cost";

    /** 雨停后把真币撒在覆盖圈里：优先 Cobblemon 遗迹硬币，缺失时退回金粒；限制枚数避免堆太多实体。 */
    function makeitrainScatter(current: CombatAction, centre: CombatPoint, radius: number, count: number): void {
        const scope = current.world();
        const item = scope.item("cobblemon:relic_coin") !== null ? "cobblemon:relic_coin" : "minecraft:gold_nugget";
        const limit = Math.max(0, Math.min(12, Math.round(count)));
        for (let index = 0; index < limit; index++) {
            const angle = scope.random() * Math.PI * 2, spread = Math.sqrt(scope.random()) * Math.max(0.5, radius * 0.9);
            const at = centre.plus(WorldCombat.point(Math.cos(angle) * spread, 0.35 + scope.random() * 0.4, Math.sin(angle) * spread));
            try { scope.dropItem(at, item, 1, JSON.stringify({ pickupDelay: 16 })); } catch (error) { /* 掉落被拒绝时只保留机制与粒子 */ }
        }
    }

    define({
        id: "makeitrain",
        name: "Make It Rain",
        description: "把整座金库抖上头顶，金币如暴雨般从上方一圈圈砸落，扫过身周所有敌人；金子散尽后自己的特攻下降，地上留下一片能捡的硬币。倾库式更大更重、自损更深、回气更久。",
        uses: ["被围住时一次倾泻整片大范围", "用最高的一发打在扎堆的敌人身上", "在场上撒下大量可回收的真币"],
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
            const wealth = Math.max(30, Math.round(p("makeitrain", "wealth", action)));
            const waves = Math.max(3, Math.round(p("makeitrain", "waves", action)));
            const interval = Math.max(3, Math.round(p("makeitrain", "interval", action)));
            const scatter = Math.max(3, Math.round(p("makeitrain", "scatter", action)));
            const selfDrop = Math.max(1, Math.min(2, Math.round(p("makeitrain", "selfDrop", action))));
            const fall = p("makeitrain", "fall", action);
            const density = Math.max(10, Math.round(8 + wealth * 0.28));
            const scale = Math.max(0.6, Math.min(2.2, radius / 5.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const actorRef = String(actor.ref());
            const hitSet: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                makeitrainScatter(current, centre, radius, scatter);
                WorldFeedback.emit(scope, makeitrainScene, 1, centre,
                    { moment: "settle", radius: radius, scatter: scatter, density: density, scale: scale }, 28);
                if (total > 0)
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)), makeitrainHitText, [total], 30);
                else
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)), makeitrainMissText, [], 24);
                sound(current, "cobblemon:block.relic_coin_sack.hit");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / waves;
                const inner = Math.max(0, radius * step / waves - 0.4);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 3, above: 3 }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === actorRef || hitSet[ref]) return;
                        hitSet[ref] = true;
                        if (!hurt(current, enemy, "makeitrain", power, { damage: damageSpec("makeitrain", "coin") })) return;
                        total++;
                        WorldFeedback.emit(scope, makeitrainScene, 1, facts.position(),
                            { moment: "hit", target: ref, coin: power, scale: scale, intensity: intensity }, 22);
                    });
                WorldFeedback.keep(scope, "makeitrain:rain:" + actorRef, makeitrainScene, 1, centre,
                    { moment: "downpour", radius: outer, full: radius, step: step, waves: waves,
                        density: density, fall: fall, scale: scale, intensity: intensity }, Math.max(8, interval + 8));
                step++;
                if (step >= waves) { settle(current); return; }
                current.after(interval, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.beacon.activate");
            NativeEffects.boost(world, actor, "spa", -selfDrop);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.6, 0)), makeitrainCostText, [selfDrop], 32);
            WorldFeedback.emit(world, makeitrainScene, 1, centre,
                { moment: "downpour", radius: 0.6, full: radius, step: 0, waves: waves,
                    density: density, fall: fall, scale: scale, intensity: intensity }, 20);
            advance(action);
        }
    });
}
