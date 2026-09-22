/**
 * 万有引力 / gravapple 的出手方式。
 *
 * 核心念头：**把一颗大苹果送到目标正上方，让重力把它砸下去**——苹果在重力里越落越快，并被目标的质心
 * 牵引着修正落点；落地的目标只挨一记重苹果，**离地的目标被苹果追上、砸回地面**，那一下才算重力做足了功。
 *
 * 三幕：
 *   起（windup，提交前）：重力在施法者周围聚起一圈草叶，苹果被拎起来。
 *   击（release → fall → impact）：提交后苹果出现在目标正上方 `dropHeight` 格处，随即松手垂直落下
 *       （`homing` 朝目标修正），命中活物时按现场是否离地求值威力：结算一次不接触伤害、压一级防御、
 *       挂上共享身份 `world_combat:status/guardbroken`；目标离地则同时把下落冲量加在它身上（`slam`）。
 *   收：苹果没砸中活物就整颗落在地上，留成一颗真苹果，谁都能捡（`miss`）。
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

    define({
        id: "gravapple",
        name: "Grav Apple",
        description: "把一颗大苹果送到目标正上方松手，苹果在重力里越落越快、自行修正落点；砸中的目标防御下降，离地的目标会被砸回地面并受到更重的伤害；落空的苹果留在原地。重坠式更高更沉更重，轻坠式更快更远。",
        uses: ["把在天上飞的目标拽下来", "单体压低防御，惩罚站桩的对手", "从掩体或高台上方垂直落下，不看视线"],
        kind: "enemy",
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
            const world = action.world();
            const origin = action.origin();
            const target = action.target();
            const targetPoint = action.targetPosition();
            const dropHeight = p("gravapple", "dropHeight", action);
            const fallSpeed = p("gravapple", "fallSpeed", action);
            const pull = Math.max(4, Math.round(p("gravapple", "pull", action)));
            const reach = p("gravapple", "reach", action);
            const appleRadius = p("gravapple", "collisionRadius", action);
            const stages = Math.max(1, Math.round(p("gravapple", "crushStages", action)));
            const crushTicks = Math.max(40, Math.round(p("gravapple", "crushTicks", action)));
            const slam = p("gravapple", "slam", action);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:block.grass.break");
            const birth = WorldCombat.point(targetPoint.x(), targetPoint.y() + dropHeight, targetPoint.z());
            const appearance: any = { item: "minecraft:apple", glow: true, scale: Math.max(1.4, appleRadius * 2.8) };
            if (target !== null && world.valid(target)) appearance.homing = { target: String(target.ref()), turn: pull, range: reach + 6 };

            function appleHit(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const point = hit.position(), victim = hit.target();
                if (victim !== null && !scope.friendly(victim)) {
                    const power = p("gravapple", "impact", current);
                    const facts = scope.observe(victim);
                    const airborne = facts === null || !facts.grounded();
                    const intensity = Math.max(0.5, Math.min(2.4, power / 78));
                    const landed = impact(current, hit, "gravapple", power,
                        { damage: damageSpec("gravapple", "impact"), contact: false });
                    WorldFeedback.emit(scope, gravappleScene, 1, point,
                        { moment: "impact", target: String(victim.ref()), power: power, intensity: intensity,
                            crush: stages, airborne: airborne ? 1 : 0 }, 30);
                    sound(current, "cobblemon:impact.grass");
                    if (!landed) return;
                    NativeEffects.boost(scope, victim, "def", -stages);
                    MobEffects.apply(scope, victim, gravappleCrush, crushTicks, 0);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), gravappleCrushText, [stages], 28);
                    if (airborne) {
                        scope.motion(victim, WorldCombat.point(0, -slam, 0), true);
                        WorldFeedback.emit(scope, gravappleScene, 1, point,
                            { moment: "slam", target: String(victim.ref()), crush: stages, slam: slam, intensity: intensity }, 26);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), gravappleSlamText, [], 26);
                        scope.sound("minecraft:block.anvil.land", point, 14, "{}");
                    }
                    return;
                }
                WorldFeedback.emit(scope, gravappleScene, 1, point,
                    { moment: "miss", crush: stages, radius: appleRadius, intensity: Math.max(0.5, Math.min(1.6, fallSpeed * 2.4)) }, 24);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), gravappleMissText, [], 24);
                scope.dropItem(point, "minecraft:apple", 1, JSON.stringify({ pickupDelay: 20 }));
                scope.sound("minecraft:entity.item.pickup", point, 10, "{}");
            }

            const flight = action.projectile(birth, WorldCombat.point(0, -fallSpeed, 0), 0.05, appleRadius, dropHeight + 6, 200,
                function (inner, hit) { appleHit(inner, hit); },
                function (inner) { finish(inner); },
                JSON.stringify(appearance));
            WorldFeedback.emit(world, gravappleScene, 1, birth,
                { moment: "release", height: dropHeight, radius: appleRadius, projectile: flight }, 24);
            WorldFeedback.keep(world, "gravapple:fall:" + String(action.id()), gravappleScene, 1, birth,
                { moment: "fall", projectile: flight, height: dropHeight, radius: appleRadius }, 210);
            WorldFeedback.keep(world, "gravapple:mark:" + String(action.id()), gravappleScene, 1, targetPoint,
                { moment: "mark", height: dropHeight, radius: appleRadius, projectile: flight, intensity: Math.max(0.5, Math.min(1.6, dropHeight / 8)) }, 210);
            sound(action, "minecraft:entity.wind_charge.throw");
        }
    });
}
