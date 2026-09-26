/**
 * 奇异之风 / ominouswind —— 注册与动作。
 *
 * 核心念头：一道贴着地面窜出的幽风追着目标跑，途中不伤人，到了实际终点才突然炸开、从四面朝中心收拢；
 *   一缕冷气倒卷回自身，有概率把五项战斗能力各抬一级。
 *
 * 三幕：
 *   起（gather，提交前）：施法者脚边卷起一圈冷雾、幽丝朝身前收，只播预告。
 *   奔（travel）：提交后幽风从脚下窜出，沿实际航向以每刻限定的转角追踪目标；总路程等于 `travel`，
 *       撞墙就在真实方块格提前收风，路程耗尽就在当前光标收风——绝不跳到目标位置瞬移。
 *   收（coil → hit / miss）：在实际终点炸开 `coilRadius` 一圈，只对可见且视线可达的敌人各结算一次 `squall`
 *       特殊伤害、朝中心收拢不超过 `pull`（不越过中心）；随后掷一次反哺，只按实际提高的项反馈，窗口保持一层。
 *
 * `kind: "aim"`：可对准任意实体或世界点；没有目标时朝瞄准方向前进，目标离场后按最后方向走完预算。
 */
namespace PokemonSkills {
    const ominouswindScene = "world_combat:move_ominouswind";
    const ominouswindSurgeText = "world_combat.move.ominouswind.text.surge";
    const ominouswindHitText = "world_combat.move.ominouswind.text.hit";
    const ominouswindMissText = "world_combat.move.ominouswind.text.miss";

    /** 把 from 方向朝 to 方向转动，每刻最多 maxRad 弧度；不会因为目标在正后方而瞬间掉头。 */
    function ominouswindTurn(from: CombatPoint, to: CombatPoint, maxRad: number): CombatPoint {
        const a = from.unit(), b = to.unit();
        let dot = a.x() * b.x() + a.y() * b.y() + a.z() * b.z();
        if (dot > 1) dot = 1; else if (dot < -1) dot = -1;
        const angle = Math.acos(dot);
        if (!(angle > maxRad)) return b;
        const t = maxRad / angle;
        const mid = a.scale(1 - t).plus(b.scale(t));
        return mid.length() > 1e-6 ? mid.unit() : a;
    }

    define({
        id: "ominouswind",
        cooldownParameter: "recharge",
        name: "Ominous Wind",
        description: "放出一道贴地奔袭的幽风：它沿有限的总路程、每刻限角追踪目标，途中只聚势，到实际终点才炸开，把那一圈视线可达的敌人朝中心收拢并造成特殊伤害；若是撞墙，就在墙面真实碰点提前卷起。回卷的冷气有概率把自身五项战斗能力短时各抬一级。缠魄式窄而重、收得更紧；漫游式快而宽。",
        uses: ["对准一个远处目标，让幽风自己追上去收拢", "把目标从掩体或队友身边朝中心拽近", "抓住反哺后的短时强化窗口进攻"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 32,
        style: "spectral",
        defaults: { haunt: false, ai: { maxChase: 14, chaseRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("ominouswind", "coilRadius", pokemon), geometry: "line", style: "spectral", color: 0x9BA8C8,
                label: config && config.haunt === true ? "缠魄式" : "奇异之风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["ominouswind"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("ominouswind", "tempo", context)),
                recover: Math.round(p("ominouswind", "aftercast", context)),
                cooldown: Math.round(p("ominouswind", "recharge", context)),
                active: 0,
                range: p("ominouswind", "travel", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("ominouswind:gather", ominouswindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", radius: p("ominouswind", "coilRadius", action),
                    haunt: config && config.haunt === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(ominouswindScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { scenes.finish(action, done); return; }
            const start = body.position();
            const aimPoint = action.targetPosition();
            const target = action.target();
            const power = p("ominouswind", "squall", action);
            const reach = Math.max(2, p("ominouswind", "travel", action));
            const speed = Math.max(0.2, p("ominouswind", "front", action));
            const turn = Math.max(4, p("ominouswind", "turn", action)) * Math.PI / 180;
            const coilRadius = Math.max(1.5, p("ominouswind", "coilRadius", action));
            const pull = p("ominouswind", "pull", action);
            const chance = Math.max(0.02, Math.min(0.9, p("ominouswind", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("ominouswind", "surgeStages", action)));
            const wisps = Math.max(12, Math.round(p("ominouswind", "wisps", action)));
            const scale = Math.max(0.6, Math.min(2.2, coilRadius / 2.0));
            const intensity = Math.max(0.5, Math.min(2.4, power / 62));
            const initial = aimPoint.minus(start);
            let heading = initial.length() > 0.05 ? initial.unit() : WorldGeometry.flatUnit(action.direction(), WorldCombat.point(0, 0, 1));
            let cursor = start, travelled = 0;
            const maxSteps = Math.max(3, Math.ceil(reach / Math.max(0.3, speed)) + 8);
            const trail: number[][] = [[start.x(), start.y() + 0.4, start.z()]];

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, ominouswindScene, 1, start,
                { moment: "gather", radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity }, 20);

            function coil(current: CombatAction, end: CombatPoint, face: string): void {
                const scope = current.world();
                scenes.stop(current, "travel");
                if (face) WorldFeedback.emit(scope, ominouswindScene, 1, end,
                    { moment: "scatter", radius: coilRadius, wisps: wisps, scale: scale, face: face }, 20);
                WorldFeedback.emit(scope, ominouswindScene, 1, end,
                    { moment: "coil", radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity }, 28);
                sound(current, "minecraft:entity.breeze.wind_burst");
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(end, 0, coilRadius, { below: 2, above: 2.5 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    const point = facts.position();
                    if (!facts.visible() || !scope.clear(end, point)) return;
                    if (!hurt(current, enemy, "ominouswind", power, { damage: damageSpec("ominouswind", "squall") })) return;
                    hits++;
                    const inward = end.minus(point);
                    const distance = inward.length();
                    if (scope.valid(enemy) && distance > 0.15) {
                        // 按当前真终点求值：只收拢到中心附近，不越过中心。
                        const pullNow = Math.min(pull, distance - 0.2);
                        if (pullNow > 0.05) scope.displace(enemy, inward.unit().scale(pullNow));
                    }
                    WorldFeedback.emit(scope, ominouswindScene, 1, point,
                        { moment: "hit", target: String(enemy.ref()), radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity }, 22);
                });
                if (hits === 0) {
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), ominouswindMissText, [], 22);
                    WorldFeedback.emit(scope, ominouswindScene, 1, end, { moment: "miss", radius: coilRadius, scale: scale }, 20);
                    scenes.finish(current, done);
                    return;
                }
                WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.1, 0)), ominouswindHitText, [hits], 26);
                if (scope.random() < chance && scope.valid(actor)) {
                    const window = Math.max(1, Math.round(p("ominouswind", "surgeTicks", current)));
                    const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
                    scope.effects(actor, definition).forEach(function (view) {
                        const data = JSON.parse(String(view.data()));
                        if (data.source === "world_combat:move/ominouswind") NativeEffects.windowClose(scope, view.id());
                    });
                    const before = NativeEffects.effectiveStages(scope, actor);
                    const windowId = NativeEffects.boostWindow(scope, actor, { atk: stages, def: stages, spa: stages, spd: stages, spe: stages },
                        window, "world_combat:move/ominouswind");
                    if (windowId > 0) {
                        const after = NativeEffects.effectiveStages(scope, actor);
                        const rise: any = {};
                        let raised = 0, best = 0;
                        ["atk", "def", "spa", "spd", "spe"].forEach(function (stat) {
                            const gain = Math.max(0, Math.round((after[stat] || 0) - (before[stat] || 0)));
                            if (gain > 0) { rise[stat] = gain; raised++; if (gain > best) best = gain; }
                        });
                        if (raised > 0) {
                            const self = scope.observe(actor);
                            const at = self === null ? start : self.position();
                            WorldFeedback.emit(scope, ominouswindScene, 1, at,
                                { moment: "surge", target: String(actor.ref()), rise: rise, stages: best, radius: coilRadius, wisps: wisps, scale: scale }, 28);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.4 : self.height() + 0.1, 0)),
                                ominouswindSurgeText, [raised, best, Math.round(window / 20)], 30);
                            scope.sound("minecraft:block.beacon.power_select", at, 18, "{}");
                        }
                    }
                }
                scenes.finish(current, done);
            }

            function advance(current: CombatAction, index: number): void {
                const scope = current.world();
                let destination = aimPoint;
                if (target !== null && scope.valid(target)) {
                    const facts = scope.observe(target);
                    if (facts !== null) destination = facts.position();
                }
                const toEnd = destination.minus(cursor);
                const distance = toEnd.length();
                if (travelled >= reach - 0.05 || index >= maxSteps) { coil(current, cursor, ""); return; }
                if (distance <= Math.max(0.6, coilRadius)) { coil(current, cursor, ""); return; }
                heading = ominouswindTurn(heading, toEnd, turn);
                const stepLength = Math.min(speed, reach - travelled);
                const next = cursor.plus(heading.scale(stepLength));
                const clip = scope.clipBlocks(cursor, next);
                let end = next, face = "";
                if (clip !== null && clip.blocked()) { end = clip.position(); face = clip.blockFace(); }
                const moved = end.minus(cursor).length();
                cursor = end;
                travelled += moved;
                trail.push([cursor.x(), cursor.y() + 0.4, cursor.z()]);
                if (trail.length > 24) trail.shift();
                scenes.show(current, "travel", cursor,
                    { moment: "travel", radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity, path: trail.slice() });
                if (face) { coil(current, cursor, face); return; }
                if (moved < 0.02) { coil(current, cursor, ""); return; }
                current.after(1, function (next2: CombatAction) { advance(next2, index + 1); });
            }

            advance(action, 0);
        }
    });
}
