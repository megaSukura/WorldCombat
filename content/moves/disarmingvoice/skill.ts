/**
 * 魅惑之声 / disarmingvoice 的出手方式。
 *
 * 核心念头：一声魅惑的鸣叫充满身周整块空间——站在声场里的对手避无可避，所以不做随机命中检定；它伤的是心，
 * 命中后让对手错拍，安抚形态还卸掉对方出手的劲。
 *
 * 两幕：
 *   起：吸气攒声，音符与心在身周聚拢（提交前 windup 预告）。
 *   放：提交后声场以自身为心一次成形（range 即声场半径），罩住范围内所有敌人；伤害真的落到谁身上，
 *       谁才被降速错拍，安抚时再额外挂上魅惑身份并降攻。没有敌人也能清唱，声音穿障按原规则。
 *
 * 与同族分开：chatter 是朝身前的锥形噪声、round 是一道直线歌声；魅惑之声不选方向，是以自身为心的整圈声场。
 */
namespace PokemonSkills {
    const disarmingvoiceScene = "world_combat:move_disarmingvoice";
    const disarmingvoiceCharm = "world_combat:disarming_charm";
    const disarmingvoiceHitText = "world_combat.move.disarmingvoice.text.hit";
    const disarmingvoiceEmptyText = "world_combat.move.disarmingvoice.text.empty";

    define({
        id: "disarmingvoice",
        name: "Disarming Voice",
        description: "一声魅惑的鸣叫充满以身周为心的整块空间，站在声场里的对手避无可避，因此不做随机命中检定；只有真的受伤的对手才会被震到错拍，安抚形态还额外卸掉它们出手的劲并留下魅惑。没有敌人时也能清唱。",
        uses: ["以自身为心的整圈声场", "同时让一圈对手错拍", "用安抚卸掉一圈对手的劲"],
        kind: "self",
        range: 6,
        maxRange: 10,
        prepare: 5,
        active: 22,
        recover: 8,
        cooldown: 32,
        style: "song",
        defaults: { soothe: false, ai: { group: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("disarmingvoice", "radius", pokemon), geometry: "area", style: "fairy", color: 0xF2A0C8, label: "魅惑之声" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["disarmingvoice"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var soothe = !!(config && config.soothe);
            return {
                prepare: p("disarmingvoice", "prepare", context) + (soothe ? 3 : 0),
                recover: p("disarmingvoice", "recover", context),
                cooldown: p("disarmingvoice", "cooldown", context) + (soothe ? 6 : 0),
                range: p("disarmingvoice", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            var soothe = !!(config && config.soothe);
            action.present("world_combat:move_disarmingvoice:windup", disarmingvoiceScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, soothe: soothe }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const radius = p("disarmingvoice", "radius", action);
            const power = p("disarmingvoice", "note", action);
            const stagger = Math.max(1, Math.round(p("disarmingvoice", "stagger", action)));
            const soften = Math.max(0, Math.round(p("disarmingvoice", "soften", action)));
            const charmTicks = Math.max(0, Math.round(p("disarmingvoice", "charmTicks", action)));
            const soothe = !!(config && config.soothe);
            const intensity = Math.max(0.5, Math.min(2, power / 40));
            const notes = Math.max(6, Math.round(power / 4));
            const flow = Math.max(20, Math.round(radius * 14));

            sound(action, "minecraft:block.note_block.flute");
            let hits = 0;
            const region = WorldGeometry.ring(origin, 0, radius, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (target: CombatActor, facts: CombatObservation) {
                // 只有真正受伤的对手才吃附加效果；硬控免疫的 Boss 照样受声伤。
                const landed = hurt(action, target, "disarmingvoice", power, { damage: damageSpec("disarmingvoice", "note"), sound: true });
                if (!landed) return;
                NativeEffects.boost(world, target, "spe", -stagger);
                var charmed = false;
                if (soothe && charmTicks > 0 && MobEffects.apply(world, target, disarmingvoiceCharm, charmTicks, 0) !== null) {
                    if (soften > 0) NativeEffects.boost(world, target, "atk", -soften);
                    charmed = true;
                }
                hits++;
                WorldFeedback.emit(world, disarmingvoiceScene, 1, facts.position(),
                    { moment: "hit", target: String(target.ref()), intensity: intensity, notes: notes, charmed: charmed, scale: 1 }, 26);
            });
            // 声场以自身为心一次成形，边界按实际半径铺开，不做慢推进。
            WorldFeedback.emit(world, disarmingvoiceScene, 1, origin,
                { moment: "wave", radius: radius, hits: hits, intensity: intensity, charmed: soothe, flow: flow }, 34);
            if (hits > 0) world.sound("minecraft:entity.allay.item_taken", origin, 16, "{}");
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.4, 0)),
                hits > 0 ? disarmingvoiceHitText : disarmingvoiceEmptyText, hits > 0 ? [hits] : [], 28);
            done(action);
        }
    });

    // 魅惑存续期：只要目标还带着本单元的魅惑载体就续播头顶的心，驱散或到期后不再续期，随反馈自然结束。
    WorldCombat.on("world_combat:move_disarmingvoice/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== disarmingvoiceCharm) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 10 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "disarmingvoice:charm:" + String(actor.ref()), disarmingvoiceScene, 1, body.position(),
            { moment: "charmed", target: String(actor.ref()), tick: 40 }, 40);
    });
}
