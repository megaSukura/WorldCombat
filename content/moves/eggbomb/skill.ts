/**
 * 炸蛋 / eggbomb 的出手方式。
 *
 * 核心念头：**用最大力气抡出一枚大大的蛋**——它重、它笨、它不好瞄：砸中就是本族最重的单体一记，抡偏了
 *   蛋就在落点摔碎、摊开一小片滑蛋液，之后踩进去的人都会打滑。所以躲开也有代价，这一记卖的是「一枚抡过头的蛋」。
 *
 * 三幕（提交前只播预告）：
 *   抡（heave，提交前）：把大蛋举过头顶、屈腿蓄力，只播预告。
 *   飞（flight，提交后）：蛋沿一道沉甸甸的抛物线飞向目标（看得见、能躲）；带一点散布（原生 75 命中）。
 *   碎（shatter / splash）：命中活物结算 `egg` 物理伤害，并在落点摊开滑蛋液；抡偏落到地面同样摊开滑蛋液、
 *       但不造成伤害。滑蛋液是 `WorldEffects.field` 的字段规则，踩进去的非友方被刷新 `world_combat:status/slick`
 *       （本单元 MobEffect，自带移动速度修饰），持续 `slickTicks`。
 *
 * 与同族分开：种子炸弹是可控的头顶种雨、只伤落点一圈；泥巴炸弹/污泥炸弹是特殊伤害的水花。炸蛋是一枚巨大的、
 *   抡过头的蛋：命中很重、失手留下一地滑——玩家凭「抡偏了地上还有一滩滑」把它和别的投掷分开。
 *
 * 配置 `heavy`（重蛋式）由公式改威力/散布/覆盖/弧坠、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const eggbombScene = "world_combat:move_eggbomb";
    const eggbombSlick = "world_combat:eggbomb_slick";
    const eggbombSlickField = "world_combat:eggbomb_slick";
    const eggbombHitText = "world_combat.move.eggbomb.text.hit";
    const eggbombMissText = "world_combat.move.eggbomb.text.miss";

    // 滑蛋液：落点那圈由字段规则维持，踩进来的非友方被刷新共享身份 world_combat:status/slick 的载体。
    WorldEffects.fieldRule("world_combat:eggbomb_slick", {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field) {
            if (world.friendly(actor)) return;
            const data: any = field.data || {};
            const ticks = typeof data.ticks === "number" && isFinite(data.ticks) ? Math.max(20, Math.round(data.ticks)) : 50;
            MobEffects.apply(world, actor, eggbombSlick, ticks, 0);
        }
    });

    /** 在落点摊开一圈滑蛋液：字段维持 + 画面在存续期内续期。 */
    function eggbombSplash(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        const duration = Math.max(20, Math.round(ticks));
        const reach = Math.max(0.6, Math.min(16, radius));
        WorldEffects.field(world, eggbombSlickField, point, reach, { ticks: duration }, duration);
        const key = "eggbomb:slick:" + world.tick() + ":" + Math.round(point.x() * 10) + ":" + Math.round(point.z() * 10);
        WorldFeedback.keep(world, key, eggbombScene, 1, point,
            { moment: "slick", radius: reach, scale: Math.max(0.6, Math.min(2.4, reach / 1.6)), slick: duration }, duration + 20);
    }

    define({
        id: "eggbomb",
        cooldownParameter: "recharge",
        name: "Egg Bomb",
        description: "用最大力气抡出一枚大大的蛋：砸中活物就是本族最重的单体一记，并在落点摊开一小片滑蛋液；抡偏落到地面也会摊开，踩进去的非友方都会打滑。重蛋式更重更广，直投式更快更准。",
        uses: ["对厚目标抡一记最重的单发物伤", "把落点变成一小片滑地，逼对手绕开", "隔着掩体用高弧线把蛋扔过去"],
        kind: "enemy",
        range: 9,
        maxRange: 12,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 20,
        style: "egg",
        maximumTicks: 160,
        defaults: { heavy: false, ai: { maxChase: 13, opportunist: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("eggbomb", "splash", pokemon), geometry: "area", style: "egg", color: 0xF2E4B8,
                label: config && config.heavy === true ? "重蛋" : "直投炸蛋" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["eggbomb"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("eggbomb", "tempo", context)),
                recover: Math.round(p("eggbomb", "aftercast", context)),
                cooldown: Math.round(p("eggbomb", "recharge", context)),
                active: 0,
                range: p("eggbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:eggbomb:" + action.id(), eggbombScene, 1, action.origin(), JSON.stringify({
                moment: "heave", heavy: config && config.heavy === true ? 1 : 0, scale: scale }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const target = action.target();
            const point = action.targetPosition();
            const power = p("eggbomb", "egg", action);
            const speed = Math.max(0.4, p("eggbomb", "heave", action));
            const gravity = Math.max(0.01, p("eggbomb", "arc", action));
            const radius = Math.max(0.15, p("eggbomb", "radius", action));
            const reach = Math.max(4, p("eggbomb", "reach", action));
            const spread = Math.max(0.5, p("eggbomb", "scatter", action));
            const splash = Math.max(1.0, p("eggbomb", "splash", action));
            const shards = Math.max(6, Math.round(p("eggbomb", "shards", action)));
            const slickTicks = Math.max(40, Math.round(p("eggbomb", "slickTicks", action)));
            const heavy = !!(config && config.heavy);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.4));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const distance = point.minus(origin).length();
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            let direction = target !== null ? LivingActions.ballistic(origin, point, speed, gravity) : null;
            if (direction === null) direction = aim(action);
            const angle = (world.random() * 2 - 1) * spread * Math.PI / 180;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            direction = WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);

            sound(action, "minecraft:entity.egg.throw");
            WorldFeedback.emit(world, eggbombScene, 1, origin,
                { moment: "release", heavy: heavy ? 1 : 0, shards: shards, scale: scale, intensity: intensity }, 16);

            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, gravity: gravity, range: Math.max(reach, distance + 3),
                radius: radius, lifetime: Math.max(30, Math.round((distance + 3) / Math.max(0.3, speed)) + 30),
                appearance: { item: "minecraft:egg", scale: Math.max(0.9, Math.min(2.1, radius * 3.4)) } as any,
                impact: function (inner: CombatAction, hit: CombatImpact): void {
                    const scope = inner.world(), at = hit.position(), struck = hit.target();
                    if (hit.hitEntity() && struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                        if (!impact(inner, hit, "eggbomb", power, { damage: damageSpec("eggbomb", "egg") })) return;
                        WorldFeedback.emit(scope, eggbombScene, 1, at,
                            { moment: "shatter", target: String(struck.ref()), shards: shards, radius: splash,
                                scale: scale, intensity: intensity }, 24);
                        sound(inner, "cobblemon:impact.normal");
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), eggbombHitText, [], 26);
                    } else {
                        WorldFeedback.emit(scope, eggbombScene, 1, at,
                            { moment: "splash", shards: Math.round(shards * 0.7), radius: splash, scale: scale, intensity: intensity }, 22);
                        sound(inner, "minecraft:block.sniffer_egg.plop");
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), eggbombMissText, [], 24);
                    }
                    sound(inner, "minecraft:entity.turtle.egg_break");
                    eggbombSplash(scope, at, splash, slickTicks);
                }
            }, function (inner: CombatAction) { finish(inner); });
            WorldFeedback.keep(world, "eggbomb:flight:" + action.id(), eggbombScene, 1, origin,
                { moment: "flight", projectile: flight, shards: shards, scale: scale, intensity: intensity }, 160);
        }
    });
}
