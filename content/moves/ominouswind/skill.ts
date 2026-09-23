/**
 * 奇异之风 / ominouswind —— 注册与动作。
 *
 * 核心念头：一道贴着地面窜出的幽风追着目标跑，途中不伤人，到了目标脚下才突然炸开、从四面朝中心收拢；
 *   一缕冷气倒卷回自身，有概率把五项战斗能力各抬一级。
 *
 * 三幕：
 *   起（gather，提交前）：施法者脚边卷起一圈冷雾、幽丝朝身前收，只播预告。
 *   奔（travel）：提交后幽风从脚下窜出，沿一条会小幅转向（轻追踪）的线路奔向目标；途中只聚势，不结算。
 *   收（coil → hit / miss）：抵达目标脚下炸开 `coilRadius` 一圈，圈内每个非友方各结算一次 `squall` 特殊伤害、
 *       被朝中心收拢 `pull` 格；随后掷一次反哺，成功则攻击、防御、特攻、特防、速度各升 `surgeStages` 级。
 *
 * 配置 `haunt`（缠魄式）由 resolve 改时序、由公式改半径／威力／内收／反哺：开启＝窄而重、收得更紧，但奔袭更慢。
 */
namespace PokemonSkills {
    const ominouswindScene = "world_combat:move_ominouswind";
    const ominouswindSurgeText = "world_combat.move.ominouswind.text.surge";
    const ominouswindHitText = "world_combat.move.ominouswind.text.hit";
    const ominouswindMissText = "world_combat.move.ominouswind.text.miss";

    define({
        id: "ominouswind",
        cooldownParameter: "recharge",
        name: "Ominous Wind",
        description: "放出一道贴地奔袭的幽风：它一路只聚势、到目标脚下才炸开，把那一圈敌人朝中心收拢并造成特殊伤害；回卷的冷气有概率把自身五项战斗能力各抬一级。缠魄式窄而重、收得更紧；漫游式快而宽。",
        uses: ["对准一个远处目标，让幽风自己追上去收拢", "把目标从掩体或队友身边朝中心拽近", "用反哺把五项战斗能力在短时反哺期间提高"],
        kind: "enemy",
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
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const start = body.position();
            const aimPoint = action.targetPosition();
            const target = action.target();
            const power = p("ominouswind", "squall", action);
            const reach = p("ominouswind", "travel", action);
            const speed = Math.max(0.2, p("ominouswind", "front", action));
            const coilRadius = Math.max(1.5, p("ominouswind", "coilRadius", action));
            const pull = p("ominouswind", "pull", action);
            const chance = Math.max(0.02, Math.min(0.9, p("ominouswind", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("ominouswind", "surgeStages", action)));
            const wisps = Math.max(12, Math.round(p("ominouswind", "wisps", action)));
            const scale = Math.max(0.6, Math.min(2.2, coilRadius / 2.0));
            const intensity = Math.max(0.5, Math.min(2.4, power / 62));
            const initial = aimPoint.minus(start);
            const fallback = initial.length() < 0.05 ? aim(action) : initial.unit();
            const maxSteps = Math.max(2, Math.round(reach / speed));
            let cursor = start;

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, ominouswindScene, 1, start,
                { moment: "gather", radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity }, 20);

            function coil(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.emit(scope, ominouswindScene, 1, cursor,
                    { moment: "coil", radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity }, 28);
                sound(current, "minecraft:entity.breeze.wind_burst");
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(cursor, 0, coilRadius, { below: 2, above: 2.5 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    if (!hurt(current, enemy, "ominouswind", power, { damage: damageSpec("ominouswind", "squall") })) return;
                    hits++;
                    const inward = cursor.minus(facts.position());
                    if (scope.valid(enemy) && inward.length() > 0.1)
                        scope.displace(enemy, inward.unit().scale(pull));
                    WorldFeedback.emit(scope, ominouswindScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity }, 22);
                });
                if (hits === 0) {
                    WorldFeedback.text(scope, cursor.plus(WorldCombat.point(0, 1.0, 0)), ominouswindMissText, [], 22);
                    WorldFeedback.emit(scope, ominouswindScene, 1, cursor, { moment: "miss", radius: coilRadius, scale: scale }, 20);
                    done(current);
                    return;
                }
                WorldFeedback.text(scope, cursor.plus(WorldCombat.point(0, 1.1, 0)), ominouswindHitText, [hits], 26);
                if (scope.random() < chance && scope.valid(actor)) {
                    const window = Math.max(1, Math.round(p("ominouswind", "surgeTicks", current)));
                    const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
                    scope.effects(actor, definition).forEach(function (view) {
                        const data = JSON.parse(String(view.data()));
                        if (data.source === "world_combat:move/ominouswind") NativeEffects.windowClose(scope, view.id());
                    });
                    NativeEffects.boostWindow(scope, actor, { atk: stages, def: stages, spa: stages, spd: stages, spe: stages }, window, "world_combat:move/ominouswind");
                    const self = scope.observe(actor);
                    const at = self === null ? start : self.position();
                    WorldFeedback.emit(scope, ominouswindScene, 1, at,
                        { moment: "surge", target: String(actor.ref()), stages: stages, radius: coilRadius, wisps: wisps, scale: scale }, 28);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.4 : self.height() + 0.1, 0)),
                        ominouswindSurgeText, [stages, Math.round(window / 20)], 30);
                    scope.sound("minecraft:block.beacon.power_select", at, 18, "{}");
                }
                done(current);
            }

            function advance(current: CombatAction, step: number): void {
                const scope = current.world();
                let destination = aimPoint;
                if (target !== null && scope.valid(target)) {
                    const facts = scope.observe(target);
                    if (facts !== null) destination = facts.position();
                }
                const delta = destination.minus(cursor);
                const distance = delta.length();
                if (distance <= Math.max(0.6, coilRadius) || step >= maxSteps) { cursor = destination; coil(current); return; }
                const heading = delta.unit();
                cursor = cursor.plus(heading.scale(Math.min(speed, distance)));
                WorldFeedback.keep(scope, "ominouswind:travel:" + String(current.actor().ref()), ominouswindScene, 1, cursor,
                    { moment: "travel", radius: coilRadius, wisps: wisps, scale: scale, intensity: intensity,
                      path: [[start.x(), start.y() + 0.4, start.z()], [cursor.x(), cursor.y() + 0.4, cursor.z()]] }, 8);
                current.after(1, function (next: CombatAction) { advance(next, step + 1); });
            }

            advance(action, 0);
        }
    });
}
