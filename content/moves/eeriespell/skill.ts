/**
 * 诡异咒语 / eeriespell —— 行为、参数与目标条件以本单元实现为准。
 *
 * 一幕起手（身前聚起翻卷的紫色咒念），一幕飞行（咒念沿 projectile 直飞），一幕命中（结算伤害、
 * 给目标挂上共享身份「诡异」，并对宝可梦抽走其上一招的 3 点 PP；撞墙/空放则只留一点紫烟）。
 * 「诡异」期间目标每次尝试出手都会按效果等级掷一次失手，普通攻击同样会因记忆混乱而落空；
 * 真正因它失手时，在目标身上显示一次短缺口般的「中断」符号（只在失败回执上触发，状态本身不逐刻爆亮）。
 *
 * kind 为 aim：可瞄目标，也可只朝一个方向空放；首实体/方块收束。扣 PP 只走原有宝可梦接口。
 */
namespace PokemonSkills {
    const EERIESPELL_SCENE = "world_combat:move_eeriespell";
    const EERIESPELL_EFFECT = "world_combat:eerie";

    // 「诡异」的行为：提交前按效果等级掷一次失手。等级即施法者特攻算出的失手概率 ×100。
    CombatStatus.actions.define({ id: "world_combat:move/eeriespell", apply: function (context: CombatStatus.ActionPolicy) {
        if (context.phase !== "commit" && !(context.phase === "damage" && DamageSemantics.read(context.metadata).attack))
            return;
        var effect = CombatStatus.representative(context.world, context.actor, "eerie", false);
        if (effect) {
            context.failures.eerie = Math.max(0.05, Math.min(1, effect.amplifier() / 100));
            context.detail.eerie = { status: "eerie" };
        }
    } });

    // 失败回执：只有真正因「诡异」失手时才在目标身上显示一次中断符号。
    WorldCombat.on("world_combat:move_eeriespell/interrupt", "world_combat:action_rejected", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.reason) !== "eerie" && String(data.details && data.details.status) !== "eerie")
            return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor))
            return;
        var body = world.observe(actor);
        if (body === null)
            return;
        WorldFeedback.emit(world, EERIESPELL_SCENE, 1, body.position(), { moment: "interrupt", target: String(actor.ref()), intensity: 1, scale: 1 }, 24);
    });

    /** 从目标最后使用的招式抽走 3 点 PP；非宝可梦、没有最后招式或已空返回 ""。 */
    function eeriespellDrain(world: CombatWorld, target: CombatActor): string {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target))
            return "";
        var last = NativeEffects.lastMove(world, target);
        if (!last || last.slot < 0)
            return "";
        var move = CobblemonCombat.pokemon(target).move(last.slot);
        if (!move || String(move.key()) !== last.key)
            return "";
        var value = Math.max(0, move.pp() - Math.round(p("eeriespell", "drain", world)));
        return CobblemonCombat.pp(world, target, last.slot, String(move.key()), move.pp(), value) ? String(move.id()) : "";
    }

    function eeriespellImpact(current: CombatAction, hit: CombatImpact): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        if (target === null) {
            WorldFeedback.emit(world, EERIESPELL_SCENE, 1, point, { moment: "fizzle", intensity: 1, scale: 1 }, 24);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "eeriespell", p("eeriespell", "power", current), {});
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        var drained = landed ? eeriespellDrain(world, target) : "";
        if (landed) {
            var ticks = Math.round(p("eeriespell", "fuzzyTicks", current));
            var chance = Math.max(0, Math.min(100, Math.round(p("eeriespell", "failChance", current) * 100)));
            CombatStatus.apply(world, target, "eerie", EERIESPELL_EFFECT, ticks, chance, { unique: true });
        }
        world.sound("cobblemon:move.psychic.actor", point, 16, "{}");
        WorldFeedback.emit(world, EERIESPELL_SCENE, 1, point,
            { moment: landed ? "impact" : "fizzle", target: String(target.ref()), intensity: intensity, bursts: Math.round(6 + intensity * 6) }, 34);
        if (drained)
            WorldFeedback.emit(world, EERIESPELL_SCENE, 1, point, { moment: "drain", target: String(target.ref()), intensity: intensity, scale: 1 }, 40);
        WorldFeedback.text(world, point, drained ? "world_combat.move.eeriespell.text.drain" : "world_combat.move.eeriespell.text.none", drained ? [3] : [], 40);
    }

    function eeriespellStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var flight = LivingActions.projectile(action, {
            speed: p("eeriespell", "boltSpeed", action), range: action.range(), radius: p("eeriespell", "collisionRadius", action), direction: aim(action),
            appearance: { sprite: "cobblemon:generic/orb/accentorb", tint: 0x9A7BFF, glow: true, scale: 1.2 },
            impact: function (current: CombatAction, hit: CombatImpact) { eeriespellImpact(current, hit); }
        }, done);
        WorldFeedback.emit(action.world(), EERIESPELL_SCENE, 1, action.origin(), { moment: "travel", projectile: flight, intensity: 1, scale: 1 }, 80);
    }

    define({ id: "eeriespell", name: "诡异咒语",
        description: "发射咒念伤害目标并扰乱出手。命中宝可梦还会扣除其上一招的PP；普通攻击同样会因记忆混乱而失手。可瞄准目标，也可只朝一个方向空放。",
        uses: ["远程压制", "拆招"], kind: "aim", range: 14, prepare: 10, active: 0, recover: 8, cooldown: 40, style: "eerie",
        defaults: {}, fields: [],
        indicator: function () { return { radius: 14, geometry: "line", style: "eerie", label: "诡异咒语" }; },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            action.present("world_combat:eeriespell:" + action.id(), EERIESPELL_SCENE, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: 1 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            eeriespellStrike(action, done);
        }
    });
}
