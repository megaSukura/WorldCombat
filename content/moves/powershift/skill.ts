/**
 * 力量转换 / powershift 的出手方式。
 *
 * 核心念头：把身上的力道在两处之间倒过来——攻势与守势交换位置：攻高防低的人换完能扛，防高攻低的人换完能打。
 *   它是本组里唯一交换**数值本身**的一招，也是唯一完全可逆的一招：交换只在一段窗口内维持，窗口走完自己换回来。
 *
 * 三幕：
 *   起势（windup，提交前）：两股力道在身侧分开成形，一股偏暖（攻势）、一股偏冷（守势）；可被打断，不消耗任何东西。
 *   倒转（提交后）：先撤掉本招上一次拥有的交换层，再读取此刻真正的基础攻防（含其他效果的影响）——
 *     宝可梦走共享临时属性层并把这层挂在交换窗口上；其他战斗者只在攻击与护甲属性都真实存在时对调，
 *     缺项明确无效、不会拿 0 伪造。挂上共享身份 world_combat:status/powershift 的交换窗口，并记下本次拥有的机制 id。
 *   锁定（收势）：两股力道穿过后锁住，浮出结果；窗口走完或被清除时，只结束本次交换，数值自动回到原样。
 *
 * 与同族分开：磨爪、盘蜷改的是能力等级（-6..+6 的阶梯）；力量转换不动等级，只把两个现成数值对调，
 *   换来的是另一种形态而不是更高的强度，并且可以精确地换回去。
 */
namespace PokemonSkills {
    const powershiftScene = "world_combat:move_powershift";
    const powershiftStance = "world_combat:powershift_stance";
    const powershiftMark = "world_combat:powershift_mark";
    const powershiftSwap = "world_combat:powershift_swap";
    const powershiftContribution = "world_combat:move/powershift";
    const powershiftText = "world_combat.move.powershift.text.shifted";
    const powershiftInvalidText = "world_combat.move.powershift.text.invalid";
    const powershiftFadeText = "world_combat.move.powershift.text.reverted";

    // 记号：记录这次交换由哪个机制承载；刷新时先按它撤掉上一次，窗口提前结束时也照它精确结束。
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
        // 只有两项都真实存在时才对调；缺项不应被当成 0 去伪造交换。
        if (attack === null || armour === null) { effect.end(); return; }
        const attackValue = attack.value(), armourValue = armour.value();
        world.attribute(actor, "minecraft:generic.attack_damage", armourValue - attackValue, "add_value");
        world.attribute(actor, "minecraft:generic.armor", attackValue - armourValue, "add_value");
    });
    WorldCombat.effectHandler(powershiftSwap, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 交换前两样本钱的实际值：宝可梦读原生攻防，其他战斗者读原版攻击与护甲；缺项返回 null。 */
    function powershiftValues(world: CombatWorld, actor: CombatActor): { attack: number; defence: number } | null {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor), pokemon = CobblemonCombat.pokemon(actor);
            return { attack: NativeEffects.stat(pokemon, state, "atk"), defence: NativeEffects.stat(pokemon, state, "def") };
        }
        const attack = world.attributeValue(actor, "minecraft:generic.attack_damage");
        const armour = world.attributeValue(actor, "minecraft:generic.armor");
        if (attack === null || armour === null) return null;
        return { attack: attack.value(), defence: armour.value() };
    }

    /** 撤掉本招上一次拥有的交换层与记号：重复施放先回到干净的基础值，再建立唯一新窗口。 */
    function powershiftWithdraw(world: CombatWorld, actor: CombatActor): void {
        const marks = world.effects(actor, powershiftMark);
        for (let index = 0; index < marks.length; index++) {
            const mark = JSON.parse(String(marks[index].data()));
            if (typeof mark.swap === "number" && mark.swap >= 0) world.operation(mark.swap, "world_combat:dispel", "{}");
            world.operation(marks[index].id(), "world_combat:dispel", "{}");
        }
    }

    define({
        id: "powershift",
        cooldownParameter: "wait",
        name: "力量转换",
        description: "把自己的攻击与防御数值对调，并维持一段可见的窗口；窗口走完自动换回。攻高防低时换过来能扛，防高攻低时换过去能打。它不改能力等级，只把你现成的两样本钱对调。",
        uses: ["攻高防低时换过来硬扛一轮", "防高攻低时换过去打一轮输出", "在对手的打法已知后选一种形态"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 80,
        style: "shift",
        stationary: true,
        defaults: { hold: false, ai: { maxChase: 14, minGap: 3, minEdge: 1.05, low: 0.6 } },
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
            // 重复施放先撤掉本招自己的交换层，再读取此刻真正的基础值。
            powershiftWithdraw(world, actor);
            const values = powershiftValues(world, actor);
            if (values === null) {
                WorldFeedback.emit(world, powershiftScene, 1, body.position(),
                    { moment: "reject", actor: String(actor.ref()), scale: 1 }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powershiftInvalidText, [], 24);
                done(action);
                return;
            }
            const gap = Math.abs(values.attack - values.defence);
            const reach = Math.max(0.4, Math.min(1.6, gap / 60));
            const duration = window + 2;
            const stance = MobEffects.apply(world, actor, powershiftStance, window, 0);
            if (stance === null) { done(action); return; }
            let mechanism = -1;
            if (String(actor.domain()) === "cobblemon") {
                mechanism = NativeModifiers.apply(world, actor,
                    { stats: { atk: Math.max(1, Math.round(values.defence)), def: Math.max(1, Math.round(values.attack)) },
                        carrier: MobEffects.anchor(stance), source: powershiftContribution }, duration);
            } else {
                mechanism = world.effect(powershiftSwap, actor, "{}", duration);
            }
            world.effect(powershiftMark, actor, JSON.stringify({ swap: mechanism }), duration);
            WorldFeedback.emit(world, powershiftScene, 1, body.position(),
                { moment: "cross", actor: String(actor.ref()), bands: bands, scale: 1, reach: reach, gap: Math.round(gap * 10) / 10,
                    intensity: Math.max(0.8, Math.min(2, gap / 60 + bands / 40)) }, 32);
            // 保持期间的小双色扣环绑在真正的交换机制上，窗口关闭、交换结束时一起收。
            if (mechanism > 0)
                WorldFeedback.onEffect(world, mechanism, "world_combat:move_powershift/hold", powershiftScene, 1, body.position(),
                    { moment: "hum", actor: String(actor.ref()), bands: Math.max(6, Math.round(bands / 3)), reach: reach });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powershiftText,
                [Math.round(values.attack), Math.round(values.defence)], 30);
            world.sound("cobblemon:move.doubleteam.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 交换窗口走完或被清除：按记号结束本次交换（宝可梦的交换层随窗口自行结束，这里是同一条收尾），数值自动回到原样。
    WorldCombat.on("world_combat:move_powershift/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powershiftStance) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧窗口被移除而新窗口仍在：不是真的结束。
        if (MobEffects.read(world, actor, powershiftStance)) return;
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
