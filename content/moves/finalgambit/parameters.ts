/**
 * 搏命 / finalgambit — 参数、数值来源与直接结算。
 *
 * 原生事实：Fighting、特殊、威力 0、命中 100、PP 5、不接触；伤害回调为使用者当前 HP，命中后使用者陷入濒死
 * （selfdestruct: "ifHit"，只有打中才自我牺牲）（Cobblemon 1.8，32 位学习者）。
 *
 * 翻译：把此刻剩下的全部生命一次性砸出去，然后自己倒下——伤害就是你此刻的血量。这是本组唯一会自我牺牲的招，
 * 也是唯一按「自己当前生命」取值的招：满血时最重、残血时最轻，所以它不是逃生牌，而是一换一的拼命牌。
 * 伤害由行动直接结算，不看对手防御；格斗系打不到幽灵由属性表拦住。打空（免疫/落空）时使用者不倒。
 * 配置 spare（留手）只押上一半生命、打完留下一口气，代价是伤害也随之减半。
 *
 * 数据分散：damage 读自己当前生命；gamble 读速度与体重；lunge/lungeSpeed 读速度；collisionRadius 读体高；
 * blastRadius 读体高与体重；stagger 读体重。
 */
namespace PokemonSkills {
    /** 与蛮干相同的直接结算入口，专属本招命名；见 endeavor/parameters.ts 的说明。 */
    export function finalgambitRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        const move = CobblemonCombat.moveTemplate("finalgambit"), type = String(move.type());
        const facts = PokemonDamage.combatants.read(world, target);
        for (let index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: "finalgambit", type: type }));
                return false;
            }
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        const toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        const metadata: any = { kind: "move", move: "finalgambit", type: type, category: String(move.category()),
            contact: contact, knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    actionParameters.define("finalgambit", {
        /** 拼命伤害：自己当前生命 ×（留手 0.55 / 全力 1）。 */
        damage: formula(
            F.actor("health", text("worldcombat.skill.finalgambit.value.selfHp"))
                .times(F.when(F.pref("spare", text("worldcombat.skill.finalgambit.preference.spare")), F.const(0.55), F.const(1)))
                .round(1),
            "拼命伤害", {
                unit: "点",
                description: "这一记打出的全部伤害，等于出手瞬间自己的当前生命；留手式只押上一半。对手防御不参与，只有属性免疫会挡住它。"
            }),
        /** 起手：基础 14 刻，速度每比 55 快 1 少 0.06 刻，体重每比 60 重 1 加 0.015 刻；夹在 10..20。 */
        gamble: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.06).clamp(-2.5, 5))
                .plus(F.body("weight").minus(60).times(0.015).clamp(-1, 4)).clamp(10, 20).round(0),
            "起手时长", "把剩下的生命全部押上去之前要站定多久；这一段可以被对手打断，打断则什么也不发生。"),
        /** 扑身距离：基础 2.2 格，速度每比 55 多 1 加 0.018；夹在 1.6..3.8；它同时是实际射程来源。 */
        lunge: formula(
            F.base(2.2).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.3, 1.1)).clamp(1.6, 3.8).round(2),
            "扑身距离", {
                unit: "格",
                description: "从起步到自爆点的总位移；腿快的个体扑得更远。"
            }),
        /** 扑身速度：基础 0.7 格/刻，速度每比 55 多 1 加 0.005；夹在 0.5..1.2。 */
        lungeSpeed: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.15, 0.4)).clamp(0.5, 1.2).round(2),
            "扑身速度", {
                unit: "格/刻",
                description: "扑出去时每刻前进的距离；这一记要贴上去才能自爆。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.13；夹在 0.36..0.9。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.13)).clamp(0.36, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "自爆点的横向判定半径；身板越大罩得越宽。"
            }),
        /** 爆裂半径：基础 1.2 格，碰撞箱每比 1.4 高 1 格加 0.25，体重每比 60 重 1 加 0.004；夹在 1.0..2.2。 */
        blastRadius: formula(
            F.base(1.2).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.2, 0.8))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.1, 0.6)).clamp(1.0, 2.2).round(2),
            "爆裂半径", {
                unit: "格",
                description: "自爆那一刻炸开的表现范围；只画给玩家看，不额外伤害范围外的人。"
            }),
        /** 震开距离：基础 0.35 格，体重每比 60 重 1 加 0.003；夹在 0.15..1.1。 */
        stagger: formula(
            F.base(0.35).plus(F.body("weight").minus(60).times(0.003).clamp(-0.08, 0.75)).clamp(0.15, 1.1).round(2),
            "震开距离", {
                unit: "格",
                description: "自爆把对手沿扑身方向震开多远；越重推得越远。"
            }),
        maximumStride: hidden(0.05),
        traceAhead: hidden(0.8)
    });

    stages("finalgambit", [
        { level: 30, values: { stagger: 0.55 } },
        { level: 50, values: { stagger: 0.7, blastRadius: 1.5 } }
    ]);

    describe("finalgambit", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["gamble", "lunge", "lungeSpeed", "collisionRadius"] },
        { key: "description.2", values: ["blastRadius", "stagger"] },
        { key: "spare.on", values: [], when: function (context) { return read(context.detail.values, ["spare"]) === true; } },
        { key: "spare.off", values: [], when: function (context) { return read(context.detail.values, ["spare"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.stagger"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.stagger", "tier.1.blastRadius"] }
    ]);
}
