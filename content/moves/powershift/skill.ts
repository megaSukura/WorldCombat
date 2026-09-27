/**
 * 力量转换 / powershift 的出手方式。
 *
 * 核心念头：把身上的力道在两处之间倒过来——攻势与守势交换位置：攻高防低的人换完能扛，防高攻低的人换完能打。
 *   它是本组里唯一交换**数值本身**的一招，也是唯一完全可逆的一招：交换只在一段窗口内维持，窗口走完自己换回来。
 *
 * 三幕：
 *   起势（windup，提交前）：两股力道在身侧分开成形，一股偏暖（攻势）、一股偏冷（守势）；可被打断，不消耗任何东西。
 *   倒转（提交后）：读取此刻真正的基础攻防——宝可梦走共享 NativeModifiers stats 层并把这层挂在交换窗口上；
 *     其他战斗者要求原版攻击与护甲都真实存在，按公开单位 **2 护甲点 = 1 攻击 HP**（A'=Armor/2、Armor'=2*A）
 *     用 CombatCopies.equalize 建一个自有加性层，原生乘数与零起点都由 shared 层补偿；缺项明确无效、不会拿 0 伪造，
 *     原生范围/零乘数不允许达成时整层回滚并清掉本次承载。挂上共享身份 world_combat:status/powershift 的交换窗口，
 *     并记下本次拥有的机制 id。
 *   锁定（收势）：两股力道穿过后锁住，浮出结果；窗口走完或被清除时，只结束本次交换，数值自动回到原样。
 *
 * 与力量戏法（powertrick）的互斥：两招共用原生 MobEffect 标签 world_combat:status/attack_defence_inversion 作为
 *   「攻防倒转」身份。本窗内重施、以及任何另一倒转姿态仍在时，ready 与真正 execute 都拒绝——**既不刷新也不翻
 *   第二遍**；这是短窗与长姿态（可主动撤）的核心分工。身份由标签开放扩展，不维护普通模组倒转名单。
 *
 * 与同族分开：磨爪、盘蜷改的是能力等级（-6..+6 的阶梯）；力量转换不动等级，只把两个现成数值对调，
 *   换来的是另一种形态而不是更高的强度，并且可以精确地换回去。
 */
namespace PokemonSkills {
    const powershiftScene = "world_combat:move_powershift";
    const powershiftScaleScene = "world_combat:move_powershift_scale";
    const powershiftStance = "world_combat:powershift_stance";
    const powershiftMark = "world_combat:powershift_mark";
    const powershiftContribution = "world_combat:move/powershift";
    const powershiftAttack = "minecraft:generic.attack_damage";
    const powershiftArmour = "minecraft:generic.armor";
    const powershiftInversion = "world_combat:status/attack_defence_inversion";
    const powershiftText = "world_combat.move.powershift.text.shifted";
    const powershiftInvalidText = "world_combat.move.powershift.text.invalid";
    const powershiftFadeText = "world_combat.move.powershift.text.reverted";

    // 记号：记录这次交换由哪个机制承载；窗口提前结束时照它精确结束，且从不用旧快照覆写原生属性。
    WorldCombat.effect(powershiftMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.swap !== "number") throw new Error("Invalid power shift mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powershiftMark, "start", function () { });
    WorldCombat.effectHandler(powershiftMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 交换前两样本钱的实际值：宝可梦读原生攻防，其他战斗者读原版攻击 HP 与护甲点；缺项返回 null。 */
    function powershiftValues(world: CombatWorld, actor: CombatActor): { attack: number; defence: number } | null {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor), pokemon = CobblemonCombat.pokemon(actor);
            return { attack: NativeEffects.stat(pokemon, state, "atk"), defence: NativeEffects.stat(pokemon, state, "def") };
        }
        const attack = world.attributeValue(actor, powershiftAttack);
        const armour = world.attributeValue(actor, powershiftArmour);
        if (attack === null || armour === null) return null;
        return { attack: attack.value(), defence: armour.value() };
    }

    /** 交换后的目标值：宝可梦培养攻防 1:1 互换；普通战斗者 2 护甲点 = 1 攻击 HP。 */
    function powershiftTargets(domain: string, values: { attack: number; defence: number }): { attack: number; defence: number } {
        if (domain === "cobblemon") return { attack: values.defence, defence: values.attack };
        return { attack: values.defence / 2, defence: values.attack * 2 };
    }

    /** 撤掉本招拥有的承载；只有当前承载仍是这一次观察到的 revision 时才移除。 */
    function powershiftDropCarrier(world: CombatWorld, actor: CombatActor, observed: CombatMobEffect): void {
        const current = MobEffects.read(world, actor, powershiftStance);
        if (current !== null && String(current.key()) === String(observed.key())) world.removeMobEffect(actor, powershiftStance, String(observed.key()));
    }

    define({
        id: "powershift",
        cooldownParameter: "wait",
        name: "力量转换",
        description: "把自己的攻击与防御数值对调，并维持一段可见的窗口；窗口走完自动换回。攻高防低时换过来能扛，防高攻低时换过去能打。它不改能力等级，只把你现成的两样本钱对调；普通生物按 2 护甲点 = 1 攻击 HP 的公开单位互换。窗口内不能刷新或再翻一次。",
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
        // 起手与提交前都用只读作用域核验互斥：本窗内重施或任何另一倒转身份仍在时一律拒绝，不刷新。
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor();
            if (MobEffects.hasTag(world, actor, powershiftInversion)) return "inversion-active";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_powershift:gather", powershiftScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", hold: config && config.hold === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const position = body.position();
            function reject(): void {
                WorldFeedback.emit(world, powershiftScene, 1, position, { moment: "reject", actor: String(actor.ref()), scale: 1 }, 20);
                WorldFeedback.text(world, position.plus(WorldCombat.point(0, 1.3, 0)), powershiftInvalidText, [], 24);
            }
            if (MobEffects.hasTag(world, actor, powershiftInversion)) { reject(); done(action); return; }
            const values = powershiftValues(world, actor);
            if (values === null) { reject(); done(action); return; }
            const window = Math.max(80, Math.round(p("powershift", "window", action)));
            const bands = Math.max(10, Math.round(p("powershift", "bands", action)));
            const gap = Math.abs(values.attack - values.defence);
            const reach = Math.max(0.4, Math.min(1.6, gap / 60));
            const duration = window + 2;
            const stance = MobEffects.apply(world, actor, powershiftStance, window, 0);
            if (stance === null) { done(action); return; }
            const domain = String(actor.domain()), targets = powershiftTargets(domain, values);
            let mechanism = -1;
            if (domain === "cobblemon") {
                mechanism = NativeModifiers.apply(world, actor,
                    { stats: { atk: Math.max(1, Math.round(targets.attack)), def: Math.max(1, Math.round(targets.defence)) },
                        carrier: MobEffects.anchor(stance), source: powershiftContribution }, duration);
            } else {
                const equalized: CombatCopies.Values = {};
                equalized[powershiftAttack] = targets.attack;
                equalized[powershiftArmour] = targets.defence;
                mechanism = CombatCopies.equalize(world, actor, equalized, duration, powershiftContribution, MobEffects.anchor(stance));
            }
            if (!(mechanism > 0)) {
                // 交换层没建起来：撤掉交换窗口，不留下假姿态，也不把旧值写回原生属性。
                powershiftDropCarrier(world, actor, stance);
                done(action);
                return;
            }
            world.effect(powershiftMark, actor, JSON.stringify({ swap: mechanism }), duration);
            // 生效回执再读实际值：宝可梦读交换后的培养攻防，普通生物读交换后的攻击 HP / 护甲点。
            const actual = powershiftValues(world, actor) || targets;
            WorldFeedback.emit(world, powershiftScaleScene, 1, position,
                { moment: "cross", actor: String(actor.ref()), start: world.tick(), duration: 24, swapped: 1, bands: bands }, 32);
            WorldFeedback.emit(world, powershiftScene, 1, position,
                { moment: "cross", actor: String(actor.ref()), bands: bands, scale: 1, reach: reach, gap: Math.round(gap * 10) / 10,
                    intensity: Math.max(0.8, Math.min(2, gap / 60 + bands / 40)) }, 32);
            WorldFeedback.text(world, position.plus(WorldCombat.point(0, 1.3, 0)), powershiftText,
                [Math.round(actual.attack * 10) / 10, Math.round(actual.defence * 10) / 10], 30);
            // 持续期的收拢扣环绑在真正的交换机制上：窗口真实剩余时间由服务端起点与窗长决定，结束或清除一起收。
            WorldFeedback.onEffect(world, mechanism, "world_combat:move_powershift/hold", powershiftScaleScene, 1, position,
                { moment: "hum", actor: String(actor.ref()), start: world.tick(), window: window, bands: Math.max(6, Math.round(bands / 3)), reach: reach });
            world.sound("cobblemon:move.doubleteam.actor", position, 16, "{}");
            done(action);
        }
    });

    // 交换窗口走完或被清除：按记号结束本次交换（交换层随窗口自行结束，这里是精确收尾），数值自动回到原样。
    WorldCombat.on("world_combat:move_powershift/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powershiftStance) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧窗口被移除而新窗口仍在：不是真的结束。本招不做刷新，此处仅作保护。
        if (MobEffects.read(world, actor, powershiftStance)) return;
        const marks = world.effects(actor, powershiftMark);
        for (let index = 0; index < marks.length; index++) {
            const mark = JSON.parse(String(marks[index].data()));
            if (typeof mark.swap === "number" && mark.swap > 0) world.operation(mark.swap, "world_combat:dispel", "{}");
            world.operation(marks[index].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, powershiftScaleScene, 1, body.position(),
            { moment: "fade", actor: String(actor.ref()), start: world.tick(), duration: 24 }, 30);
        WorldFeedback.emit(world, powershiftScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), powershiftFadeText, [], 24);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 14, "{}");
    });
}
