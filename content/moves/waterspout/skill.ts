/**
 * 喷水 / waterspout 的出手方式。
 *
 * 核心念头：从脚下掀起一道向外推涌的潮墙——水先在地上兜起来，再整圈漫出去；潮头扫过谁，
 * 谁就挨一次浪、被推着走、浇得湿透，身上的火也被浇熄。满血时水势最大，下雨时更盛。
 *
 * 三幕：
 *   起（windup，提交前）：水在脚边打转、越兜越满，只播预告。
 *   涌（surge → hit）：提交后潮头从中心一格格向外推；每推进一格，这一圈带状区域里还没被扫到的
 *       非友方各挨一次 `surge`，被沿背离方向推 `carry`（回卷式改为拉向自己）、挂上湿透身份、
 *       浇灭灼伤与身上的火；潮头的圈就是会被扫到的那块。
 *   退（recede）：水退回去，只留地上一圈湿痕提示，不再造成伤害。
 *
 * 配置 `undertow`（回卷式）由公式改威力/距离/湿身、由这里改推的方向：把潮水收回来，把人拉到自己面前。
 */
namespace PokemonSkills {
    const waterspoutScene = "world_combat:move_waterspout";
    const waterspoutSoaked = "world_combat:waterspout_soaked";
    const waterspoutHitText = "world_combat.move.waterspout.text.hit";
    const waterspoutMissText = "world_combat.move.waterspout.text.miss";
    const waterspoutDouseText = "world_combat.move.waterspout.text.douse";
    const waterspoutSoakText = "world_combat.move.waterspout.text.soak";

    define({
        id: "waterspout",
        name: "Water Spout",
        description: "从脚下掀起一道向外推涌的潮墙：潮头扫过身周一圈的敌人，各挨一次浪、被推着走并浇得湿透，身上的火也被浇熄。威力随自身剩余血量下降，满血时最盛；下雨时水势更大。回卷式把水收回来、把人拉向自己。",
        uses: ["被围住时一次把一圈人推开", "浇熄一群敌人身上的火、浇他们一身湿", "把贴身的追击者从脸上冲开", "在雨里打出最大的一记范围水击"],
        kind: "self",
        range: 3.2,
        maxRange: 6.4,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 42,
        maximumTicks: 180,
        style: "tide",
        defaults: { undertow: false, ai: { maxChase: 8, peel: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("waterspout", "waveDistance", pokemon), geometry: "area", style: "tide",
                color: 0x4FB6E8, label: config && config.undertow === true ? "回卷喷水" : "推涌喷水" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["waterspout"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            const undertow = !!(config && config.undertow);
            return {
                prepare: Math.round(p("waterspout", "prepare", context) + (undertow ? 2 : 0)),
                recover: Math.round(p("waterspout", "recover", context)),
                cooldown: Math.round(p("waterspout", "cooldown", context) + (undertow ? 6 : 0)),
                active: skills["waterspout"].active,
                range: p("waterspout", "waveDistance", context)
            };
        },
        windup: function (action, config, prepare) {
            const undertow = !!(config && config.undertow);
            action.present("waterspout:gather", waterspoutScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", undertow: undertow ? 1 : 0, distance: p("waterspout", "waveDistance", action),
                    volume: Math.round(p("waterspout", "volume", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const actorRef = String(actor.ref());
            const surge = p("waterspout", "surge", action);
            const distance = Math.max(2.4, p("waterspout", "waveDistance", action));
            const waveTicks = Math.max(14, Math.round(p("waterspout", "waveTicks", action)));
            const carry = p("waterspout", "carry", action);
            const soakTicks = Math.max(60, Math.round(p("waterspout", "soakTicks", action)));
            const thickness = p("waterspout", "frontThickness", action);
            const volume = Math.max(30, Math.round(p("waterspout", "volume", action)));
            const undertow = !!(config && config.undertow);
            const scale = distance / 3.2;
            const steps = Math.max(5, Math.round(distance / 0.55));
            const perStep = Math.max(1, Math.round(waveTicks / steps));
            const stepDistance = distance / steps;
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, front = 0, scanned = 0;
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.keep(scope, "waterspout:recede:" + actorRef, waterspoutScene, 1, centre,
                    { moment: "recede", radius: distance, volume: volume, scale: scale }, 26);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    scanned > 0 ? waterspoutHitText : waterspoutMissText, scanned > 0 ? [scanned] : [], 26);
                done(current);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const inner = Math.max(0, front - thickness);
                const outer = front + 0.45;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: 2.6 }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === actorRef || hitRefs[ref]) return;
                        hitRefs[ref] = true;
                        if (!hurt(current, enemy, "waterspout", surge, { damage: damageSpec("waterspout", "surge") })) return;
                        scanned++;
                        const away = facts.position().minus(centre);
                        if (scope.valid(enemy) && away.length() > 0.2) {
                            const direction = WorldCombat.point(away.x(), 0, away.z()).unit();
                            scope.displace(enemy, direction.scale(undertow ? -carry : carry));
                        }
                        const wasBurning = CombatStatus.has(scope, enemy, "burn");
                        if (wasBurning && CombatStatus.cure(scope, enemy, "burn")) {
                            scope.ignite(enemy, 0);
                            WorldFeedback.emit(scope, waterspoutScene, 1, facts.position(),
                                { moment: "douse", target: ref, scale: scale }, 22);
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), waterspoutDouseText, [], 22);
                        }
                        const wasSoaked = CombatStatus.has(scope, enemy, "soaked");
                        CombatStatus.apply(scope, enemy, "soaked", waterspoutSoaked, soakTicks, 0, { secondary: true, unique: true });
                        if (!wasSoaked && CombatStatus.has(scope, enemy, "soaked"))
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), waterspoutSoakText, [], 22);
                        scope.sound("cobblemon:impact.water", facts.position(), 14, "{}");
                        WorldFeedback.emit(scope, waterspoutScene, 1, facts.position(),
                            { moment: "hit", target: ref, scale: scale, volume: volume, splash: Math.max(8, Math.round(volume * 0.22)),
                                undertow: undertow ? 1 : 0, intensity: Math.max(0.5, Math.min(2.2, surge / 110)) }, 22);
                    });
                WorldFeedback.keep(scope, "waterspout:wave:" + actorRef, waterspoutScene, 1, centre,
                    { moment: "surge", radius: Math.max(0.6, front), distance: distance, volume: volume,
                        flow: Math.max(20, Math.round(volume * 0.8 + front * 8)), inward: undertow ? volume : 0,
                        scale: scale, step: step, steps: steps, undertow: undertow ? 1 : 0 }, perStep + 6);
                step++;
                front = Math.min(distance, front + stepDistance);
                if (step >= steps) { finish(current); return; }
                current.after(perStep, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:entity.dolphin.splash");
            WorldFeedback.emit(world, waterspoutScene, 1, centre,
                { moment: "gather", undertow: undertow ? 1 : 0, distance: distance, volume: volume, scale: scale }, 20);
            advance(action);
        }
    });
}
