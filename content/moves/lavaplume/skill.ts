/**
 * 喷烟 / lavaplume 的出手方式。
 *
 * 核心念头：从身体向上喷起一柱高热烟流，底窄、上端略散，威胁上方与贴身空间——竖直的第一幕是这招与同族最不同的地方；
 * 被烧到的可能灼伤。浓烟式让余热继续留在这根柱子里反复烫人，爆燃式一发即收。
 *
 * 三幕：
 *   起（windup，提交前）：身上腾起火星与浓烟的预告。
 *   击（plume → hit）：提交后烟柱自下而上逐层升起，每层扫到的敌人各挨一记主伤、掷一次灼伤，只结算一次；
 *       烟柱升到 `plumeHeight`，中途遇到顶棚则截断在顶棚处（顶棚横散只作画面）。
 *   收（ember / fade）：浓烟式让余热留在同一根柱内，按 `emberPulse` 反复烫仍站在柱内的人，到 `emberTicks` 散去；爆燃式一次即止。
 *
 * 配置 `fume`（浓烟式）由 resolve 改时序、由公式改威力与半径：开启＝封在柱内，关闭＝一发更重。
 */
namespace PokemonSkills {
    const lavaplumeScene = "world_combat:move_lavaplume";
    const lavaplumeBurnText = "world_combat.move.lavaplume.text.burn";
    const lavaplumeHitText = "world_combat.move.lavaplume.text.hit";
    const lavaplumeMissText = "world_combat.move.lavaplume.text.miss";

    define({
        id: "lavaplume",
        name: "Lava Plume",
        description: "从身体竖起一柱高热烟流：底窄、上端略散，自下而上扫过，被烧到的敌人一起挨伤、可能灼伤；烟柱升到设定高度，遇到顶棚就截断。浓烟式让余热留在同一根柱子里反复烫人；爆燃式一发更重、没有余热。",
        uses: ["烧到贴身与正上方的敌人", "让贴身的几个人灼伤", "用柱内余热逼人离开你的正上方与脚边", "打断贴身与低空的攻击节奏"],
        kind: "self",
        range: 3.2,
        maxRange: 5.6,
        prepare: 12,
        active: 20,
        recover: 10,
        cooldown: 36,
        style: "inferno",
        defaults: { fume: false, ai: { maxChase: 8, lofted: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("lavaplume", "ringRadius", pokemon), geometry: "area", style: "inferno",
                color: 0xFF7A2E, label: config && config.fume === true ? "浓烟喷烟" : "爆燃喷烟" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["lavaplume"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var fume = !!(config && config.fume);
            return {
                prepare: p("lavaplume", "prepare", context) + (fume ? 2 : 0),
                recover: p("lavaplume", "recover", context),
                cooldown: p("lavaplume", "cooldown", context) + (fume ? 10 : -2),
                active: skills["lavaplume"].active,
                range: p("lavaplume", "ringRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("lavaplume:stoke", lavaplumeScene, 1, action.origin(),
                JSON.stringify({ moment: "stoke", fume: config && config.fume === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scene = WorldFeedback.actionScenes(lavaplumeScene, 1);
            const world = action.world();
            const body = world.observe(action.actor());
            const base = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.2, p("lavaplume", "ringRadius", action));
            const power = p("lavaplume", "plume", action);
            const chance = p("lavaplume", "burnChance", action);
            const layers = Math.max(3, Math.round(p("lavaplume", "spreadTicks", action)));
            const height = Math.max(1.0, p("lavaplume", "plumeHeight", action));
            const emberPower = p("lavaplume", "ember", action);
            const emberTicks = Math.max(30, Math.round(p("lavaplume", "emberTicks", action)));
            const emberPulse = Math.max(4, Math.round(p("lavaplume", "emberPulse", action)));
            const cap = Math.max(1, Math.round(p("lavaplume", "maxTargets", action)));
            const fume = !!(config && config.fume);
            const scale = radius / 3.2;
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, elapsed = 0, total = 0, settled = false, top = height;

            /** 沿中心线向上探顶：有顶棚就把实际喷发高度截断在它下面。 */
            function ceiling(scope: CombatWorld): number {
                const probe = Math.max(0.4, height / 8);
                for (let h = probe; h <= height + 1e-6; h += probe) {
                    if (!scope.clear(base, base.plus(WorldCombat.point(0, h, 0)))) return Math.max(0.6, h - probe);
                }
                return height;
            }

            /** 柱内一层：以 `midY` 为高度中心、半径 `layerRadius` 的一圈，命中者交给 `visit`。 */
            function layer(scope: CombatWorld, midY: number, band: number, layerRadius: number, capped: boolean,
                visit: (enemy: CombatActor, facts: CombatObservation) => void): void {
                WorldGeometry.selectEnemies(scope,
                    WorldGeometry.ring(WorldCombat.point(base.x(), midY, base.z()), 0, layerRadius, { below: band, above: band }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === String(action.actor().ref())) return;
                        if (capped && hitRefs[ref]) return;
                        if (capped && total >= cap) return;
                        hitRefs[ref] = true;
                        visit(enemy, facts);
                    });
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scene.finish(current, function (next: CombatAction) {
                    const scope = next.world();
                    if (total === 0)
                        WorldFeedback.emit(scope, lavaplumeScene, 1, base,
                            { moment: "miss", radius: radius, height: top, scale: scale }, 18);
                    WorldFeedback.text(scope, base.plus(WorldCombat.point(0, 1.3, 0)),
                        total > 0 ? lavaplumeHitText : lavaplumeMissText, total > 0 ? [total] : [], 26);
                    done(next);
                });
            }

            /** 主喷：烟柱自下而上逐层升起，每个敌人只吃一次主伤；顶棚截断实际高度。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const layerTop = top * (step + 1) / layers, layerBottom = top * step / layers;
                const midY = base.y() + (layerTop + layerBottom) / 2;
                const layerRadius = radius * (0.9 + 0.1 * (step + 1) / layers);
                const band = Math.max(0.5, (layerTop - layerBottom) / 2 + 0.8);
                scene.show(current, "plume", base,
                    { moment: "plume", height: layerTop, radius: layerRadius, core: layerRadius * 0.7, scale: scale,
                      flow: Math.round(40 + layerTop * 24), intensity: Math.max(0.5, Math.min(2.2, power / 70)) });
                layer(scope, midY, band, layerRadius, true, function (enemy, facts) {
                    const alreadyBurned = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "lavaplume", power,
                        { damage: damageSpec("lavaplume", "plume"), status: "burn", chance: chance })) return;
                    total++;
                    WorldFeedback.emit(scope, lavaplumeScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), scale: scale, intensity: Math.max(0.5, Math.min(2, power / 70)), count: Math.round(10 + power * 0.25) }, 22);
                    if (!alreadyBurned && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), lavaplumeBurnText, [], 26);
                });
                step++;
                if (step < layers) { current.after(1, function (next: CombatAction) { advance(next); }); return; }
                if (top < height - 0.02)
                    WorldFeedback.emit(scope, lavaplumeScene, 1, base.plus(WorldCombat.point(0, top, 0)),
                        { moment: "cap", radius: radius, scale: scale, flow: Math.round(16 + radius * 8) }, 20);
                if (fume) { scene.stop(current, "plume"); pulse(current); return; }
                finish(current);
            }

            /** 浓烟式余热：仍在同一根柱内，按脉冲反复烫还没走开的人；每脉冲每人只结算一次。 */
            function pulse(current: CombatAction): void {
                const scope = current.world();
                top = ceiling(scope);
                const pulseLayers = Math.max(2, Math.round(top / 0.9));
                const seen: { [ref: string]: boolean } = {};
                scene.show(current, "ember", base,
                    { moment: "ember", height: top, radius: radius, scale: scale, flow: Math.round(30 + radius * 14), intensity: 0.6 });
                for (let i = 0; i < pulseLayers; i++) {
                    const layerTop = top * (i + 1) / pulseLayers, layerBottom = top * i / pulseLayers;
                    const midY = base.y() + (layerTop + layerBottom) / 2;
                    const layerRadius = radius * (0.9 + 0.1 * (i + 1) / pulseLayers);
                    const band = Math.max(0.5, (layerTop - layerBottom) / 2 + 0.8);
                    WorldGeometry.selectEnemies(scope,
                        WorldGeometry.ring(WorldCombat.point(base.x(), midY, base.z()), 0, layerRadius, { below: band, above: band }),
                        function (enemy, facts) {
                            const ref = String(enemy.ref());
                            if (ref === String(current.actor().ref()) || seen[ref]) return;
                            seen[ref] = true;
                            if (!hurt(current, enemy, "lavaplume", emberPower, { damage: damageSpec("lavaplume", "ember") })) return;
                            total++;
                            WorldFeedback.emit(scope, lavaplumeScene, 1, facts.position(),
                                { moment: "ember", target: ref, scale: scale, count: Math.round(6 + emberPower) }, 18);
                        });
                }
                elapsed += emberPulse;
                if (elapsed >= emberTicks) { finish(current); return; }
                current.after(emberPulse, function (next: CombatAction) { pulse(next); });
            }

            sound(action, "cobblemon:move.lavaplume.actor");
            sound(action, "minecraft:block.lava.pop");
            top = ceiling(world);
            advance(action);
        }
    });
}
