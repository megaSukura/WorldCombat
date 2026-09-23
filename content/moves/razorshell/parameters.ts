/**
 * 贝壳刃 / razorshell —— 参数与伤害段。
 *
 * 原生事实：Water／物理／威力 75／命中 95／PP 10／接触、切斩（slicing）／50% 让目标防御下降 1 级
 * （Cobblemon 1.8，22 位学习者）。
 *
 * 翻译：把「用锋利贝壳切斩对手」落成一记**在身前划开一道宽弧的横扫**——壳缘亮起一道水光，朝身前
 * `arc` 度的扇面切过去，扇面里每个对手都挨一记切斩，各自按几率被削掉一级防御。壳缘带水：被切开的
 * 目标会被溅湿（共享身份 `world_combat:status/soaked`，与水流尾、波动冲、水流裂破的湿身是同一件事），
 * 为别的招（水流炮、冰冻干燥等）留一段水湿窗口。
 *
 * 与同族分开：咬碎是单点研磨压塌护甲、撕裂爪是一道窄走廊的交叉撕抓、劈开是竖直重劈；
 * 只有贝壳刃扫出一个**宽扇面**，同时削多个目标的护甲并把它们溅湿。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   carve       切斩威力 75 + 物攻偏移；揽月式 ×0.88 / 凿刃式 ×1.15。
 *   reach       横扫距离 2.3 + 速度偏移；也是实际射程来源。
 *   arc         扇面张角 110 度 + 碰撞箱宽度偏移；揽月式 ×1.45 / 凿刃式 ×0.7。
 *   shaveChance 削甲几率 0.50 + 等级偏移；揽月式 +0.1 / 凿刃式 −0.1。
 *   shaveStages 削甲级数：物攻超过 100 才可能一次削两级。
 *   soakTicks   湿身时长 60 刻 + 等级偏移；揽月式 +20。
 *   push        顶开距离 0.15 + 体重偏移；揽月式 +0.12。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，揽月式更慢更久。
 *
 * 配置 `wide`（揽月式）双向取舍：开启＝扇面更宽、削甲几率更高、湿身更久、顶得更开，代价是单下威力 ×0.88、冷却 +6；
 * 关闭＝凿刃式，扇面收窄但单下威力 ×1.15、冷却更短、削甲几率略低——对单点更狠，对人群更弱。
 *
 * 伤害段 `carve`：壳缘切中的那一下，接触与切斩由共享结算按 contact／slice 处理。
 */
namespace PokemonSkills {
    actionParameters.define("razorshell", {
        /** 切斩威力：基础 75，物攻每比 60 多 1 加 0.28（夹 −13..30）；揽月 ×0.88 / 凿刃 ×1.15；夹在 48..124。 */
        carve: formula(
            F.base(75).plus(F.stat("attack").minus(60).times(0.28).clamp(-13, 30))
                .times(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(0.88), F.const(1.15)))
                .clamp(48, 124).round(1),
            "切斩威力", {
                unit: "威力",
                description: "壳缘切中那一下的基础威力；物攻越高切得越深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 横扫距离：基础 2.3 格，速度每比 55 快 1 加 0.01（夹 −0.3..0.8）；夹 1.9..3.2。 */
        reach: formula(
            F.base(2.3).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.8)).clamp(1.9, 3.2).round(2),
            "横扫距离", {
                unit: "格",
                description: "壳缘扫出的半径，也是本招的实际射程来源；腿快的个体踏得更前。"
            }),
        /** 扇面张角：基础 110 度，碰撞箱每比 0.9 宽 1 格加 60 度（夹 −20..50）；揽月 ×1.45 / 凿刃 ×0.7；夹 55..220。 */
        arc: formula(
            F.base(110).plus(F.body("width").minus(0.9).times(60).clamp(-20, 50))
                .times(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(1.45), F.const(0.7)))
                .clamp(55, 220).round(0),
            "扇面张角", {
                unit: "度",
                description: "身前被扫到的扇形张开多少度；身体越宽的个体扫得越开，揽月式张得更开、凿刃式收成一条窄刃。"
            }),
        /** 削甲几率：基础 0.50，等级 30 起每级 +0.002（夹 −0.05..0.12）；揽月 +0.1 / 凿刃 −0.1；夹 0.32..0.7。 */
        shaveChance: percent(
            F.base(0.50).plus(F.level().minus(30).times(0.002).clamp(-0.05, 0.12))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(0.1), F.const(-0.1)))
                .clamp(0.32, 0.7),
            "削甲几率", "切中时把目标防御削下一级的几率（原生 50%）；等级越高越稳，揽月式略高、凿刃式略低。"),
        /** 削甲级数：基础 1 级，物攻超过 100 才可能一次削两级；夹 1..2。 */
        shaveStages: formula(
            F.base(1).plus(F.stat("attack").minus(100).times(0.006).clamp(0, 1)).floor().clamp(1, 2),
            "削甲级数", {
                unit: "级",
                description: "一次削甲让目标防御下降的能力等级；物攻 100 以上的一刀能一次削两级。"
            }),
        /** 湿身时长：基础 60 刻，等级 30 起每级 +1.5（夹 −12..60）；揽月 +20；夹 40..200。 */
        soakTicks: seconds(
            F.base(60).plus(F.level().minus(30).times(1.5).clamp(-12, 60))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(20), F.const(0)))
                .clamp(40, 200).round(0),
            "湿身时长", "壳缘带水，被切中的目标湿身多久；湿身是共享身份 world_combat:status/soaked，别的单元（水流炮、冰冻干燥等）可以读它。等级越高溅得越久。"),
        /** 顶开距离：基础 0.15 格，体重每比 60 重 1 加 0.0012（夹 −0.05..0.3）；揽月 +0.12；夹 0.06..0.6。 */
        push: formula(
            F.base(0.15).plus(F.body("weight").minus(60).times(0.0012).clamp(-0.05, 0.3))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(0.12), F.const(0)))
                .clamp(0.06, 0.6).round(2),
            "顶开距离", {
                unit: "格",
                description: "壳缘扫过时把每个被切中的目标沿弧向外顶开多远；身重者顶得更开，揽月式再多推一点。"
            }),
        /** 起手：基础 6 刻，速度每比 55 快 1 少 0.02（夹 −2..1.5）；揽月 +2；夹 3..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1.5))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "亮出壳缘、把身体转进弧线的时间；速度越快越短，揽月式先摆开。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 少 0.015（夹 −2..1.5）；夹 3..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5)).clamp(3, 12).round(0),
            "收招", "扫完收住身形的收势；快的个体收得干脆。"),
        /** 冷却：基础 22 刻，速度每比 55 快 1 少 0.06（夹 −4..3）；揽月 +6；夹 14..38。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.06).clamp(-4, 3))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.razorshell.preference.wide")), F.const(6), F.const(0)))
                .clamp(14, 38).round(0),
            "冷却", "两次横扫之间的等待；揽月式更久，凿刃式回得更快。"),
        maxTargets: hidden(5)
    });

    defineDamage("razorshell", "carve", {}, { contact: true, slice: true });

    stages("razorshell", [
        { level: 28, values: { carve: 84 } },
        { level: 46, values: { carve: 92, shaveChance: 0.56 } }
    ]);

    describe("razorshell", [
        { key: "description.0", values: ["carve","maxTargets"] },
        { key: "description.1", values: ["reach", "arc"] },
        { key: "description.2", values: ["shaveChance","shaveStages","soakTicks","push"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.carve"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.carve", "tier.1.shaveChance"] }
    ]);
}
