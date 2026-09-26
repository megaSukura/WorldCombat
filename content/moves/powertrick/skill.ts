/**
 * 力量戏法 / powertrick —— 执行组织与可逆对调。
 *
 * 核心念头：一手假动作，把你身上的两股力道——攻势与守势——在众目睽睽之下一翻；戏法一旦落定就保持不变，
 *   直到你再演一次把它翻回来。它是一段**长姿态**：落定后由你决定何时翻回，或让它在长戏窗口里保持很久；
 *   另一个短姿态招（力量转换）是自动到点换回、可反复刷新的短窗口。
 *
 * 三幕：
 *   起意（windup，提交前）：两色牌在身侧分开成形（暖＝攻势、冷＝守势），只播预告，可被打断且不花代价。
 *   翻面（提交后）：先按记号撤掉本招上一次拥有的层，再读取此刻干净的攻防，把两股力道真正对调——宝可梦走
 *     共享 NativeModifiers 的 stats 层（挂在保持窗口的承载上，不改能力等级），其他战斗者只在原版攻击与护甲
 *     两真实属性都存在时对调，缺项明确无效、不拿 0 伪造。保持窗口承载成功后才写唯一记号；窗口走完自然褪去
 *     （lapse），被牛奶/清除效果解除是「被翻回」（flipback）。
 *   翻回：**在窗口内再施展一次**即主动翻回（原生 onRestart 的读法）；翻回只撤本招自己拥有的层，期间其他增益
 *     保留。数值都按记号换回原样。
 *
 * 与力量转换分开：力量转换是自动到点换回、可反复刷新的短窗口（Normal 属性）；力量戏法落在 Psychic 属性、
 *   更快，并且是一个**手动翻面的长姿态**——落定后由你再决定何时翻回，或让它在长戏窗口里保持很久。
 */
namespace PokemonSkills {
    const powertrickScene = "world_combat:move_powertrick";
    const powertrickHold = "world_combat:powertrick_hold";
    const powertrickMark = "world_combat:powertrick_mark";
    const powertrickShift = "world_combat:powertrick_shift";
    const powertrickContribution = "world_combat:move/powertrick";
    const powertrickTrickText = "world_combat.move.powertrick.text.trick";
    const powertrickRevertText = "world_combat.move.powertrick.text.revert";
    const powertrickInvalidText = "world_combat.move.powertrick.text.invalid";

    /** 非宝可梦的对调载体：只在原版攻击与护甲都真实存在时对调；缺任一项本招对其无效，修饰随这个效果结束撤销。 */
    WorldCombat.effect(powertrickShift, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid power trick carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powertrickShift, "start", function (effect) {
        const world = effect.world(), actor = effect.target();
        const attack = world.attributeValue(actor, "minecraft:generic.attack_damage", true);
        const armour = world.attributeValue(actor, "minecraft:generic.armor", true);
        // 缺项不是 0：不制造一次假交换。
        if (attack === null || armour === null) { effect.end(); return; }
        const attackValue = attack.value(), armourValue = armour.value();
        world.attribute(actor, "minecraft:generic.attack_damage", armourValue - attackValue, "add_value");
        world.attribute(actor, "minecraft:generic.armor", attackValue - armourValue, "add_value");
    });
    WorldCombat.effectHandler(powertrickShift, "operation:world_combat:dispel", function (effect) { effect.end(); });

    WorldCombat.effect(powertrickMark, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["layer", "atk", "def", "spin", "max"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid power trick mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powertrickMark, "start", function () { });
    WorldCombat.effectHandler(powertrickMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /**
     * 一个战斗者此刻干净的攻势与守势：宝可梦读原生攻防，其他战斗者读原版攻击与护甲。
     * 普通实体缺任一项返回 null（本招对其无效）；调用前须已撤掉本招自己的层，读到的才是真本钱。
     */
    function powertrickValues(world: CombatWorld, actor: CombatActor): { attack: number; defence: number } | null {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor), pokemon = CobblemonCombat.pokemon(actor);
            return { attack: NativeEffects.stat(pokemon, state, "atk"), defence: NativeEffects.stat(pokemon, state, "def") };
        }
        const attack = world.attributeValue(actor, "minecraft:generic.attack_damage", true);
        const armour = world.attributeValue(actor, "minecraft:generic.armor", true);
        if (attack === null || armour === null) return null;
        return { attack: attack.value(), defence: armour.value() };
    }

    /** 按记号把这次对调撤销：收回本招拥有的数值层与记号；返回对调前的两数用于浮字。 */
    function powertrickRevert(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, powertrickMark);
        if (views.length === 0) return null;
        const mark = JSON.parse(String(views[0].data()));
        if (typeof mark.layer === "number") world.operation(mark.layer, "world_combat:dispel", "{}");
        world.operation(views[0].id(), "world_combat:dispel", "{}");
        return mark;
    }

    define({
        id: "powertrick",
        cooldownParameter: "recharge",
        name: "力量戏法",
        description: "一手假动作把自己的攻击与防御对调：落定后保持不变，再施展一次即翻回，窗口走完也会自动翻回。",
        uses: ["防高攻低的守将翻过来打一轮", "攻高防低的打手翻过去硬扛一轮", "在对手的类型与打法已知后选一种形态"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 70,
        style: "trick",
        stationary: true,
        defaults: { long: true, ai: { maxChase: 14, minGap: 3, minEdge: 1.15, low: 0.5 } },
        fields: [],
        indicator: function (config, _pokemon) {
            return { radius: 0.9, geometry: "area", style: "trick", color: 0xE8843C,
                label: config && config.long === true ? "力量戏法 · 长戏" : "力量戏法 · 短戏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powertrick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("powertrick", "tempo", context)),
                recover: Math.round(p("powertrick", "aftercast", context)),
                cooldown: Math.round(p("powertrick", "recharge", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (_action, _config) { return ""; },
        windup: function (action, _config, prepare) {
            action.present("world_combat:powertrick:gather", powertrickScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", spin: p("powertrick", "spin", action) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            // 窗口内再施展一次就是主动翻回：撤掉本招拥有的层与记号，其他增益保留。
            if (world.effects(actor, powertrickMark).length > 0) {
                MobEffects.consume(world, actor, powertrickHold);
                const mark = powertrickRevert(world, actor);
                if (mark !== null) {
                    WorldFeedback.emit(world, powertrickScene, 1, body.position(),
                        { moment: "flipback", actor: String(actor.ref()), back: 1, spin: Math.max(4, Math.round(mark.spin)) }, 30);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powertrickRevertText,
                        [Math.round(mark.atk), Math.round(mark.def)], 28);
                    sound(action, "minecraft:block.beacon.deactivate");
                }
                done(action);
                return;
            }
            // 干净起点：撤掉可能残留的本招旧层后，再读双方有效攻防。
            powertrickRevert(world, actor);
            const values = powertrickValues(world, actor);
            if (values === null) {
                WorldFeedback.emit(world, powertrickScene, 1, body.position(),
                    { moment: "reject", actor: String(actor.ref()), scale: 1 }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powertrickInvalidText, [], 24);
                done(action);
                return;
            }
            const window = Math.max(120, Math.round(p("powertrick", "window", action)));
            const spin = Math.max(4, Math.round(p("powertrick", "spin", action)));
            // 承载成功才建唯一记号：先立保持窗口，再写数值层，最后记下这次拥有的机制。
            const hold = MobEffects.apply(world, actor, powertrickHold, window, 0);
            if (hold === null) { done(action); return; }
            const carrier = MobEffects.anchor(hold);
            let layer = -1;
            if (String(actor.domain()) === "cobblemon") {
                layer = NativeModifiers.apply(world, actor,
                    { stats: { atk: Math.max(1, Math.round(values.defence)), def: Math.max(1, Math.round(values.attack)) },
                        carrier: carrier, source: powertrickContribution }, window + 40);
            } else {
                layer = world.effect(powertrickShift, actor, "{}", window + 40);
            }
            if (!(layer > 0)) {
                // 数值层没建起来：撤掉保持窗口，不留下假姿态。
                MobEffects.consume(world, actor, powertrickHold);
                done(action);
                return;
            }
            world.effect(powertrickMark, actor,
                JSON.stringify({ layer: layer, atk: values.attack, def: values.defence, spin: spin, max: window }), window + 60);
            const gap = Math.abs(values.attack - values.defence);
            WorldFeedback.emit(world, powertrickScene, 1, body.position(),
                { moment: "trick", actor: String(actor.ref()), spin: spin,
                    scale: Math.max(0.6, Math.min(1.6, gap / 90 + 0.6)), intensity: Math.max(0.7, Math.min(2, gap / 60)) }, 32);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powertrickTrickText,
                [Math.round(values.attack), Math.round(values.defence)], 30);
            // 保持期间的姿态绑在真正的数值层上：窗口关闭、翻回或清除时一起收。
            WorldFeedback.onEffect(world, layer, "world_combat:move_powertrick/hold", powertrickScene, 1, body.position(),
                { moment: "hold", actor: String(actor.ref()), spin: spin });
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound("minecraft:block.amethyst_block.resonate", body.position(), 14, "{}");
            done(action);
        }
    });

    // 窗口走完或被动翻回：按记号把数值换回原样；自然到期与被清除是两条岔路。
    WorldCombat.on("world_combat:move_powertrick/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powertrickHold) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const mark = powertrickRevert(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, powertrickScene, 1, body.position(),
            { moment: expired ? "lapse" : "flipback", actor: String(actor.ref()), expired: expired ? 1 : 0 }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), powertrickRevertText,
            [Math.round(mark.atk), Math.round(mark.def)], 26);
        world.sound(expired ? "minecraft:block.beacon.deactivate" : "minecraft:block.amethyst_block.break", body.position(), 12, "{}");
    });
}
