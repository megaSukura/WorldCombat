/**
 * 喷水 / waterspout 的出手方式。
 *
 * 核心念头：从脚下掀起一道潮墙——水先在地上兜起来，再整圈漫出去；潮头扫过谁，谁就挨一次浪、
 * 被推着走、浇得湿透，身上的火也被浇熄。满血时水势最大，下雨时更盛。
 *
 * 两式方向相反、都从一端扫到另一端：
 *   推涌式（默认）：潮头从中心 0 一格格外推到 `distance`，扫到的目标被沿背离方向推走。
 *   回卷式（`undertow`）：潮头从最外缘 `distance` 一格格收向中心 0，扫到的目标被拉向自己。
 *   两端都覆盖，每个人只结算一次；被实体墙截住的那一路浇不中。
 *
 * 三幕：
 *   起（windup／gather，提交前）：水在脚边打转、越兜越满，只播预告。
 *   涌（surge → hit）：潮头按上面方向逐步推进；每推进一格，这一圈薄前沿里还没被扫到的非友方
 *       各挨一次 `surge`、按实际方向被推／拉 `carry`、挂上湿透身份、浇灭灼伤与身上的火。
 *   退（recede）：水退回去，只留地上一圈湿痕提示，不再造成伤害。
 *
 * 持续推进用 `WorldFeedback.actionScenes` 随动作转段 stop；消退是独立余波，按自己寿命留存。
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
        description: "从脚下掀起一道潮墙：推涌式的潮头从中心向外推，扫过身周一圈的敌人，各挨一次浪、被推着走并浇得湿透，身上的火也被浇熄；回卷式的潮头从外缘收回来，把人拉向自己。威力随自身剩余血量下降，满血时最盛；下雨时水势更大。",
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
            const distance = Math.max(2.4, p("waterspout", "waveDistance", action));
            const waveTicks = Math.max(14, Math.round(p("waterspout", "waveTicks", action)));
            const carry = p("waterspout", "carry", action);
            const soakTicks = Math.max(60, Math.round(p("waterspout", "soakTicks", action)));
            const thickness = p("waterspout", "frontThickness", action);
            const volume = Math.max(30, Math.round(p("waterspout", "volume", action)));
            const undertow = !!(config && config.undertow);
            const scale = distance / 3.2;
            const steps = Math.max(6, Math.round(distance / 0.5));
            const perStep = Math.max(1, Math.round(waveTicks / steps));
            const stepDistance = distance / steps;
            const band = { below: 2, above: 2.6 };
            const hitRefs: { [ref: string]: boolean } = {};
            const scenes = WorldFeedback.actionScenes(waterspoutScene, 1);
            let scanned = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 独立余波：湿痕停留在潮水实际到达过的最外圈，不提前收画。
                WorldFeedback.keep(scope, "waterspout:recede:" + actorRef, waterspoutScene, 1, centre,
                    { moment: "recede", radius: distance, volume: volume, scale: scale }, 26);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    scanned > 0 ? waterspoutHitText : waterspoutMissText, scanned > 0 ? [scanned] : [], 26);
                scenes.stop(current);
                done(current);
            }

            function advance(current: CombatAction, step: number): void {
                if (settled) return;
                const scope = current.world();
                const self = scope.observe(current.actor());
                const here = self !== null ? self.position() : centre;
                // 推涌式向外（0 → distance），回卷式向内（distance → 0）；两端都扫到。
                const front = undertow ? distance - step * stepDistance : step * stepDistance;
                const inner = Math.max(0, front - thickness);
                const outer = Math.min(distance, front + thickness);
                const surge = p("waterspout", "surge", current);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(here, inner, outer, band), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === actorRef || hitRefs[ref]) return;
                    // 方向被完整实墙截住的水路浇不中。
                    if (!scope.clear(here, facts.position())) return;
                    hitRefs[ref] = true;
                    if (!hurt(current, enemy, "waterspout", surge, { damage: damageSpec("waterspout", "surge") })) return;
                    scanned++;
                    const away = facts.position().minus(here);
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
                            intensity: Math.max(0.5, Math.min(2.2, surge / 110)) }, 22);
                });
                const midway = Math.abs(front - distance * 0.5);
                const flow = Math.max(18, Math.round(volume * 0.7 + (distance * 0.5 - midway) * 16));
                scenes.show(current, "surge", here,
                    { moment: "surge", radius: Math.max(0.6, front), volume: volume, waveTicks: waveTicks,
                        flow: undertow ? Math.round(flow * 0.35) : flow,
                        inward: undertow ? volume : 0, scale: scale });
                if (step >= steps) { finish(current); return; }
                current.after(perStep, function (next: CombatAction) { advance(next, step + 1); });
            }

            sound(action, "minecraft:entity.dolphin.splash");
            WorldFeedback.emit(world, waterspoutScene, 1, centre,
                { moment: "gather", undertow: undertow ? 1 : 0, distance: distance, volume: volume, scale: scale }, 20);
            advance(action, 0);
        }
    });
}
