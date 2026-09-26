/**
 * 蛮干 / endeavor — 参数、数值来源与直接结算。
 *
 * 原生事实：Normal、物理、威力 0、命中 100、PP 5、接触；伤害回调为 target.getHP() − pokemon.hp，
 * 自身满血时不生效（Cobblemon 1.8，313 位学习者）。
 *
 * 翻译：一记扑身近战「拉平」。伤害不来自攻防比拼，而来自双方当前生命的差：你越接近倒下、对手越健康，
 * 这一下越狠；你自己健康时它一分伤害也没有。因此本招的 `damage` 由行动直接读出并交给原生受伤入口结算，
 * 不走共享的攻防伤害公式；属性免疫（一般系打不到幽灵）由本函数按属性表判定，其余原生反应
 * （特性、携带物、接触效果、浮动伤害）沿同一条原生受伤路径照常发生。
 *
 * 数据分散：damage 读双方当前生命；brace 读速度与体重；lunge/lungeSpeed 读速度；shove 读体重与自身生命比例；
 * collisionRadius 读体高；carry 读速度。配置 vault（越身）把扑身变长、撞后穿过对手换位，代价是几乎不顶开。
 */
namespace PokemonSkills {
    /**
     * 把一笔算好的固定伤害交给原生受伤入口，并返回目标实际失去的生命（世界单位）。
     * 类型免疫按属性表拦住，护甲在本函数里排除（固定伤害不参与防御比拼），其余原生结算（护盾、
     * 减伤、伤害上限）照常生效。返回 0 表示被免疫或原生裁定完全挡下，调用方据此显示「被挡」而不是成功伤害。
     */
    export function endeavorRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): number {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return 0;
        const before = world.observe(target);
        if (before === null) return 0;
        const start = before.health();
        const landed = PokemonDamage.fixed(world, target, CobblemonCombat.moveTemplate("endeavor"), amount,
            { contact: contact, knockback: false, bypassCooldown: true, ignoreArmor: true }, "immunity", action);
        const after = world.observe(target);
        if (after !== null) return Math.max(0, start - after.health());
        return landed ? start : 0;
    }

    actionParameters.define("endeavor", {
        /** 拉平伤害：目标当前生命 − 自身当前生命，下限 0。双方生命的差就是这一下打出的全部。 */
        damage: formula(
            F.target("actor.health", text("worldcombat.skill.endeavor.value.targetHp"))
                .minus(F.actor("health", text("worldcombat.skill.endeavor.value.selfHp"))).max(0).round(1)
                .as(text("worldcombat.skill.endeavor.value.gap")),
            "拉平伤害", {
                unit: "点",
                description: "对手当前生命减去自己当前生命（不小于 0）。自己越接近倒下、对手越健康，这一下越重；自己更健康时为零。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 少 0.035 刻，体重每比 50 重 1 加 0.008 刻；夹在 5..14。 */
        brace: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.035).clamp(-1.5, 3))
                .plus(F.body("weight").minus(50).times(0.008).clamp(-0.8, 2)).clamp(5, 14).round(0),
            "起手时长", "压低身子扑出去之前要站定多久；天生快的个体更快，身重者略慢。"),
        /** 扑身距离：基础 2.4 格，速度每比 55 多 1 加 0.02；越身 ×1.25；夹在 1.8..4.2。它同时是实际射程来源。 */
        lunge: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.3, 1.2))
                .times(F.when(F.pref("vault", text("worldcombat.skill.endeavor.preference.vault")), F.const(1.25), F.const(1)))
                .clamp(1.8, 4.2).round(2),
            "扑身距离", {
                unit: "格",
                description: "从起步到撞上的总位移；腿快的个体扑得更远，越身式把这一段拉长。"
            }),
        /** 扑身速度：基础 0.6 格/刻，速度每比 55 多 1 加 0.004；越身 ×1.05；夹在 0.4..1.05。 */
        lungeSpeed: formula(
            F.base(0.6).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.12, 0.32))
                .times(F.when(F.pref("vault", text("worldcombat.skill.endeavor.preference.vault")), F.const(1.05), F.const(1)))
                .clamp(0.4, 1.05).round(2),
            "扑身速度", {
                unit: "格/刻",
                description: "扑出去时每刻前进的距离；贴身的对手更难在这段里走开。"
            }),
        /** 顶开距离：基础 0.25 格 + 体重项（夹 −0.06..0.4）+ 已损失生命比例 ×0.45；越身 ×0.25；夹在 0.05..0.95。 */
        shove: formula(
            F.base(0.25).plus(F.body("weight").minus(50).times(0.002).clamp(-0.06, 0.4))
                .plus(F.const(1).minus(F.actor("healthRatio", text("worldcombat.skill.endeavor.value.hpRatio"))).times(0.45))
                .times(F.when(F.pref("vault", text("worldcombat.skill.endeavor.preference.vault")), F.const(0.25), F.const(1)))
                .clamp(0.05, 0.95).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把对手沿扑身方向顶开多远；身重、残血时顶得更开，越身式几乎不顶、改为从对手身侧穿过去。"
            }),
        /** 判定半径：基础 0.45 格，碰撞箱每比 1.4 高 1 格加 0.12；夹在 0.32..0.85。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.32, 0.85).round(2),
            "判定半径", {
                unit: "格",
                description: "扑上去时判定能不能拉平的横向半径；身板越大判定越宽。"
            }),
        minimumMove: hidden(0.03)
    });

    stages("endeavor", [
        { level: 24, values: { shove: 0.72 } },
        { level: 44, values: { shove: 0.8 } }
    ]);

    describe("endeavor", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["brace","lunge","lungeSpeed","collisionRadius"] },
        { key: "description.2", values: ["shove"] },
        { key: "vault.on", values: [], when: function (context) { return read(context.detail.values, ["vault"]) === true; } },
        { key: "vault.off", values: [], when: function (context) { return read(context.detail.values, ["vault"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shove"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shove"] }
    ]);
}
