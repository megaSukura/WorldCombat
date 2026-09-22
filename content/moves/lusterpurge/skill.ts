/**
 * 洁净光芒 / lusterpurge —— 注册与动作。
 *
 * 三幕：
 *   起（windup，提交前）：强光在身前收成一点、越收越亮（`action.present` 预告）。
 *   放（flash → wave）：提交后先在身上炸出一层强光，光幕随即从脚边向外一圈圈铺开；
 *       每一圈扫到的敌人各结算一次特殊伤害，每人各掷一次 50% 起的碾防（共享 `NativeEffects.boost(..., "spd", -1)`）。
 *   收（daze / fade）：触发碾防的目标身上残留一圈炫目亮点，到 `dazeTicks` 散去；光幕最后淡出。
 *
 * 与同族分开：磨防四式里唯一以自身为中心、无方向、无飞行物的一招；范围最短、PP 最少，换来全族最高的碾防概率。
 * 配置 `focus`（聚光）由 resolve 改时序、由公式改半径／威力／概率。
 */
namespace PokemonSkills {
    const lusterpurgeScene = "world_combat:move_lusterpurge";
    const lusterpurgeSunderText = "world_combat.move.lusterpurge.text.sunder";

    define({
        id: "lusterpurge",
        name: "Luster Purge",
        description: "从自身炸开一圈向外扩张的强光：光幕扫到的每个敌人各承受一次特殊伤害，并有很高概率被照得特防下降 1 级，触发时身上残留一圈炫目亮点。",
        uses: ["被围住时一次罩住一圈敌人", "用全族最高的概率压低周围对手的特防", "贴身短范围的一次爆发"],
        kind: "self",
        range: 5.0,
        maxRange: 8.0,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 46,
        style: "radiance",
        defaults: { focus: false, ai: { maxChase: 7, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("lusterpurge", "flashRadius", pokemon), geometry: "area", style: "radiance",
                color: 0xFFE9A8, label: config && config.focus === true ? "聚光洁净光芒" : "洁净光芒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["lusterpurge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.round(p("lusterpurge", "tempo", context)),
                recover: 10,
                cooldown: 46 + (focus ? 4 : -2),
                active: 0,
                range: p("lusterpurge", "flashRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:lusterpurge:" + action.id(), lusterpurgeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const radius = Math.max(2.4, p("lusterpurge", "flashRadius", action));
            const power = p("lusterpurge", "core", action);
            const chance = p("lusterpurge", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("lusterpurge", "sunderStage", action)));
            const daze = Math.max(40, Math.round(p("lusterpurge", "dazeTicks", action)));
            const rays = Math.max(6, Math.round(p("lusterpurge", "rays", action)));
            const spread = Math.max(3, Math.round(p("lusterpurge", "spreadTicks", action)));
            const scale = Math.max(0.5, Math.min(2.4, radius / 4.0));
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), lusterpurgeScene, 1, centre, { moment: "fade", radius: radius, rays: rays, scale: scale }, 26);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / spread, inner = Math.max(0, radius * step / spread - 0.3);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hitRefs[ref]) return;
                    hitRefs[ref] = true;
                    if (!hurt(current, enemy, "lusterpurge", power, { damage: damageSpec("lusterpurge", "core") })) return;
                    total++;
                    const intensity = Math.max(0.5, Math.min(2.2, power / 90));
                    WorldFeedback.emit(scope, lusterpurgeScene, 1, facts.position(),
                        { moment: "hit", target: ref, rays: rays, scale: scale, intensity: intensity }, 22);
                    if (scope.valid(enemy) && scope.random() < chance) {
                        NativeEffects.boost(scope, enemy, "spd", -stages);
                        const at = scope.observe(enemy);
                        if (at !== null) {
                            WorldFeedback.keep(scope, "lusterpurge:daze:" + ref, lusterpurgeScene, 1, at.position(),
                                { moment: "daze", target: ref, rays: rays, scale: scale }, daze);
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), lusterpurgeSunderText, [stages], 30);
                        }
                    }
                });
                WorldFeedback.keep(scope, "lusterpurge:wave:" + String(current.actor().ref()), lusterpurgeScene, 1, centre,
                    { moment: "wave", radius: outer, rays: rays, scale: scale }, 10);
                step++;
                if (step >= spread) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, lusterpurgeScene, 1, centre,
                { moment: "flash", radius: radius, rays: rays, scale: scale, intensity: Math.max(0.6, Math.min(2.2, power / 90)) }, 24);
            sound(action, "minecraft:block.conduit.activate");
            advance(action);
        }
    });
}
