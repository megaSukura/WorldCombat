/**
 * 地球上投 / seismictoss — 参数、数值来源与直接结算。
 *
 * 原生事实：Fighting、物理、威力 0、命中 100、PP 20、接触；伤害恒等于使用者等级（Cobblemon 1.8，148 位学习者）。
 *
 * 翻译：一记抓取投掷。抓住对手、用地（重力）把它甩出去；伤害只认使用者自己的等级（体重给出一点加成），
 * 而飞多远认双方的重量与使用者的物攻。等级伤害不来自攻防比拼，因此本招的 `damage` 由行动直接结算，
 * 不走共享攻防公式；格斗系打不到幽灵由属性表拦住。配置 slam（砸地式）把投掷变短、陡，落地把目标钉住。
 *
 * 数据分散：damage 读等级与体重；seize 读速度；hurlXZ 读物攻、自己体重与目标体重；hurlUp 读体高；
 * collisionRadius 读体高；shockwave 读体重；slamDelay 读速度；pinTicks 读等级。
 */
namespace PokemonSkills {
    /** 与蛮干相同的直接结算入口，专属本招命名；见 endeavor/parameters.ts 的说明。 */
    export function seismictossRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        return PokemonDamage.fixed(world, target, CobblemonCombat.moveTemplate("seismictoss"), amount,
            { contact: contact, knockback: false, bypassCooldown: true, ignoreArmor: true }, "immunity", action);
    }

    actionParameters.define("seismictoss", {
        /** 等级伤害：等级 ×（1 + 体重项，夹 −0.15..+0.4）；体重 60 时正好等于等级，重者略高。 */
        damage: formula(
            F.level().times(F.const(1).plus(F.body("weight").minus(60).times(0.0015).clamp(-0.15, 0.4))).round(1)
                .as(text("worldcombat.skill.seismictoss.value.levelDamage")),
            "等级伤害", {
                unit: "点",
                description: "这一摔打出的固定伤害，等于使用者等级再乘一个体重系数（体重 60 时为等级本身）。对手防御与相性不参与，只有属性免疫会挡住它。"
            }),
        /** 抓取起手：基础 10 刻，速度每比 55 快 1 少 0.04 刻，体重每比 60 重 1 加 0.01 刻；夹在 7..15。 */
        seize: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 4))
                .plus(F.body("weight").minus(60).times(0.01).clamp(-1, 3)).clamp(7, 15).round(0),
            "抓取起手", "抓稳对手之前要站定多久；快的个体更利落地贴身，身重者略慢。"),
        /** 抓握时长：基础 6 刻，速度每比 55 快 1 少 0.05 刻；夹在 2..8。 */
        holdTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.05).clamp(-1, 2.5)).clamp(2, 8).round(0),
            "抓握时长", "抓住对手到把它甩出去之间的停顿；越利落，对手越难在这一瞬挣脱。"),
        /** 水平投速：基础 0.42 格/刻 + 物攻项（夹 −0.08..0.25）+ 自己体重项（夹 −0.05..0.14），再除以目标重量系数（体重/400，夹 0.4..2.5）；砸地 ×0.72；夹在 0.16..0.7。 */
        hurlXZ: formula(
            F.base(0.42).plus(F.stat("attack").minus(60).times(0.0025).clamp(-0.08, 0.25))
                .plus(F.body("weight").minus(60).times(0.001).clamp(-0.05, 0.14))
                .div(F.target("body.weight", text("worldcombat.skill.seismictoss.value.targetWeight")).div(400).clamp(0.4, 2.5))
                .times(F.when(F.pref("slam", text("worldcombat.skill.seismictoss.preference.slam")), F.const(0.72), F.const(1)))
                .clamp(0.16, 0.7).round(3),
            "水平投速", {
                unit: "格/刻",
                description: "把对手甩出去的水平初速；物攻越高、自己越重、对手越轻，飞得越远。砸地式把这一下压短。"
            }),
        /** 垂直投速：基础 0.44 格/刻，碰撞箱每比 1.4 高 1 格加 0.05；砸地 ×0.85；夹在 0.28..0.62。 */
        hurlUp: formula(
            F.base(0.44).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.1, 0.16))
                .times(F.when(F.pref("slam", text("worldcombat.skill.seismictoss.preference.slam")), F.const(0.85), F.const(1)))
                .clamp(0.28, 0.62).round(3),
            "垂直投速", {
                unit: "格/刻",
                description: "把对手抛起来的垂直初速；高个子抛得更高，砸地式角度更陡。"
            }),
        /** 抓取半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.14；夹在 0.36..0.9。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.36, 0.9).round(2),
            "抓取半径", {
                unit: "格",
                description: "抓取判定的横向半径；身板越大抓得越宽。"
            }),
        /** 落地冲击半径：基础 0.9 格，体重每比 60 重 1 加 0.004；夹在 0.7..1.8。 */
        shockwave: formula(
            F.base(0.9).plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.9)).clamp(0.7, 1.8).round(2),
            "落地冲击半径", {
                unit: "格",
                description: "对手落地那一下扬起的冲击范围；自己越重摔得越响。"
            }),
        /** 落地延迟：基础 12 刻，速度每比 55 快 1 少 0.05 刻；夹在 8..18。 */
        slamDelay: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4)).clamp(8, 18).round(0),
            "落地延迟", "从甩手到对手砸地之间的飞行时间；这一段里对手在空中，无法反击。"),
        /** 钉地时长：基础 28 刻，等级每比 30 高 1 加 0.4 刻；夹在 20..60。仅砸地式生效。 */
        pinTicks: seconds(
            F.base(28).plus(F.level().minus(30).times(0.4).clamp(-6, 24)).clamp(20, 60).round(0),
            "钉地时长", "砸地式落地后把对手钉在原地的时长；等级越高摔得越狠、钉得越久。"),
        maximumStride: hidden(0.05),
        traceAhead: hidden(0.7)
    });

    stages("seismictoss", [
        { level: 30, values: { shockwave: 1.0 } },
        { level: 50, values: { shockwave: 1.15, pinTicks: 40 } }
    ]);

    describe("seismictoss", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["seize", "holdTicks", "collisionRadius"] },
        { key: "description.2", values: ["hurlXZ", "hurlUp", "slamDelay"] },
        { key: "slam.on", values: ["pinTicks"], when: function (context) { return read(context.detail.values, ["slam"]) === true; } },
        { key: "slam.off", values: [], when: function (context) { return read(context.detail.values, ["slam"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pinTicks"] }
    ]);
}
