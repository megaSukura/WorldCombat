/**
 * 力量转换 / powershift 的出手方式。
 *
 * 核心念头：把身上的力道在两处之间倒过来——攻势与守势交换位置：攻高防低的人换完能扛，防高攻低的人换完能打。
 *   它是本组里唯一交换**数值本身**的一招，也是唯一完全可逆的一招：交换只在一段窗口内维持，窗口走完自己换回来。
 *
 * 三幕：
 *   起势（windup，提交前）：两股力道在身侧分开成形，一股偏暖（攻势）、一股偏冷（守势）；可被打断，不消耗任何东西。
 *   倒转（提交后）：把两边的数值对调——宝可梦走共享临时属性层，其他战斗者把原版攻击与护甲属性对调；
 *     挂上共享身份 world_combat:status/powershift 的交换窗口，并另存一份「这次换的是哪一个过程」的记号。
 *   锁定（收势）：两股力道穿过后锁住，浮出结果；窗口走完或被清除时，按记号结束这次交换，数值自动回到原样。
 *
 * 与同族分开：磨爪、盘蜷改的是能力等级（-6..+6 的阶梯）；力量转换不动等级，只把两个现成数值对调，
 *   换来的是另一种形态而不是更高的强度，并且可以精确地换回去。
 */
namespace PokemonSkills {
    const powershiftScene = "world_combat:move_powershift";
    const powershiftStance = "world_combat:powershift_stance";
    const powershiftMark = "world_combat:powershift_mark";
    const powershiftSwap = "world_combat:powershift_swap";
    const powershiftText = "world_combat.move.powershift.text.shifted";
    const powershiftFadeText = "world_combat.move.powershift.text.reverted";

    // 记号：记录这次交换由哪个托管效果承载，窗口提前结束时照它精确结束（其余修饰效果不受影响）。
    WorldCombat.effect(powershiftMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.swap !== "number") throw new Error("Invalid power shift mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powershiftMark, "start", function () { });

    // 非宝可梦的交换载体：把原版攻击力与护甲对调；修饰随这个效果结束一起撤销。
    WorldCombat.effect(powershiftSwap, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid power shift carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powershiftSwap, "start", function (effect) {
        const world = effect.world(), actor = effect.target();
        const attack = world.attributeValue(actor, "minecraft:generic.attack_damage");
        const armour = world.attributeValue(actor, "minecraft:generic.armor");
        const attackValue = attack === null ? 0 : attack.value(), armourValue = armour === null ? 0 : armour.value();
        if (attack !== null) world.attribute(actor, "minecraft:generic.attack_damage", armourValue - attackValue, "add_value");
        if (armour !== null) world.attribute(actor, "minecraft:generic.armor", attackValue - armourValue, "add_value");
    });
    WorldCombat.effectHandler(powershiftSwap, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 交换前两样本钱的实际值：宝可梦读原生攻防，其他战斗者读原版攻击与护甲。 */
    function powershiftValues(world: CombatWorld, actor: CombatActor): { attack: number; defence: number } {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor), pokemon = CobblemonCombat.pokemon(actor);
            return { attack: NativeEffects.stat(pokemon, state, "atk"), defence: NativeEffects.stat(pokemon, state, "def") };
        }
        const attack = world.attributeValue(actor, "minecraft:generic.attack_damage");
        const armour = world.attributeValue(actor, "minecraft:generic.armor");
        return { attack: attack === null ? 0 : attack.value(), defence: armour === null ? 0 : armour.value() };
    }

    define({
        id: "powershift",
        name: "力量转换",
        description: "将自己的攻击与防御互相交换一段时间，窗口走完自动换回。",
        uses: ["攻高防低时换过来硬扛一轮", "防高攻低时换过去打一轮输出", "在对手的类型与打法已知后选一种形态"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 80,
        style: "shift",
        stationary: true,
        defaults: { hold: false, ai: { maxChase: 14, minGap: 3, minEdge: 1.15 } },
        fields: [flag("hold", "维持")],
        indicator: function (config, _pokemon) {
            return { radius: 0.9, geometry: "area", style: "shift", color: 0x9FD8E8,
                label: config && config.hold === true ? "力量转换 · 维持" : "力量转换 · 短换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powershift"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("powershift", "tempo", context)),
                recover: Math.round(p("powershift", "aftercast", context)),
                cooldown: Math.round(p("powershift", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_powershift:gather", powershiftScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", hold: config && config.hold === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const window = Math.max(80, Math.round(p("powershift", "window", action)));
            const bands = Math.max(10, Math.round(p("powershift", "bands", action)));
            const values = powershiftValues(world, actor);
            const gap = Math.abs(values.attack - values.defence);
            const reach = Math.max(0.4, Math.min(1.6, gap / 60));
            const duration = window + 2;
            let mechanism = -1;
            if (String(actor.domain()) === "cobblemon") {
                mechanism = NativeModifiers.apply(world, actor,
                    { stats: { atk: Math.max(1, Math.round(values.defence)), def: Math.max(1, Math.round(values.attack)) } }, duration);
            } else {
                mechanism = world.effect(powershiftSwap, actor, "{}", duration);
            }
            world.effect(powershiftMark, actor, JSON.stringify({ swap: mechanism }), duration);
            MobEffects.apply(world, actor, powershiftStance, window, 0);
            WorldFeedback.emit(world, powershiftScene, 1, body.position(),
                { moment: "cross", actor: String(actor.ref()), bands: bands, scale: 1, reach: reach, gap: Math.round(gap * 10) / 10,
                    intensity: Math.max(0.8, Math.min(2, gap / 60 + bands / 40)) }, 32);
            WorldFeedback.keep(world, "powershift:aura:" + String(actor.ref()), powershiftScene, 1, body.position(),
                { moment: "hum", actor: String(actor.ref()), bands: Math.max(6, Math.round(bands / 3)), reach: reach },
                Math.min(window, 160));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powershiftText,
                [Math.round(values.attack), Math.round(values.defence)], 30);
            world.sound("cobblemon:move.doubleteam.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 交换窗口走完或被清除：按记号结束这次交换，数值自动回到原样；其余修饰效果不受影响。
    WorldCombat.on("world_combat:move_powershift/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powershiftStance) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, powershiftMark);
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.swap === "number" && mark.swap >= 0) world.operation(mark.swap, "world_combat:dispel", "{}");
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, powershiftScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powershiftFadeText, [], 24);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 14, "{}");
    });
}
