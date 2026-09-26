/**
 * 泄愤 / lashout 的出手方式。
 *
 * 核心念头：把被削弱的怒气全聚在近身，先原地短踏一步，再朝正前方砸下一击，顺势挣开一部分削弱。
 *
 * 三幕：
 *   起（fume，提交前）：脚下怒火上升、负等级的黑气从两侧收紧成短压痕（present fume）。
 *   踏（step）：原地向前短踏一步，受碰撞限制、读实际落点；落点处留下双压痕步点。
 *   砸（slam → strike / vent → sever / rage）：朝正前方砸下，只结算前方第一个近敌；命中后先消掉一部分负等级，
 *       确有层数被解除就碎出同等段数的束线；开启宣泄时再把怒气转成一段物攻提升。砸空则只扬尘，不解削弱。
 *
 * 选取：`kind: "aim"`——短前方点或实体都行，空挥可发生；不要求提交时存在敌人，空挥不净化。
 *
 * 与同族分开：电喙是点到即走的直线电啄、鳃咬是贴身拖拽；泄愤是一次原地近身下砸，把负面一次换成一记重击。
 */
namespace PokemonSkills {
    const lashoutVentText = "world_combat.move.lashout.text.vent";
    const lashoutHitText = "world_combat.move.lashout.text.hit";
    const lashoutRageText = "world_combat.move.lashout.text.rage";
    const lashoutMissText = "world_combat.move.lashout.text.miss";

    define({
        freeMovement: true,
        id: lashoutId,
        cooldownParameter: "recharge",
        name: "Lash Out",
        description: "受到削弱时原地短踏后朝正前方砸下一击：负面能力等级和有害药水都会激起怒气；命中后先消减负面等级，开启宣泄时再换成一段物攻提升。挥空不解削弱。",
        uses: ["被降能力后立刻重砸", "把积压的负等级一次泄掉", "用怒气换一段攻击提升"],
        kind: "aim",
        range: 2.8,
        maxRange: 5.5,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "dark",
        defaults: { vent: false, ai: { maxChase: 8, enraged: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(lashoutId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "dark", color: 0xB23A4A,
                label: config && config.vent === true ? "泄愤·宣泄" : "泄愤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lashoutId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(lashoutId, "tempo", context)),
                recover: Math.round(p(lashoutId, "settle", context)),
                cooldown: Math.round(p(lashoutId, "recharge", context)),
                active: 0,
                range: p(lashoutId, "dash", context) + p(lashoutId, "slamReach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const down = world.valid(actor) ? lashoutDown(world, actor) : 0;
            action.present("lashout:fume", lashoutScene, 1, action.origin(),
                JSON.stringify({ moment: "fume", down: down, fumes: Math.round(16 + down * 10),
                    vent: config && config.vent === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(lashoutScene);
            // 前踏贴地走：方向取水平分量，避免身体贴着地面时被地面挡下。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() > 0.001 ? flat.unit() : aimed;
            const step = p(lashoutId, "dash", action);
            const reach = p(lashoutId, "slamReach", action);
            const radius = p(lashoutId, "collisionRadius", action);
            const push = p(lashoutId, "push", action);
            const vent = !!(config && config.vent === true);
            const scale = radius / 0.45;
            let settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            sound(action, "minecraft:entity.vex.charge");

            // 原地短前踏：受碰撞限制，读实际落点；沿落点铺出双压痕步点。
            const stride = sweepStep(action, direction.scale(step), radius);
            movementScenes.show(action, "step", action.origin(),
                { moment: "step", direction: [direction.x(), direction.y(), direction.z()],
                    stepped: Math.round(stride.moved * 100) / 100, scale: scale });

            action.after(1, slam);

            function slam(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const body = scope.observe(current.actor());
                const lift = body === null ? 1.1 : Math.max(0.5, body.height() * 0.85);
                const from = here.plus(WorldCombat.point(0, lift, 0)).plus(direction.scale(reach * 0.28));
                const to = here.plus(direction.scale(reach));
                const contact = current.trace(from, to, radius);
                const victim = contact.hitEntity() ? contact.target() : null;
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                    const power = p(lashoutId, "lashout", current);
                    const down = lashoutDown(scope, current.actor());
                    const doubled = down > 0;
                    const budget = Math.round(p(lashoutId, "ventLevels", current));
                    const boostStages = Math.round(p(lashoutId, "rageStages", current));
                    const boostTicks = Math.round(p(lashoutId, "rageTicks", current));
                    const count = Math.round(16 + power / 3);
                    const landed = impact(current, contact, lashoutId, power, { damage: damageSpec(lashoutId, "lashout"), contact: true });
                    // 伤害被拒绝时不解削弱、不冒称命中：只收势。
                    if (landed) {
                        const away = contact.position().minus(here);
                        if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                        const removed = lashoutVent(scope, current.actor(), budget);
                        let boosted = 0;
                        if (vent && scope.valid(current.actor())) {
                            NativeEffects.boostWindow(scope, current.actor(), { atk: boostStages }, boostTicks, "world_combat:move/lashout");
                            boosted = boostStages;
                            const self = scope.observe(current.actor());
                            if (self !== null) WorldFeedback.emit(scope, lashoutScene, 1, self.position(),
                                { moment: "rage", boosted: boostStages, count: Math.round(10 + boostStages * 8) }, Math.min(120, boostTicks));
                            WorldFeedback.text(scope, contact.position().plus(WorldCombat.point(0, 1.25, 0)), lashoutRageText, [boostStages], Math.min(80, boostTicks));
                        }
                        // 确实解除几层就碎几段束线：以实际 removed 驱动 sever 的段数。
                        if (removed > 0) WorldFeedback.emit(scope, lashoutScene, 1, contact.position(),
                            { moment: "sever", target: String(victim.ref()), removed: removed, scale: scale }, 24);
                        WorldFeedback.emit(scope, lashoutScene, 1, contact.position(),
                            { moment: doubled ? "vent" : "strike", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                                down: down, power: Math.round(power * 10) / 10, count: count, removed: removed, boosted: boosted, scale: scale }, 30);
                        scope.sound(doubled ? "minecraft:entity.warden.sonic_boom" : "cobblemon:impact.dark", contact.position(), 16, "{}");
                        WorldFeedback.text(scope, contact.position().plus(WorldCombat.point(0, 1.1, 0)),
                            doubled ? lashoutVentText : lashoutHitText, [], 26);
                    }
                    finish(current);
                    return;
                }
                // 空挥：只砸起尘土，不解削弱。
                WorldFeedback.emit(scope, lashoutScene, 1, to, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, to.plus(WorldCombat.point(0, 0.9, 0)), lashoutMissText, [], 20);
                finish(current);
            }
        }
    });
}
