/**
 * 尖刺臂 / needlearm —— 注册与动作。
 *
 * 核心念头：压低身子扑上一步，带刺的手臂从右到左抡过一大片扇形；转过的每一段扇面都扫一遍，
 *   被扫中的人挨一记接触伤害、有概率一滞；一个敌人在整套挥臂里只挨一次主伤。手臂收势，危险就结束，
 *   地上不留任何东西。
 *
 * 三幕：
 *   起（coil，提交前）：压低身子、把刺拢到臂上，只播预告，可被打断。
 *   扑（drive → rake / whiff）：提交后沿玩家选定的方向短扑一步；扑进被墙或身体挡住就停在那里起抡。
 *   扫（rake × 3）：从右到左按 `arc / 3` 的三段真实扇面依次扫过；每段再切几小段，逐刻只结算当前这一小段
 *       真正扫到、且与自身之间通视的非友方；还没被这一套挥臂打过的结算一次 `rake` 接触伤害、按 `flinchChance`
 *       掷畏缩，然后记下不再重复。判定与画面共用 `needlearmTurn` 的同一偏角端点，同拍臂端由右向左。
 *       三段都没扫到人就是空扫，仍按完整挥臂收招。
 *
 * 选取：`kind: "aim"`——方向或敌人辅助瞄准都行；方块拦身位（扑不过去）但不生成任何地形。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `broad`（横扫式）由 resolve 改时序、由公式改挥击/半径/张角，提交后才触碰世界。
 */
namespace PokemonSkills {
    function needlearmFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, needlearmFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 把瞄准方向在水平面内旋转 `angle` 度（正角朝施法者右侧），得到该拍扇面的中心方向。 */
    function needlearmTurn(direction: CombatPoint, angle: number): CombatPoint {
        const radians = angle * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, 0, direction.x() * sin + direction.z() * cos);
    }

    /** 一段扇面的有序顶点（原点 + 弧点），与 `needlearmTurn` 用同一偏角约定，判定与表现共用端点。 */
    function needlearmArc(origin: CombatPoint, direction: CombatPoint, span: number, startOffset: number, endOffset: number, samples: number): number[][] {
        const points: number[][] = [[origin.x(), origin.y() + 0.08, origin.z()]];
        for (let index = 0; index <= samples; index++) {
            const at = needlearmTurn(direction, startOffset + (endOffset - startOffset) * index / samples);
            points.push([origin.x() + at.x() * span, origin.y() + 0.08, origin.z() + at.z() * span]);
        }
        return points;
    }

    define({
        freeMovement: true,
        id: needlearmId,
        cooldownParameter: "recharge",
        name: "Needle Arm",
        description: "压低身子短扑一步，用带刺的手臂从右到左横扫一大片扇形：被扫中的人挨一记物理伤害、有几率被打得畏缩（短暂无法出招），一个敌人在整套挥臂里只受一次主伤。横扫式扇面更宽、挥扫更远；重挥式挥得更重、出手更快。",
        uses: ["贴身横扫一大片，把围上来的敌人一起扫开", "对付贴着你绕行的目标，宽扇面不容易漏", "多段挥臂只结算一次主伤，扫一片也不爆发"],
        kind: "aim",
        range: 3.4,
        maxRange: 4.6,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 20,
        style: "grass",
        defaults: { broad: false, ai: { maxChase: 7, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(needlearmId, "span", pokemon), geometry: "cone", style: "grass", color: 0x8FC63A,
                label: config && config.broad === true ? "横扫式尖刺臂" : "尖刺臂" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[needlearmId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(needlearmId, "tempo", context)),
                recover: Math.round(p(needlearmId, "aftercast", context)),
                cooldown: Math.round(p(needlearmId, "recharge", context)),
                active: 0,
                range: p(needlearmId, "span", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("needlearm:coil", needlearmScene, 1, action.origin(), JSON.stringify({ moment: "coil" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(needlearmScene);
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const span = p(needlearmId, "span", action);
            const lunge = p(needlearmId, "lunge", action);
            const speed = p(needlearmId, "swing", action);
            const arc = p(needlearmId, "arc", action);
            const power = p(needlearmId, "rake", action);
            const chance = p(needlearmId, "flinchChance", action);
            const flinchTicks = Math.round(p(needlearmId, "flinchTicks", action));
            const thorns = Math.max(12, Math.round(p(needlearmId, "thorns", action)));
            const minimum = p(needlearmId, "minimumMove", action);
            const scale = Math.max(0.6, Math.min(2.0, span / needlearmReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            const struck: { [ref: string]: boolean } = {};
            const beatStep = arc / needlearmBeats, subs = 3, sliceStep = beatStep / subs;
            const beatGap = Math.max(4, Math.min(8, Math.round(arc / needlearmBeats / 25)));
            const half = arc / 2;
            let travelled = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            /** 一拍里的一段窄扇：判定与路径共用同一偏角一端点，只结算这一段真正扫到的人，每敌整套挥臂一次。 */
            function rake(current: CombatAction, beat: number, sub: number): void {
                if (settled) return;
                if (beat === 0 && sub === 0) movementScenes.stop(current, "drive");
                const scope = current.world(), origin = current.origin();
                const edge = half - beatStep * beat;
                const to = edge - sliceStep * sub, from = to - sliceStep;
                const heading = needlearmTurn(direction, (from + to) / 2);
                const region = WorldGeometry.sector(origin, heading, span, sliceStep * 1.15, { below: 1.0, above: 2.4 });
                const path = needlearmArc(origin, direction, span, from - sliceStep * 0.08, to + sliceStep * 0.08, 4);
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || struck[ref] === true) return;
                    if (!scope.clear(origin, facts.position())) return;
                    if (!hurt(current, enemy, needlearmId, power, { damage: damageSpec(needlearmId, "rake"), contact: true })) return;
                    struck[ref] = true; hits++;
                    WorldFeedback.emit(scope, needlearmScene, 1, facts.position(),
                        { moment: "strike", target: ref, thorns: thorns, scale: scale, intensity: intensity }, 20);
                    if (scope.random() < chance && needlearmFlinch(scope, enemy, flinchTicks)) {
                        WorldFeedback.emit(scope, needlearmScene, 1, facts.position(), { moment: "flinch", target: ref }, 18);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.35, 0)), needlearmFlinchText, [], 18);
                    }
                });
                WorldFeedback.emit(scope, needlearmScene, 1, origin,
                    { moment: "rake", path: path, thorns: thorns, scale: scale, intensity: intensity }, 8);
                sound(current, "cobblemon:impact.grass");
                if (sub + 1 < subs) { current.after(1, function (next: CombatAction) { rake(next, beat, sub + 1); }); return; }
                if (beat + 1 < needlearmBeats) {
                    current.after(Math.max(1, beatGap - subs), function (next: CombatAction) { rake(next, beat + 1, 0); });
                    return;
                }
                if (hits === 0) {
                    WorldFeedback.emit(scope, needlearmScene, 1, origin, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.05, 0)), needlearmMissText, [], 22);
                }
                else
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.1, 0)), needlearmHitText, [hits], 22);
                finish(current);
            }

            /** 短扑：沿瞄准方向压上，被墙/身体挡住就停在原地起抡；扑击本身不造成伤害。 */
            function advance(current: CombatAction): void {
                const remaining = Math.max(0, lunge - travelled);
                if (remaining <= 0.001) { rake(current, 0, 0); return; }
                const stepDistance = Math.min(speed, remaining);
                const swept = sweepStep(current, direction.scale(stepDistance), 0.35);
                const moved = swept.moved;
                travelled += moved;
                if (swept.hit.blocked() || swept.hit.hitEntity() || moved < minimum || travelled >= lunge) { rake(current, 0, 0); return; }
                current.after(1, advance);
            }

            sound(action, "cobblemon:move.razorleaf.actor_1");
            // 扑（drive）：带刺手臂拢着叶与刺向前压上；emitter 绑 source，随扑出的身形铺开。
            movementScenes.show(action, "drive", action.origin(), { moment: "drive", thorns: thorns, scale: scale, intensity: intensity });
            advance(action);
        }
    });

}
