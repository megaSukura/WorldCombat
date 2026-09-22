/**
 * 瑜伽姿势 / meditate 的执行组织。
 *
 * 核心念头：站定、闭息，把气一圈圈沉进身体深处，把睡在那里的力叫醒。它是自我强化族里最安静的一招：
 *   花时间真正站住，换来的深度取决于有没有被打扰——安静时叫醒两层，被追打时只叫醒一层。
 *
 * 两幕：
 *   沉息（windup 播「入静」，提交前只观察与预告，可被打断，打断不花代价）。
 *   唤醒（提交后）：NativeEffects.boost 抬起物攻（1 或 2 级，安静时更高），挂上共享身份
 *     world_combat:status/meditative 的「入静」标记；灵环从脚边升到头顶，灵光从体内顶出。
 * 结束：入静标记走完只是气息平复，唤醒的物攻等级不褪（与棱角化相反）。
 *
 * 与同族分开：棱角化是快、外长棱角、带接触反击的窗口，到点收回；瑜伽姿势是慢、静、内在的唤醒，不被打扰时更深、且留住。
 */
namespace PokemonSkills {
    const meditateScene = "world_combat:move_meditate";
    const meditateEffect = "world_combat:meditative";
    const meditateText = "world_combat.move.meditate.text.awaken";
    const meditateCalmText = "world_combat.move.meditate.text.deep";
    /** 表现里的参考半径：`data.scale = 实际灵环半径 / 这个数`。 */
    const meditateReferenceRadius = 1.2;

    function meditateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    define({
        id: "meditate",
        name: "Meditate",
        description: "静下心来，唤醒身体深处沉睡的力量，从而提高攻击。站定越久、越没被打扰，唤醒得越深。",
        uses: ["开战前趁没人打扰，一口气把物攻叫到两层", "被追打时快速叫醒一层，抢回出手的底气", "在安全换位里补一口静心，把物攻垫住"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 14,
        active: 1,
        recover: 8,
        cooldown: 110,
        style: "psy",
        stationary: true,
        defaults: { deepBreath: false },
        fields: [],
        indicator: function () { return { radius: 1, style: "psy", color: 0xB39DDB, label: "瑜伽姿势" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["meditate"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("meditate", "tempo", context)),
                recover: Math.round(p("meditate", "aftercast", context)),
                cooldown: Math.round(p("meditate", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_meditate:inhale", meditateScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", deep: config && config.deepBreath === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("meditate", "gift", action))));
            const stillness = Math.max(80, Math.round(p("meditate", "stillness", action)));
            const motes = Math.max(8, Math.round(p("meditate", "motes", action)));
            const spread = Math.max(0.6, p("meditate", "spread", action));
            const scale = spread / meditateReferenceRadius;
            NativeEffects.boost(world, actor, "atk", gift);
            MobEffects.apply(world, actor, meditateEffect, stillness, gift);
            WorldFeedback.emit(world, meditateScene, 1, body.position(),
                { moment: "awaken", actor: String(actor.ref()), gift: gift, motes: motes, spread: spread, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, 0.8 + gift * 0.5 + motes / 60)) }, 32);
            WorldFeedback.keep(world, "world_combat:move_meditate/stillness/" + String(actor.ref()), meditateScene, 1, body.position(),
                { moment: "stillness", actor: String(actor.ref()), gift: gift, scale: scale }, Math.min(stillness, 640));
            WorldFeedback.text(world, meditateAbove(body.position()), gift >= 2 ? meditateCalmText : meditateText, [gift], 30);
            world.sound(gift >= 2 ? "minecraft:entity.player.levelup" : "minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
            done(action);
        }
    });

    // 入静窗口走完：只是气息平复。物攻等级由本招唤醒，按设计不随窗口收回。
    WorldCombat.on("world_combat:move_meditate/settle", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meditateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, meditateScene, 1, body.position(),
            { moment: "settle", actor: String(actor.ref()) }, 22);
    });
}
