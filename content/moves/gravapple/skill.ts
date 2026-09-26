/**
 * 万有引力 / gravapple 的出手方式。
 *
 * 核心念头：**把一颗大苹果送到目标正上方，让重力把它砸下去**——苹果在重力里越落越快，并被目标的质心
 * 牵引着修正落点；落地的目标只挨一记重苹果，**离地的目标被苹果追上、砸回地面**，那一下才算重力做足了功。
 *
 * 三幕：
 *   起（windup，提交前）：重力在施法者周围聚起一圈草叶，苹果被拎起来。
 *   击（release → fall → impact）：提交后苹果出现在目标正上方 `height` 格处，随即松手垂直落下
 *       （`homing` 朝目标有限修正），命中活物时按现场是否离地求值威力：结算一次不接触伤害、压一级防御、
 *       挂上共享身份 `world_combat:status/guardbroken`；目标离地则同时用**原生受击冲量**把下坠加在它身上
 *       （`slam`，尊重抗击退/无敌/权限/骑乘规则）。
 *   收：苹果没砸中活物就整颗落在地上，留成一颗真苹果，谁都能捡（`miss`）。
 *
 * 输入：`kind: "aim"`——可以点地面/空中落点，也可点实体；提交时不要求存在敌人。
 *   出生高度按目标头顶**真实可用的顶棚空间**收缩（`gravapplePlacement`），屋内短落程，不会穿到天花板另一侧。
 *
 * 与同族分开：同是「一击留痕、降防御」，撕裂爪/铁尾/暗影之骨/碎岩是施法者自己冲上去或掷出武器，
 * 万有引力是**从天上垂直落下**、惩罚离地的目标；与同为降速的岩石封锁比，一个砸头顶、一个封腿。
 *
 * 配置 `heavy`（重坠式）由 resolve 改时序与射程、由公式改高度与单发：开启＝更高更沉更重、更难从远处放。
 */
namespace PokemonSkills {
    const gravappleScene = "world_combat:move_gravapple";
    const gravappleCrush = "world_combat:gravapple_crush";
    const gravappleCrushText = "world_combat.move.gravapple.text.crush";
    const gravappleSlamText = "world_combat.move.gravapple.text.slam";
    const gravappleMissText = "world_combat.move.gravapple.text.miss";

    /**
     * 目标头顶真正放得下苹果的最高格数：从期望高度往下找第一个「苹果碰撞箱放得下、且与目标点之间没有方块」
     * 的位置；顶棚越低、落程越短，保证出生的苹果在可见空间里而不是穿进天花板。返回实际高度（格）。
     */
    function gravapplePlacement(world: CombatWorld, point: CombatPoint, desired: number, radius: number): number {
        var size = Math.max(0.5, radius * 2);
        var top = Math.max(1, Math.floor(desired));
        for (var h = top; h >= 1; h--) {
            var birth = WorldCombat.point(point.x(), point.y() + h, point.z());
            if (world.freeSpace(birth, size, size) && world.clear(point, birth)) return h;
        }
        return 1;
    }

    define({
        id: "gravapple",
        name: "Grav Apple",
        description: "把一颗大苹果送到目标正上方（也可点选落点）松手，苹果在重力里越落越快、自行修正落点；砸中的目标防御下降，离地的目标会被砸回地面并受到更重的伤害；落空的苹果留在原地给谁都能捡。出生高度受头顶空间限制，屋内只落得到顶棚容得下的高度。重坠式更高更沉更重，轻坠式更快更远。",
        uses: ["把在天上飞的目标拽下来", "单体压低防御，惩罚站桩的对手", "从掩体或高台上方垂直落下，不看视线"],
        kind: "aim",
        range: 8,
        maxRange: 13,
        prepare: 10,
        active: 30,
        recover: 10,
        cooldown: 36,
        style: "grass",
        defaults: { heavy: false, ai: { maxChase: 9, dropFliers: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("gravapple", "collisionRadius", pokemon), geometry: "area", style: "grass",
                color: 0x7A9A4A, label: config && config.heavy === true ? "重坠万有引力" : "轻坠万有引力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["gravapple"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var heavy = !!(config && config.heavy);
            return {
                prepare: p("gravapple", "prepare", context) + (heavy ? 4 : 0),
                recover: p("gravapple", "recover", context),
                cooldown: p("gravapple", "cooldown", context) + (heavy ? 8 : 0),
                active: skills["gravapple"].active,
                range: Math.max(6, p("gravapple", "reach", context) - (heavy ? 1.5 : 0))
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_gravapple:windup", gravappleScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            action.releaseTarget();
            const scenes = WorldFeedback.actionScenes(gravappleScene);
            const world = action.world();
            const target = action.target();
            const targetPoint = action.targetPosition();
            const selected = target !== null && world.valid(target) && !world.friendly(target) ? target : null;
            const dropHeight = p("gravapple", "dropHeight", action);
            const fallSpeed = p("gravapple", "fallSpeed", action);
            const pull = Math.max(4, Math.round(p("gravapple", "pull", action)));
            const reach = p("gravapple", "reach", action);
            const appleRadius = p("gravapple", "collisionRadius", action);
            const stages = Math.max(1, Math.round(p("gravapple", "crushStages", action)));
            const crushTicks = Math.max(40, Math.round(p("gravapple", "crushTicks", action)));
            const slam = p("gravapple", "slam", action);
            const speedScale = Math.max(0.5, Math.min(2, fallSpeed / 0.42));
            let settled = false;

            // 出生高度按目标头顶真实顶棚空间收缩；苹果与落点之间保持无方块。
            const height = gravapplePlacement(world, targetPoint, dropHeight, appleRadius);
            const birth = WorldCombat.point(targetPoint.x(), targetPoint.y() + height, targetPoint.z());
            const appearance: any = { item: "minecraft:apple", glow: true, scale: Math.max(1.4, appleRadius * 2.8) };
            if (selected !== null) appearance.homing = { target: String(selected.ref()), turn: pull, range: reach + 6 };

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            sound(action, "minecraft:block.grass.break");

            function appleHit(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const point = hit.position(), victim = hit.target();
                scenes.stop(current);
                if (victim !== null && !scope.friendly(victim)) {
                    const power = p("gravapple", "impact", current);
                    const facts = scope.observe(victim);
                    const airborne = facts !== null && !facts.grounded();
                    const intensity = Math.max(0.5, Math.min(2.4, power / 78));
                    const landed = impact(current, hit, "gravapple", power,
                        { damage: damageSpec("gravapple", "impact"), contact: false });
                    WorldFeedback.emit(scope, gravappleScene, 1, point,
                        { moment: "impact", target: String(victim.ref()), power: power, intensity: intensity,
                            crush: stages, airborne: airborne ? 1 : 0 }, 30);
                    sound(current, "cobblemon:impact.grass");
                    if (!landed) { finish(current); return; }
                    NativeEffects.boost(scope, victim, "def", -stages);
                    MobEffects.apply(scope, victim, gravappleCrush, crushTicks, 0);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), gravappleCrushText, [stages], 28);
                    if (airborne) {
                        // 下坠是原生受击冲量：抗击退/移动规则、无敌、权限、骑乘由通用入口处理。
                        // 只有真的推动了才播被砸回地面的表现，抗推目标不谎报成功。
                        const slammed = scope.valid(victim) && scope.hitImpulse(victim, WorldCombat.point(0, -slam, 0));
                        if (slammed) {
                            WorldFeedback.emit(scope, gravappleScene, 1, point,
                                { moment: "slam", target: String(victim.ref()), crush: stages, slam: slam, intensity: intensity }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), gravappleSlamText, [], 26);
                            scope.sound("minecraft:block.anvil.land", point, 14, "{}");
                        }
                    }
                    finish(current);
                    return;
                }
                WorldFeedback.emit(scope, gravappleScene, 1, point,
                    { moment: "miss", crush: stages, radius: appleRadius, intensity: Math.max(0.5, Math.min(1.6, fallSpeed * 2.4)) }, 24);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), gravappleMissText, [], 24);
                scope.dropItem(point, "minecraft:apple", 1, JSON.stringify({ pickupDelay: 20 }));
                scope.sound("minecraft:entity.item.pickup", point, 10, "{}");
                finish(current);
            }

            const flight = action.projectile(birth, WorldCombat.point(0, -fallSpeed, 0), 0.05, appleRadius, height + 8, 200,
                function (inner, hit) { appleHit(inner, hit); },
                function (inner) { finish(inner); },
                JSON.stringify(appearance));
            WorldFeedback.emit(world, gravappleScene, 1, birth,
                { moment: "release", height: height, radius: appleRadius, projectile: flight }, 24);
            // 落点标圈：点选时钉在所选落点的地面投影；实体目标时绑定实体，标圈跟它的真实投影移动。
            const markData = { height: height, radius: appleRadius, projectile: flight, speed: speedScale,
                intensity: Math.max(0.5, Math.min(1.6, height / 8)) };
            if (selected !== null) {
                scenes.show(action, "mark", targetPoint, { moment: "mark_target", target: String(selected.ref()), height: markData.height,
                    radius: markData.radius, speed: markData.speed, intensity: markData.intensity });
            } else {
                scenes.show(action, "mark", targetPoint, { moment: "mark", height: markData.height,
                    radius: markData.radius, speed: markData.speed, intensity: markData.intensity });
            }
            scenes.show(action, "fall", birth, { moment: "fall", projectile: flight, height: height,
                radius: appleRadius, speed: speedScale, intensity: Math.max(0.6, Math.min(1.8, height / 6)) });
            sound(action, "minecraft:entity.wind_charge.throw");
        }
    });
}
