/**
 * 磨砺 / laserfocus 的出手方式。
 *
 * 核心念头：把精神收束成一道细光压在自己身上——**下一次出手必中要害**，出手即散，不用则自行褪去。
 *
 * 三幕：
 *   收束（windup，提交前只观察与预告，可被打断，不花代价）。
 *   落点（提交后）：给自己挂 world_combat:laserfocus_edge（身份 world_combat:status/laserfocus）与本次锐意实例
 *     world_combat:laserfocus_mark（唯一 token、光点、长度、迸发量）；锐光沿身体收成一条细线。
 *   兑现（这一击由本招把非暴击改成暴击且真的扣了血）：appliedRules 只认本实例 token，用掉锐意、放出迸发与浮字。
 *   自散：一直不出手时，窗口走到时间尽头安静褪去；被外力提前清除也清掉本实例，不遗留旧锐光。
 *
 * 与同族分开：心之眼把施法者自己的准星拉满、锁定把目标钉住；磨砺只关心**自己这一击要害**。共享结算里的
 * 防暴击特性、幸运咒语与守卫仍按各自规则参与，这层锐意不绕过它们。
 */
namespace PokemonSkills {
    function laserfocusAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    /** 本次锐意实例的唯一标识，只消费确实由它把非暴击改成暴击且实际扣血的那一下。 */
    let laserfocusSerial = 0;

    WorldCombat.effect(laserfocusMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.token !== "number" || !isFinite(value.token) || value.token <= 0) throw new Error("Invalid laserfocus mark: token");
        ["motes", "edge", "spark"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid laserfocus mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    function laserfocusMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, laserfocusMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function laserfocusReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, laserfocusMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }
    /** 锐光就近跟着施法者；绑在本实例的 mark 载体上，自然到期或提前清除都随它一起收。 */
    function laserfocusWatch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target();
        const body = world.valid(actor) ? world.observe(actor) : null;
        if (body === null) { effect.end(); return; }
        const mark = JSON.parse(String(effect.state()));
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_laserfocus/aura", laserfocusScene, 1, body.position(),
            { moment: "aura", target: String(actor.ref()), motes: mark.motes, edge: mark.edge, spark: mark.spark });
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effectHandler(laserfocusMark, "start", laserfocusWatch);
    WorldCombat.effectHandler(laserfocusMark, "watch", laserfocusWatch);
    WorldCombat.effectHandler(laserfocusMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 兑现点：带锐意者的下一次伤害结算被抬成必定要害。真正用掉放在 applied（伤害确实落下之后），
    // 预览（伤害说明页与 AI）只看不改；已有暴击或被目标防暴击特性压成 0 时不覆盖，也不占用本次锐意。
    PokemonDamage.metadata.define({
        id: "world_combat:move_laserfocus/edge",
        applies: function (context) { return !context.preview && !!context.world && !!context.actor; },
        apply: function (context) {
            const data: any = context.metadata, world = context.world!, actor = context.actor!;
            if (data.category !== "physical" && data.category !== "special") return;
            if (data.critical === true || data.criticalChance === 0) return;
            // 记下本招这一次的实例标识：其他来源的必暴不会被误算成磨砺的兑现。
            const mark = laserfocusMarkOf(world, actor);
            if (mark === null) return;
            data.critical = true; data.criticalChance = 1; data.laserfocusEdge = mark.token;
        }
    });

    NativeEffects.appliedRules.define({ id: "world_combat:move_laserfocus/spend", apply: function (hit) {
        const data = hit.data;
        if (!data || typeof data.laserfocusEdge !== "number" || data.critical !== true || !(data.actual > 0)) return;
        const world = hit.world, source = hit.source, target = hit.target;
        if (!world.valid(source)) return;
        const mark = laserfocusMarkOf(world, source);
        if (mark === null || mark.token !== data.laserfocusEdge) return;
        if (!MobEffects.consume(world, source, laserfocusEffect)) return;
        laserfocusReleaseMark(world, source);
        const body = world.observe(source);
        const victim = world.observe(target);
        const ratio = victim === null ? 0 : Math.max(0, Math.min(1, data.actual / Math.max(1, victim.maxHealth())));
        const spark = Math.max(10, Math.round((mark.spark || 24) * (0.5 + ratio)));
        if (body === null) return;
        WorldFeedback.emit(world, laserfocusScene, 1, body.position(),
            { moment: "crit", target: String(source.ref()), spark: spark, edge: mark.edge,
                intensity: Math.max(0.6, Math.min(2.4, 0.7 + ratio)) }, 28);
        WorldFeedback.text(world, laserfocusAbove(body.position()), laserfocusCritText, [Math.round(data.actual * 10) / 10], 30);
        world.sound("minecraft:entity.player.attack.crit", body.position(), 16, "{}");
    } });

    // 锐意离场：自然褪去时播安静散光；被外力提前清除（如牛奶）只清掉本实例，不遗留旧表现。
    WorldCombat.on("world_combat:move_laserfocus/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== laserfocusEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        laserfocusReleaseMark(world, actor);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, laserfocusScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, laserfocusAbove(body.position()), laserfocusFadeText, [], 22);
    });

    define({
        id: laserfocusId,
        cooldownParameter: "recharge",
        name: "磨砺",
        description: "收束精神，让自己下一次造成伤害的攻击必定击中要害；锐意留在身上直到这次出手，不出手则随时间散去。",
        uses: ["在对手硬吃一发前先磨好要害", "把一次关键命中放大成致命一击", "逼对手在锐意散去前拉开距离"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 74,
        style: "focus",
        stationary: true,
        defaults: { steady: false },
        fields: [flag("steady", "沉心蓄势")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[laserfocusId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p(laserfocusId, "tempo", context))),
                recover: Math.round(p(laserfocusId, "aftercast", context)),
                cooldown: Math.round(p(laserfocusId, "recharge", context)),
                active: 1,
                range: 1
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(laserfocusId, "edge", pokemon) : 1.4, geometry: "circle", style: "focus",
                color: 0xFFC24A, label: config && config.steady ? "磨砺·沉心" : "磨砺" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_laserfocus:windup", laserfocusScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", steady: config && config.steady ? 1 : 0, target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const ticks = Math.max(60, Math.round(p(laserfocusId, "focusTicks", action)));
            const motes = Math.max(10, Math.round(p(laserfocusId, "motes", action)));
            const edge = Math.max(1, p(laserfocusId, "edge", action));
            const spark = Math.max(12, Math.round(p(laserfocusId, "spark", action)));
            // 载体应用失败就不播 focus 成功，也不留下无主的锐意实例。
            const carrier = MobEffects.apply(world, actor, laserfocusEffect, ticks, 0);
            if (carrier === null) { done(action); return; }
            laserfocusReleaseMark(world, actor);
            laserfocusSerial += 1;
            world.effect(laserfocusMark, actor, JSON.stringify({ token: laserfocusSerial, motes: motes, edge: edge, spark: spark }), ticks);
            sound(action, "minecraft:block.beacon.activate");
            if (body !== null) {
                WorldFeedback.emit(world, laserfocusScene, 1, body.position(),
                    { moment: "focus", target: String(actor.ref()), motes: motes, edge: edge, spark: spark,
                        steady: config && config.steady ? 1 : 0, scale: Math.max(0.6, Math.min(2.2, edge / 1.4)) }, 34);
                WorldFeedback.text(world, laserfocusAbove(body.position()), laserfocusReadyText, [Math.round(ticks / 20)], 32);
            }
            done(action);
        }
    });
}
