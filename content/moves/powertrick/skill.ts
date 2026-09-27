/**
 * 力量戏法 / powertrick —— 执行组织与可逆对调。
 *
 * 核心念头：一手假动作，把你身上的两股力道——攻势与守势——在众目睽睽之下一翻；戏法一旦落定就保持不变，
 *   直到你再演一次把它翻回来。它是一段**长姿态**：落定后由你决定何时翻回，或让它在长戏窗口里保持很久；
 *   另一个短姿态招（力量转换）是自动到点换回、可刷新的短窗口。
 *
 * 三幕：
 *   起意（windup，提交前）：两色牌在身侧分开成形（暖＝攻势、冷＝守势），只播预告，可被打断且不花代价。
 *   翻面（提交后）：先按记号撤掉本招上一次拥有的层，再读取此刻干净的攻防，把两股力道真正对调——宝可梦走
 *     共享 NativeModifiers 的 stats 层（挂在保持窗口的承载上，不改能力等级）；普通战斗者要求原版攻击与护甲
 *     两真实属性都存在，按公开单位 **2 护甲点 = 1 攻击 HP** 精确换算（A'=Armor/2、Armor'=2*A），用
 *     CombatCopies.equalize 建一个自有加性层，原生乘数与零起点都由 shared 层补偿；缺项不拿 0 伪造，
 *     原生范围/零乘数不允许达成时整层回滚并清掉本次承载。保持窗口承载成功后才写唯一记号；窗口走完自然
 *     褪去（lapse），被牛奶/清除效果解除是「被翻回」（flipback）。
 *   翻回：**在窗口内再施展一次**即主动翻回；翻回只撤本招自己拥有的层，期间其他增益保留。数值按记号换回原样。
 *
 * 与力量转换的互斥：两招共用原生 MobEffect 标签 world_combat:status/attack_defence_inversion 作为「攻防倒转」
 *   身份。其他倒转（含另一招或第三方内容）仍在时，ready 与真正 execute 都拒绝起手；只有本招自己的长姿态才允许
 *   再施展一次翻回。身份由标签开放扩展，不维护普通模组倒转名单。
 *
 * 与力量转换分开：力量转换是自动到点换回、可刷新的短窗口（Normal 属性）；力量戏法落在 Psychic 属性、
 *   更快，并且是一个**手动翻面的长姿态**——落定后由你再决定何时翻回，或让它在长戏窗口里保持很久。
 */
namespace PokemonSkills {
    const powertrickScene = "world_combat:move_powertrick";
    const powertrickCardsScene = "world_combat:move_powertrick_cards";
    const powertrickHold = "world_combat:powertrick_hold";
    const powertrickMark = "world_combat:powertrick_mark";
    const powertrickContribution = "world_combat:move/powertrick";
    const powertrickAttack = "minecraft:generic.attack_damage";
    const powertrickArmour = "minecraft:generic.armor";
    const powertrickInversion = "world_combat:status/attack_defence_inversion";
    const powertrickTrickText = "world_combat.move.powertrick.text.trick";
    const powertrickRevertText = "world_combat.move.powertrick.text.revert";
    const powertrickInvalidText = "world_combat.move.powertrick.text.invalid";

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
     * 一个战斗者此刻干净的攻势与守势：宝可梦读原生攻防，其他战斗者读原版攻击 HP 与护甲点。
     * 普通实体缺任一项返回 null（本招对其无效）；调用前须已撤掉本招自己的层，读到的才是真本钱。
     */
    function powertrickValues(world: CombatWorld, actor: CombatActor): { attack: number; defence: number } | null {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor), pokemon = CobblemonCombat.pokemon(actor);
            return { attack: NativeEffects.stat(pokemon, state, "atk"), defence: NativeEffects.stat(pokemon, state, "def") };
        }
        const attack = world.attributeValue(actor, powertrickAttack, true);
        const armour = world.attributeValue(actor, powertrickArmour, true);
        if (attack === null || armour === null) return null;
        return { attack: attack.value(), defence: armour.value() };
    }

    /** 本次对调后的目标值：宝可梦培养攻防 1:1 互换；普通战斗者 2 护甲点 = 1 攻击 HP。 */
    function powertrickTargets(domain: string, values: { attack: number; defence: number }): { attack: number; defence: number } {
        if (domain === "cobblemon") return { attack: values.defence, defence: values.attack };
        return { attack: values.defence / 2, defence: values.attack * 2 };
    }

    /** 读取本招自己当前拥有的保持窗口承载（不依赖记号），用来判定翻回与拒绝。 */
    function powertrickOwned(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        return MobEffects.read(world, actor, powertrickHold);
    }

    /** 其他倒转身份（含另一招与第三方内容）是否仍在该战斗者身上；本招自己的保持窗口也算成员。 */
    function powertrickInverted(world: CombatWorld, actor: CombatActor): boolean {
        return MobEffects.hasTag(world, actor, powertrickInversion);
    }

    /** 按记号把这次对调撤销：收回本招拥有的数值层与记号；返回对调前的两数用于浮字。 */
    function powertrickRevert(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, powertrickMark);
        if (views.length === 0) return null;
        const mark = JSON.parse(String(views[0].data()));
        if (typeof mark.layer === "number" && mark.layer > 0) world.operation(mark.layer, "world_combat:dispel", "{}");
        world.operation(views[0].id(), "world_combat:dispel", "{}");
        return mark;
    }

    /** 撤掉本招拥有的承载；只有当前承载仍是这一次观察到的 revision 时才移除，避免误伤刷新后的新层。 */
    function powertrickDropCarrier(world: CombatWorld, actor: CombatActor, observed: CombatMobEffect): void {
        const current = MobEffects.read(world, actor, powertrickHold);
        if (current !== null && String(current.key()) === String(observed.key())) world.removeMobEffect(actor, powertrickHold, String(observed.key()));
    }

    define({
        id: "powertrick",
        cooldownParameter: "recharge",
        name: "力量戏法",
        description: "一手假动作把自己的攻击与防御对调：落定后保持不变，再施展一次即翻回，窗口走完也会自动翻回。宝可梦只交换培养攻防、不动能力等级；普通生物按 2 护甲点 = 1 攻击 HP 的公开单位互换。",
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
        // 起手与提交前都用只读作用域核验互斥：自己的长姿态允许再施展翻回，其他倒转身份一律拒绝。
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor();
            if (world.mobEffect(actor, powertrickHold) !== null) return "";
            if (MobEffects.hasTag(world, actor, powertrickInversion)) return "inversion-active";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:powertrick:gather", powertrickScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", spin: p("powertrick", "spin", action) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const position = body.position();
            function reject(): void {
                WorldFeedback.emit(world, powertrickScene, 1, position, { moment: "reject", actor: String(actor.ref()), scale: 1 }, 24);
                WorldFeedback.text(world, position.plus(WorldCombat.point(0, 1.3, 0)), powertrickInvalidText, [], 24);
            }
            // 窗口内再施展一次就是主动翻回：撤掉本招拥有的层与承载，其他增益保留。
            if (world.effects(actor, powertrickMark).length > 0) {
                const mark = powertrickRevert(world, actor);
                MobEffects.consume(world, actor, powertrickHold);
                if (mark !== null) {
                    const restored = powertrickValues(world, actor) || { attack: mark.atk, defence: mark.def };
                    WorldFeedback.emit(world, powertrickCardsScene, 1, position,
                        { moment: "flipback", actor: String(actor.ref()), start: world.tick(), duration: 26, spin: Math.max(4, Math.round(mark.spin)) }, 34);
                    WorldFeedback.emit(world, powertrickScene, 1, position,
                        { moment: "flipback", actor: String(actor.ref()), back: 1, spin: Math.max(4, Math.round(mark.spin)) }, 30);
                    WorldFeedback.text(world, position.plus(WorldCombat.point(0, 1.3, 0)), powertrickRevertText,
                        [Math.round(restored.attack), Math.round(restored.defence)], 28);
                    sound(action, "minecraft:block.beacon.deactivate");
                }
                done(action);
                return;
            }
            // 干净起点：撤掉可能残留的本招旧层，再核验没有其他倒转身份。
            powertrickRevert(world, actor);
            const stale = powertrickOwned(world, actor);
            if (stale !== null) powertrickDropCarrier(world, actor, stale);
            if (powertrickInverted(world, actor)) { reject(); done(action); return; }
            const values = powertrickValues(world, actor);
            if (values === null) { reject(); done(action); return; }
            const window = Math.max(120, Math.round(p("powertrick", "window", action)));
            const spin = Math.max(4, Math.round(p("powertrick", "spin", action)));
            const domain = String(actor.domain()), targets = powertrickTargets(domain, values);
            // 承载成功才建唯一记号：先立保持窗口，再写数值层，最后记下这次拥有的机制。
            const hold = MobEffects.apply(world, actor, powertrickHold, window, 0);
            if (hold === null) { done(action); return; }
            let layer = -1;
            if (domain === "cobblemon") {
                layer = NativeModifiers.apply(world, actor,
                    { stats: { atk: Math.max(1, Math.round(targets.attack)), def: Math.max(1, Math.round(targets.defence)) },
                        carrier: MobEffects.anchor(hold), source: powertrickContribution }, window + 40);
            } else {
                const equalized: CombatCopies.Values = {};
                equalized[powertrickAttack] = targets.attack;
                equalized[powertrickArmour] = targets.defence;
                layer = CombatCopies.equalize(world, actor, equalized, window + 40, powertrickContribution, MobEffects.anchor(hold));
            }
            if (!(layer > 0)) {
                // 数值层没建起来：撤掉保持窗口，不留下假姿态，也不把旧值写回原生属性。
                powertrickDropCarrier(world, actor, hold);
                done(action);
                return;
            }
            world.effect(powertrickMark, actor,
                JSON.stringify({ layer: layer, atk: values.attack, def: values.defence, spin: spin, max: window }), window + 60);
            // 生效回执再读实际值：宝可梦读交换后的培养攻防，普通生物读交换后的攻击 HP / 护甲点。
            const actual = powertrickValues(world, actor) || targets;
            const shownAttack = Math.round(actual.attack * 10) / 10;
            const shownDefence = Math.round(actual.defence * 10) / 10;
            const gap = Math.abs(values.attack - values.defence);
            WorldFeedback.emit(world, powertrickCardsScene, 1, position,
                { moment: "trick", actor: String(actor.ref()), start: world.tick(), duration: 24, swapped: 1, spin: spin,
                    scale: Math.max(0.6, Math.min(1.6, gap / 90 + 0.6)) }, 34);
            WorldFeedback.emit(world, powertrickScene, 1, position,
                { moment: "trick", actor: String(actor.ref()), spin: spin,
                    scale: Math.max(0.6, Math.min(1.6, gap / 90 + 0.6)), intensity: Math.max(0.7, Math.min(2, gap / 60)) }, 32);
            WorldFeedback.text(world, position.plus(WorldCombat.point(0, 1.3, 0)), powertrickTrickText,
                [shownAttack, shownDefence], 30);
            // 保持期间的翻面姿态绑在真正的数值层上：窗口关闭、翻回或清除时一起收。
            WorldFeedback.onEffect(world, layer, "world_combat:move_powertrick/hold", powertrickCardsScene, 1, position,
                { moment: "hold", actor: String(actor.ref()), swapped: 1, spin: spin });
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound("minecraft:block.amethyst_block.resonate", position, 14, "{}");
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
        const restored = powertrickValues(world, actor) || { attack: mark.atk, defence: mark.def };
        WorldFeedback.emit(world, powertrickCardsScene, 1, body.position(),
            { moment: expired ? "lapse" : "flipback", actor: String(actor.ref()), start: world.tick(), duration: 26, spin: Math.max(4, Math.round(mark.spin)) }, 30);
        WorldFeedback.emit(world, powertrickScene, 1, body.position(),
            { moment: expired ? "lapse" : "flipback", actor: String(actor.ref()), expired: expired ? 1 : 0 }, 28);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), powertrickRevertText,
            [Math.round(restored.attack), Math.round(restored.defence)], 26);
        world.sound(expired ? "minecraft:block.beacon.deactivate" : "minecraft:block.amethyst_block.break", body.position(), 12, "{}");
    });
}
