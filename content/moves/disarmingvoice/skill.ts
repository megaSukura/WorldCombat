/**
 * 魅惑之声 / disarmingvoice 的出手方式。
 *
 * 核心念头：一声魅惑的鸣叫充满身周整块空间——站在声场里的对手避无可避，所以必定命中；它伤的是心，
 * 命中后让对手错拍，安抚形态还卸掉对方出手的劲。
 *
 * 两幕：
 *   起：吸气攒声，音符与心在身周聚拢（提交前 windup 预告）。
 *   放：提交后一圈声波从身上扩张到边缘（range 即声场半径），罩住范围内所有敌人；每个命中者降速错拍，
 *       安抚时额外挂上魅惑身份并降攻。
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
        description: "一声魅惑的鸣叫充满以身周为心的整块空间，站在声场里的对手避无可避，因此必定命中；命中后让对手错拍，安抚形态还卸掉对方出手的劲。",
        uses: ["以自身为心的整圈声场", "同时让一圈对手错拍", "用安抚卸掉一圈对手的劲"],
        kind: "enemy",
        range: 6,
        maxRange: 10,
        prepare: 5,
        active: 22,
        recover: 8,
        cooldown: 32,
        style: "song",
        defaults: { soothe: false, ai: { maxChase: 12, group: true, leaveStation: true } },
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
                hurt(action, target, "disarmingvoice", power, { damage: damageSpec("disarmingvoice", "note"), sound: true });
                NativeEffects.boost(world, target, "spe", -stagger);
                var charmed = false;
                if (soothe && charmTicks > 0 && MobEffects.apply(world, target, disarmingvoiceCharm, charmTicks, 0) !== null) {
                    if (soften > 0) NativeEffects.boost(world, target, "atk", -soften);
                    charmed = true;
                }
                hits++;
                WorldFeedback.emit(world, disarmingvoiceScene, 1, facts.position(),
                    { moment: "hit", target: String(target.ref()), intensity: intensity, notes: notes, charmed: charmed, scale: 1 }, 26);
                if (charmed) WorldFeedback.keep(world, "disarmingvoice:charm:" + String(target.ref()),
                    disarmingvoiceScene, 1, facts.position(), { moment: "charmed", target: String(target.ref()), tick: charmTicks },
                    Math.min(charmTicks, 200));
            });
            WorldFeedback.emit(world, disarmingvoiceScene, 1, origin,
                { moment: "wave", radius: radius, scale: radius / 6, hits: hits, intensity: intensity, charmed: soothe, flow: flow }, 34);
            if (hits > 0) world.sound("minecraft:entity.allay.item_taken", origin, 16, "{}");
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.4, 0)),
                hits > 0 ? disarmingvoiceHitText : disarmingvoiceEmptyText, hits > 0 ? [hits] : [], 28);
            done(action);
        }
    });
}
