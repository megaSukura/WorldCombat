/**
 * 月亮之力 / moonblast —— 注册与动作。
 *
 * 三幕（空放多一幕）：
 *   起（windup，提交前）：抬头把头顶的月光拢到身前一颗球里；月华越盛，拢入的光点越多、球越亮，只播预告。
 *   放（execute，提交后）：月华球沿准心方向直直飞出去（自由瞄准，不追踪）；命中即结算一次单体特殊伤害，
 *       在首碰点炸开一牙弯月（只作短光，不是范围伤害）。
 *       真的造成伤害后按月华掷一次：中了就把目标特攻降 `dropStages` 级
 *       （`NativeEffects.boost(..., "spa", -1)`，只有实际降级成功才报出被抽走的月光）。
 *       首碰方块或飞到射程尽头都只留一点月尘（fizzle），以真实 hit 点为准。
 *
 * 与同族分开：本组只有它把威力系在一个世界事实上——露天、夜里、少雨时月华最盛，白天或室内只是普通一炮；
 * 也只有在它对一颗实体月亮球的强弱与快慢之间取舍（`condense`）。射程由独立的 `reach` 参数决定，与爆开半径无关。
 */
namespace PokemonSkills {
    /** 目标离场时冻结最后一个身体点，避免自由瞄准的后续读取抛出；自由点输入原样返回。 */
    function moonblastAimPoint(action: CombatAction, world: CombatWorld): CombatPoint {
        const target = action.target();
        if (target !== null && !world.valid(target)) action.releaseTarget();
        return action.targetPosition();
    }

    define({
        id: moonblastId,
        cooldownParameter: "recharge",
        name: "Moonblast",
        description: "借头顶的月光拢成一颗月华球射向准心：命中造成妖精特殊伤害，偶尔把目标特攻压低。露天夜里的月光最盛，威力、射程、降攻概率与辉光都随之提高；白天或室内就只是一记普通月华球。凝华式更重、降攻更多，流月式更快更散。可以对着空点放，也可以点选任意一个敌人。",
        uses: ["夜里露天打出最重的一记妖精炮", "从远处压制一个法系威胁", "碰运气把对手的特攻压下一级"],
        kind: "aim",
        range: 12,
        maxRange: 20,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "moon",
        defaults: { condense: true, ai: { maxChase: 13 } },
        fields: [
            field(pathOf("condense"), "凝华式", "boolean", {
                help: "开启：月华球拢得更实，威力 ×1.12、降攻概率 +0.06，代价是弹速 ×0.85、起手 +2 刻、冷却 +3 刻，更难躲。关闭（流月式）：弹速 ×1.15、爆开画面 ×1.15，代价是威力 ×0.9、降攻概率 −0.04，用来快速铺开。"
            })
        ],
        indicator: function (config, pokemon) {
            const condense = !(config && config.condense === false);
            return { radius: p(moonblastId, "reach", pokemon), geometry: "line", style: "moon",
                color: 0xFFF3D6, label: condense ? "满月·凝华" : "流月·轻泻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[moonblastId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(moonblastId, "tempo", context)),
                recover: Math.round(p(moonblastId, "aftercast", context)),
                cooldown: Math.round(p(moonblastId, "recharge", context)),
                active: 0,
                range: p(moonblastId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const moon = Math.max(0, Math.min(1, p(moonblastId, "moonlight", action)));
            const rays = Math.max(4, Math.round(p(moonblastId, "rays", action)));
            const orb = Math.max(0.2, p(moonblastId, "collisionRadius", action) * 1.6);
            action.present("world_combat:move_moonblast:gather", moonblastScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", moon: moon, rays: rays, tempo: prepare,
                    moonSize: orb, moonRate: Math.round(10 + moon * 26) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selfActor: CombatActor = action.actor();
            const self = world.observe(selfActor);
            const origin = self === null ? action.origin() : self.position();
            const power = p(moonblastId, "beam", action);
            const speed = Math.max(0.4, p(moonblastId, "boltSpeed", action));
            const radius = Math.max(0.15, p(moonblastId, "collisionRadius", action));
            const chance = Math.max(0, Math.min(1, p(moonblastId, "arcChance", action)));
            const stages = Math.max(1, Math.round(p(moonblastId, "dropStages", action)));
            const burst = p(moonblastId, "burst", action);
            const rays = Math.max(4, Math.round(p(moonblastId, "rays", action)));
            const motes = Math.max(6, Math.round(p(moonblastId, "focusMotes", action)));
            const moon = Math.max(0, Math.min(1, p(moonblastId, "moonlight", action)));
            const stage = Math.max(0.6, Math.min(2.4, power * (0.7 + 0.3 * moon) / 96));
            const orb = Math.max(0.2, radius * 1.6);
            const direction = moonblastAimPoint(action, world).minus(origin);
            const scenes = WorldFeedback.actionScenes(moonblastScene, 1);

            sound(action, "minecraft:block.amethyst_block.resonate");
            // The host runs `impact` first and then `complete` for the same hit; only the exhaustion case
            // (no impact at all) leaves a miss note, so the flag separates the two paths.
            let struck = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                direction: direction.length() < 0.01 ? action.direction() : direction.unit(),
                appearance: { sprite: "cobblemon:generic/orb/largefadeorb", tint: 0xFFF3D6, glow: true, scale: 1.1 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struck = true;
                    const scope = current.world(), target = hit.target(), at = hit.position();
                    scenes.stop(current, "flight");
                    // 首碰方块或友方：只散一点月尘，不作命中、不抽力。
                    if (target === null || !scope.valid(target) || scope.friendly(target)) {
                        WorldFeedback.emit(scope, moonblastScene, 1, at, { moment: "fizzle", moon: moon, scale: stage }, 22);
                        sound(current, "minecraft:block.amethyst_block.resonate");
                        return;
                    }
                    const landed = impact(current, hit, moonblastId, power, { damage: damageSpec(moonblastId, "beam") });
                    if (!landed) {
                        WorldFeedback.emit(scope, moonblastScene, 1, at, { moment: "fizzle", moon: moon, scale: stage }, 22);
                        return;
                    }
                    WorldFeedback.emit(scope, moonblastScene, 1, at,
                        { moment: "burst", target: String(target.ref()), rays: rays, moon: moon, burst: burst, orb: orb,
                            count: Math.round(8 + rays + moon * 12), intensity: stage }, 30);
                    sound(current, "cobblemon:impact.fairy");
                    if (scope.valid(target) && scope.random() < chance) {
                        const dropped = NativeEffects.boost(scope, target, "spa", -stages);
                        if (dropped !== 0) {
                            WorldFeedback.emit(scope, moonblastScene, 1, at,
                                { moment: "drain", target: String(target.ref()), motes: motes, stages: -dropped, moon: moon }, 32);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), moonblastDropText, [-dropped], 30);
                        }
                    }
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world(), at = moonblastAimPoint(current, scope);
                    WorldFeedback.emit(scope, moonblastScene, 1, at,
                        { moment: "fizzle", moon: moon, scale: stage }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), moonblastMissText, [], 22);
                }
                scenes.finish(current, done);
            });
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flight, moon: moon, rays: rays, orb: orb, count: Math.round(10 + rays) });
        }
    });
}
