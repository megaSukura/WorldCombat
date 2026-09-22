/**
 * 百万吨重拳 / megapunch 的出手方式。
 *
 * 核心念头：**一记灌注全身质量的正拳，沿身前一条笔直的窄道把正前方的东西整块推出去**——不是连拳（迷昏拳），
 * 不是横扫（爆裂拳），是一支活塞。它不带任何元素状态，身份全在**质量与直线**：站在窄道里就吃，侧身就让开；
 * 吃中的人被沿同一条线推飞，推得多远取决于施法者有多重、目标有多大。
 *
 * 两幕：
 *   起（windup，提交前）：收拳沉腰、后脚蹬地，只播预告。
 *   击（thrust）：提交后沿瞄准方向打出一条窄道，窄道里的非友方各吃一记 megaton 接触+拳伤害；
 *       命中的目标被沿同一方向推开 `shove`（分成几步推出，读得出是"被轰飞"而不是瞬移）。
 *   收：一个人都没打中只留一拳破风（whiff）。
 *
 * 配置 `planted`（扎根式）由 resolve 改时序、由公式改威力与击退，提交后才触碰世界。
 */
namespace PokemonSkills {
    const megapunchScene = "world_combat:move_megapunch";
    const megapunchHitText = "world_combat.move.megapunch.text.hit";
    const megapunchMissText = "world_combat.move.megapunch.text.miss";

    /** 窄道的四个有序顶点（近左、近右、远右、远左）：判定用 lane，画面用同一组点填成带。 */
    function megapunchLane(origin: CombatPoint, direction: CombatPoint, reach: number, bore: number): number[][] {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const near = origin.plus(WorldCombat.point(0, -0.5, 0));
        const far = near.plus(heading.scale(reach));
        const a = near.plus(side.scale(bore)), b = near.minus(side.scale(bore));
        const c = far.minus(side.scale(bore)), d = far.plus(side.scale(bore));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()], [c.x(), c.y(), c.z()], [d.x(), d.y(), d.z()]];
    }

    define({
        id: "megapunch",
        name: "Mega Punch",
        description: "The user winds up and throws one full-bodied straight punch down a narrow lane. What stands in the lane takes the blow and is shoved straight back by the user's mass; step aside and it misses.",
        uses: ["在窄道内一记定音重拳", "把正面的目标整块推离原位", "对站桩的目标打一发最重的单体伤害"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.2,
        prepare: 9,
        active: 18,
        recover: 11,
        cooldown: 42,
        style: "punch",
        defaults: { planted: false, ai: { maxChase: 5, preferWounded: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megapunch", "fistReach", pokemon) + 0.3, geometry: "line", style: "punch", color: 0xC9B37A,
                label: config && config.planted === true ? "扎根重拳" : "百万吨重拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["megapunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("megapunch", "wind", context)),
                recover: Math.round(p("megapunch", "brace", context)),
                cooldown: Math.round(p("megapunch", "recharge", context)),
                active: skills["megapunch"].active,
                range: p("megapunch", "fistReach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_megapunch:windup", megapunchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", planted: config && config.planted === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("megapunch", "fistReach", action);
            const bore = p("megapunch", "bore", action);
            const power = p("megapunch", "megaton", action);
            const shove = Math.max(0.2, p("megapunch", "shove", action));
            const rings = Math.max(2, Math.round(p("megapunch", "rings", action)));
            const scale = reach / 2.3;
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const flows = Math.max(40, Math.round(90 + rings * 14 + bore * 40));
            const pushed: string[] = [];
            const perStep = 0.55;
            const steps = Math.max(1, Math.min(4, Math.ceil(shove / perStep)));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function launch(current: CombatAction, index: number): void {
                if (index >= steps) { finish(current); return; }
                const scope = current.world();
                const step = Math.min(perStep, shove - index * perStep);
                for (let i = 0; i < pushed.length; i++) {
                    const victim = scope.actor(pushed[i]);
                    if (victim === null || !scope.valid(victim)) continue;
                    scope.displace(victim, direction.scale(step));
                    const body = scope.observe(victim);
                    if (body === null) continue;
                    WorldFeedback.emit(scope, megapunchScene, 1, body.position(),
                        { moment: "launch", target: pushed[i], intensity: intensity, scale: scale }, 14);
                }
                if (index === 0) sound(current, "minecraft:entity.player.attack.knockback");
                current.after(1, function (next: CombatAction) { launch(next, index + 1); });
            }

            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, megapunchScene, 1, origin,
                { moment: "thrust", path: megapunchLane(origin, direction, reach, bore), reach: reach, bore: bore,
                    rings: rings, flows: flows, scale: scale, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()] }, 18);

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, bore, { below: 1.5, above: 2.6 }),
                function (victim, facts) {
                    if (!hurt(action, victim, "megapunch", power,
                        { damage: damageSpec("megapunch", "megaton"), contact: true, punch: true })) return;
                    pushed.push(String(victim.ref()));
                    WorldFeedback.emit(world, megapunchScene, 1, facts.position(),
                        { moment: "hit", target: String(victim.ref()), scale: scale, intensity: intensity }, 22);
                });

            if (pushed.length === 0) {
                WorldFeedback.emit(world, megapunchScene, 1, origin, { moment: "whiff", scale: scale, intensity: intensity }, 18);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), megapunchMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
                finish(action);
                return;
            }
            sound(action, "cobblemon:impact.fighting");
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), megapunchHitText, [pushed.length], 24);
            launch(action, 0);
        }
    });
}
