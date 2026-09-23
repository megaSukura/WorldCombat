/**
 * 薄雾球 / mistball —— 注册与动作。
 *
 * 两幕（落空多一幕）：
 *   起（windup，提交前）：身前吹起一团羽绒与雾，越吹越密，只播预告。
 *   抛（execute，提交后）：羽绒球沿一道弧线慢悠悠飞向目标（`ballistic` 求出落点速度）；落地或擦到目标就炸开：
 *       先结算一次 `puff` 特殊伤害，再在命中点散开一团羽绒雾（`cloud` 时刻，总是有）；
 *       按 `downChance` 掷一次——中了就把雾糊在目标身上：特攻降 `dropStages` 级
 *       （`NativeEffects.boost(..., "spa", -1)`）并挂 `world_combat:downcast`
 *       （共享身份 `world_combat:status/downcast`，移动变慢），雾团随之跟着目标飘一小段（`cling`，`downTicks`）。
 *       球飞到射程尽头没碰到东西就只留一撮羽绒（fizzle）。
 *
 * 与同族分开：月亮之力是一颗快而直的实球、看天吃饭；薄雾球是慢而弯的轻球、必留一片缠身的雾，
 * 也用它 5 点 PP 与长冷却换来本组最高的降攻概率。
 */
namespace PokemonSkills {
    define({
        id: mistballId,
        cooldownParameter: "recharge",
        name: "Mist Ball",
        description: "把一团羽绒与雾揉成轻球抛出去：命中造成超能力特殊伤害，并散开一团羽绒雾；有一半机会把雾糊在目标身上，压低它的特攻、拖慢它的脚步。浓雾式糊得更久更大，代价是球更轻更慢。",
        uses: ["从远处把一个威胁糊住、拖慢", "对上法系目标时高概率压特攻", "抛一道弧线绕过前排够到后排"],
        kind: "enemy",
        range: 10,
        maxRange: 13,
        prepare: 8,
        active: 0,
        recover: 9,
        cooldown: 90,
        style: "down",
        defaults: { suffuse: true, ai: { maxChase: 11 } },
        fields: [
            field(pathOf("suffuse"), "浓雾式", "boolean", {
                help: "开启：雾团半径 ×1.25、缠身概率 +0.10、缠身时长 ×1.25，代价是威力 ×0.88、抛球速度 ×0.9，用来看住一个目标。关闭（轻羽式）：威力 ×1.12、抛球速度 ×1.12、下坠更平，代价是雾团 ×0.85、缠身概率 −0.06，用来打一记快而轻的。"
            })
        ],
        indicator: function (config, pokemon) {
            const suffuse = !(config && config.suffuse === false);
            return { radius: p(mistballId, "cloud", pokemon), geometry: "line", style: "down",
                color: 0xF3F0FF, label: suffuse ? "薄雾·浓雾" : "薄雾·轻羽" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mistballId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(mistballId, "tempo", context)),
                recover: Math.round(p(mistballId, "aftercast", context)),
                cooldown: Math.round(p(mistballId, "recharge", context)),
                active: 0,
                range: p(mistballId, "cloud", context) + 8
            };
        },
        windup: function (action, config, prepare) {
            const cloud = p(mistballId, "cloud", action);
            const motes = Math.max(10, Math.round(p(mistballId, "motes", action)));
            action.present("world_combat:move_mistball:puff", mistballScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", cloud: cloud, motes: motes,
                    suffuse: !(config && config.suffuse === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selfActor: CombatActor = action.actor();
            const aimed: CombatActor | null = action.target();
            const aimPoint = action.targetPosition();
            const self = world.observe(selfActor);
            const origin = self === null ? action.origin() : self.position();
            const power = p(mistballId, "puff", action);
            const speed = Math.max(0.35, p(mistballId, "lob", action));
            const gravity = Math.max(0.01, p(mistballId, "fall", action));
            const radius = Math.max(0.15, p(mistballId, "collisionRadius", action));
            const chance = Math.max(0, Math.min(1, p(mistballId, "downChance", action)));
            const stages = Math.max(1, Math.round(p(mistballId, "dropStages", action)));
            const downTicks = Math.max(20, Math.round(p(mistballId, "downTicks", action)));
            const cloud = p(mistballId, "cloud", action);
            const motes = Math.max(10, Math.round(p(mistballId, "motes", action)));
            const arc = LivingActions.ballistic(origin, aimPoint, speed, gravity);
            const direction = arc === null ? aim(action) : arc;

            sound(action, "cobblemon:move.mist.actor");
            let struck = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, direction: direction, lifetime: 140,
                appearance: { sprite: "cobblemon:generic/orb/largesmokeorb", tint: 0xF3F0FF, glow: true, scale: 0.9 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struck = true;
                    const scope = current.world(), target = hit.target(), at = hit.position();
                    if (target === null || !scope.valid(target)) {
                        WorldFeedback.emit(scope, mistballScene, 1, at, { moment: "fizzle", cloud: cloud }, 22);
                        sound(current, "minecraft:block.wool.place");
                        return;
                    }
                    const landed = impact(current, hit, mistballId, power, { damage: damageSpec(mistballId, "puff") });
                    WorldFeedback.emit(scope, mistballScene, 1, at,
                        { moment: "burst", target: String(target.ref()), cloud: cloud, motes: motes,
                            intensity: Math.max(0.5, Math.min(2.2, power / 90)) }, 26);
                    WorldFeedback.emit(scope, mistballScene, 1, at,
                        { moment: "cloud", target: String(target.ref()), cloud: cloud, motes: motes }, 40);
                    sound(current, "cobblemon:impact.psychic");
                    if (landed && scope.valid(target) && scope.random() < chance) {
                        NativeEffects.boost(scope, target, "spa", -stages);
                        MobEffects.apply(scope, target, mistballEffect, downTicks, 0);
                        WorldFeedback.keep(scope, "mistball:cling:" + String(target.ref()), mistballScene, 1, at,
                            { moment: "cling", target: String(target.ref()), motes: motes, cloud: cloud, down: downTicks }, downTicks);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), mistballDownText, [stages], 34);
                    }
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world();
                    WorldFeedback.emit(scope, mistballScene, 1, current.targetPosition(),
                        { moment: "fizzle", cloud: cloud }, 24);
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.0, 0)), mistballMissText, [], 22);
                }
                done(current);
            });
            WorldFeedback.emit(world, mistballScene, 1, origin,
                { moment: "flight", projectile: flight, cloud: cloud, motes: motes }, 90);
        }
    });
}
