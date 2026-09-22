/**
 * 盐水 / brine —— 注册与动作。
 *
 * 核心念头：把盐水压成一条锁人的细流射向对手，落点渗出一摊咸水；打在完好的身上只是冲一记，
 *   打在半血以下的伤口上，盐钻进伤口，威力翻倍、目标被浇得湿透，画面也随伤势更亮更狠。
 *
 * 三幕：
 *   起（charge，提交前）：盐水在口边／掌中压成细线，白汽与水滴聚拢，只播预告。
 *   射（flight）：细流拖着水尾沿直线飞出（原生投射物外观）。
 *   溅（burst / sting / pool）：命中活物时按该目标自己的血量结算 jet（残血 ×2），命中即浇上湿透身份；
 *       落地处摊开一摊盐池（`WorldEffects.field` 本单元规则），踏入者被浇湿；目标中途离场则盐卤落空。
 *
 * 与同族分开：热水是抛出的沸水并留下烫池；喷水是一圈推人的潮墙；盐水是一条锁人细流，只对**已经残血**的目标翻倍。
 */
namespace PokemonSkills {
    /** 把落点摊平到脚边，再租出一摊盐池；池子自己按 slickTicks 渗干。 */
    function brinePool(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, soak: number): void {
        const ground = WorldCombat.point(point.x(), Math.floor(point.y()) + 0.05, point.z());
        WorldFeedback.emit(world, brineScene, 1, ground,
            { moment: "pool", radius: radius, scale: radius / brineReference, soak: Math.round(soak), ticks: Math.round(ticks) },
            Math.max(24, Math.round(ticks)));
        WorldEffects.field(world, brineField, ground, Math.max(0.6, radius), { soak: soak, radius: radius, next: {} }, Math.max(24, Math.round(ticks)));
    }

    define({
        id: brineId,
        name: "盐水",
        description: "朝对手压出一束盐卤；当对手的 HP 在一半或以下时，盐钻进伤口，这一击的威力翻倍，命中处还会留下一摊渗人的咸水。",
        uses: ["对着已经残血的对手补上翻倍的一记", "把一块地浇成湿地，让路过的敌人湿透", "在敌人退到半血以下时追加压力"],
        kind: "enemy",
        range: 10,
        maxRange: 18,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "brine",
        defaults: { press: false, ai: { maxChase: 16, finishWounded: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(brineId, "reach", pokemon) : 10, geometry: "line", style: "brine", color: 0x7FD4E8,
                label: config && config.press === true ? "高压盐水" : "泼洒盐水" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[brineId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(brineId, "tempo", context)),
                recover: Math.round(p(brineId, "settle", context)),
                cooldown: Math.round(p(brineId, "recharge", context)),
                active: 0,
                range: p(brineId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const reach = p(brineId, "reach", action);
            action.present("brine:charge", brineScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", reach: reach, press: config && config.press === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const power = p(brineId, "jet", action);
            const speed = p(brineId, "globSpeed", action);
            const radius = p(brineId, "nozzle", action);
            const slickRadius = Math.max(0.6, p(brineId, "slickRadius", action));
            const slickTicks = Math.max(24, Math.round(p(brineId, "slickTicks", action)));
            const soakTicks = Math.max(60, Math.round(p(brineId, "soakTicks", action)));
            const drops = Math.max(8, Math.round(p(brineId, "drops", action)));
            const press = !!(config && config.press);
            const scale = slickRadius / brineReference;
            const perTarget = damageFeatures(brineId, "jet");
            let settled = false, struck = false;

            sound(action, "cobblemon:move.watergun.actor");

            function pool(current: CombatAction, point: CombatPoint): void {
                brinePool(current.world(), point, slickRadius, slickTicks, soakTicks);
            }

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/water/waterjet_head", tint: 0xC8ECFF, glow: true,
                scale: Math.max(0.35, Math.min(1.0, 0.45 + scale * 0.2))
            };
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 200,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        const foe = scope.observe(victim);
                        const landing = foe !== null ? foe.position() : point;
                        const wounded = brineWoundedNow(scope, victim);
                        const dealt = hurt(current, victim, brineId, power,
                            { damage: damageSpec(brineId, "jet"), resolve: perTarget.resolve });
                        if (dealt) {
                            CombatStatus.apply(scope, victim, "soaked", brineSoaked, soakTicks, 0, { secondary: true, unique: true });
                            const after = scope.valid(victim) ? scope.observe(victim) : null;
                            const ratio = foe !== null ? Math.max(0, 1 - (foe.health() - (after ? after.health() : 0)) / Math.max(1, foe.maxHealth())) : 1;
                            WorldFeedback.emit(scope, brineScene, 1, landing,
                                { moment: "sting", target: String(victim.ref()), wounded: wounded ? 1 : 0, drops: drops,
                                    scale: scale, intensity: (wounded ? 1.6 : 1) * Math.max(0.7, Math.min(1.6, ratio)) }, 26);
                            if (wounded)
                                WorldFeedback.text(scope, landing.plus(WorldCombat.point(0, 1.25, 0)), brineWoundedText, [], 26);
                            scope.sound("cobblemon:impact.water", landing, 14, "{}");
                        }
                        pool(current, landing);
                    } else {
                        pool(current, point);
                    }
                    WorldFeedback.emit(scope, brineScene, 1, point,
                        { moment: "burst", drops: drops, scale: scale, press: press ? 1 : 0 }, 22);
                    scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world();
                    WorldFeedback.emit(scope, brineScene, 1, action.origin(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, action.origin().plus(WorldCombat.point(0, 1.0, 0)), brineMissText, [], 20);
                }
                finish(current);
            });
            WorldFeedback.emit(world, brineScene, 1, body.position(),
                { moment: "charge", reach: action.range(), press: press ? 1 : 0 }, 20);
        }
    });
}
