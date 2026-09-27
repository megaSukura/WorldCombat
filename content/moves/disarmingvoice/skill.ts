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
    const disarmingvoiceLingerMark = "world_combat:move_disarmingvoice/linger_mark";
    const disarmingvoiceHitText = "world_combat.move.disarmingvoice.text.hit";
    const disarmingvoiceEmptyText = "world_combat.move.disarmingvoice.text.empty";

    define({
        id: "disarmingvoice",
        name: "Disarming Voice",
        description: "一声魅惑的鸣叫充满以身周为心的整块空间，站在声场里的对手避无可避，因此不做随机命中检定，声场也不被墙壁与掩体阻挡；只有真的受伤的对手才会被震到错拍，安抚形态还额外卸掉它们出手的劲并留下魅惑。错拍与卸劲是不会自行恢复的能力等级，只有能力等级被重置或脱离战斗后才归零。没有敌人时也能清唱。",
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
                const staggerTicks = Math.max(1, Math.round(p("disarmingvoice", "staggerTicks", action)));
                const echo = MobEffects.read(world, target, "world_combat:disarming_echo") === null
                    ? MobEffects.apply(world, target, "world_combat:disarming_echo", staggerTicks, 0) : null;
                if (echo !== null) {
                    const window = NativeEffects.boostWindow(world, target, { spe: -stagger }, staggerTicks, "world_combat:move/disarmingvoice-tempo", echo, null);
                    if (window === 0) world.removeMobEffect(target, "world_combat:disarming_echo", echo.key());
                }
                var charmed = false;
                const charm = soothe && charmTicks > 0 && MobEffects.read(world, target, disarmingvoiceCharm) === null
                    ? MobEffects.apply(world, target, disarmingvoiceCharm, charmTicks, 0) : null;
                if (charm !== null) {
                    const owned = soften > 0 ? NativeEffects.boostWindow(world, target, { atk: -soften }, charmTicks, "world_combat:move/disarmingvoice-charm", charm, null) : 0;
                    if (owned === 0) world.removeMobEffect(target, disarmingvoiceCharm, charm.key());
                    else {
                    // 心形表现由真实魅惑载体自己的托管效果拥有：载体被驱散或到期，头顶的心同步收走。
                    if (world.effects(target, disarmingvoiceLingerMark).length === 0)
                        world.effect(disarmingvoiceLingerMark, target, JSON.stringify({ notes: notes, intensity: intensity }),
                            Math.max(1, Math.min(2400, charmTicks)));
                    charmed = true;
                    }
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

    // 魅惑存续的托管载体：把「目标头顶持续打转的心」绑在真实 status/charmed 载体上，
    // 自然到期、牛奶／`/effect clear` 提前拿掉都随载体一起停，不再靠独立计时，也不留驱散后的残影。
    function disarmingvoiceLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        // 每次巡检都重读当前魅惑载体（含刷新后的新应用），时间以最新载体为准，不留失效锚。
        const carrier = world.mobEffect(target, disarmingvoiceCharm);
        if (carrier === null) { effect.end(); return; }
        const mark = JSON.parse(String(effect.state()));
        WorldFeedback.onEffect(world, effect.id(), "charmed", disarmingvoiceScene, 1, body.position(),
            { moment: "charmed", target: String(target.ref()), notes: mark.notes, intensity: mark.intensity, tick: 40 });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(disarmingvoiceLingerMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.notes !== "number" || !isFinite(value.notes) || value.notes < 0) throw new Error("Invalid disarming voice linger mark: notes");
        if (typeof value.intensity !== "number" || !isFinite(value.intensity) || value.intensity <= 0) throw new Error("Invalid disarming voice linger mark: intensity");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(disarmingvoiceLingerMark, "start", disarmingvoiceLingerWatch);
    WorldCombat.effectHandler(disarmingvoiceLingerMark, "watch", disarmingvoiceLingerWatch);
    WorldCombat.effectHandler(disarmingvoiceLingerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 魅惑被牛奶／/effect clear 提前拿掉时，立即撤掉托管的心，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_disarmingvoice/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== disarmingvoiceCharm) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, disarmingvoiceLingerMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });
}
