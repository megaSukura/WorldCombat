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
    /** 入静余韵的续期节奏与单次时长：随「入静」标记存在，标记被驱散后最多再飘这么久。 */
    const meditateAuraRefresh = 40;
    const meditateAuraTicks = 60;

    function meditateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    define({
        id: "meditate",
        cooldownParameter: "wait",
        name: "Meditate",
        description: "静下心来，唤醒身体深处沉睡的力量，从而提高攻击。最近没有被打扰（距上次受伤够久）时唤醒得更深、能一次叫醒两层；正被追打时只叫醒一层。",
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
        indicator: function (_config, pokemon) {
            // 提示环按真实灵环半径显示，与脚下的判定圈同径。
            return { radius: pokemon ? p("meditate", "spread", pokemon) : 0.9, style: "psy", color: 0xB39DDB, label: "瑜伽姿势" };
        },
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
            // 以实际落下的等级回报：物攻已到顶时不再虚报收益。
            const gain = Math.max(0, NativeEffects.boost(world, actor, "atk", gift));
            const mark = MobEffects.apply(world, actor, meditateEffect, stillness, gift);
            WorldFeedback.emit(world, meditateScene, 1, body.position(),
                { moment: "awaken", actor: String(actor.ref()), gift: gain, motes: motes, spread: spread, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, 0.8 + gain * 0.5 + motes / 60)) }, 32);
            // 入静余韵跟着标记走：标记还在就由它的 tick 续期，被驱散后自然收尾。
            if (mark !== null) WorldFeedback.keep(world, "world_combat:move_meditate/stillness/" + String(actor.ref()), meditateScene, 1, body.position(),
                { moment: "stillness", actor: String(actor.ref()), gift: gain, scale: scale }, meditateAuraTicks);
            if (gain > 0) WorldFeedback.text(world, meditateAbove(body.position()), gain >= 2 ? meditateCalmText : meditateText, [gain], 30);
            world.sound(gain >= 2 ? "minecraft:entity.player.levelup" : "minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
            done(action);
        }
    });

    // 入静标记还在时按自己的节奏续期，与标记同寿；标记消失后不再续期。
    WorldCombat.on("world_combat:move_meditate/stillness", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meditateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % meditateAuraRefresh !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_meditate/stillness/" + String(actor.ref()), meditateScene, 1, body.position(),
            { moment: "stillness", actor: String(actor.ref()) }, meditateAuraTicks);
    });

    // 入静窗口走完：只是气息平复。物攻等级由本招唤醒，按设计不随窗口收回。
    WorldCombat.on("world_combat:move_meditate/settle", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meditateEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新/替换时旧应用被移除而新应用仍在：不是真的结束。
        if (MobEffects.read(world, actor, meditateEffect) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, meditateScene, 1, body.position(),
            { moment: "settle", actor: String(actor.ref()) }, 22);
    });
}
