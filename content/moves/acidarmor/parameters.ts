/**
 * 溶化 / acidarmor — 参数与数值来源。
 *
 * 原生事实：Poison、变化、威力 —、命中必中、PP 20、目标 self、boosts { def: +2 }。
 *
 * 翻译：把「通过细胞的变化进行液化」翻成**身体当场化成一滩会流动的酸**——滑开来，从抓住你的东西里挣脱，
 *   再重新凝回原形；化开的地方留下一滩腐蚀的酸。取原生「防御 +2、PP 20、纯自我强化」；放弃回合制里永久保留的等级 →
 *   即时交战里防御等级立刻写入公共能力阶梯，液态是一段可见窗口，凝回时等级一起收回。
 *   它是本族里唯一**会流动、会留下东西**的一招：别招改的是硬度，溶化改的是形态。液化让身体更滑（移动更快），
 *   并当场化掉身上的束缚（rooted 与共享身份 partiallytrapped／trapped）；酸池腐蚀站进去的对手。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift       防御等级：固定 2，原生「大幅提高防御」的对位，是这招的身份常数。
 *   window     液态时长：基础 180 刻 + 等级×3 + 速度×0.8，再乘形态系数（酸池 ×0.8／流身 ×1.25）；夹 120..420。
 *   poolRadius 酸池半径：基础 1.2 格 + 体重/10×0.8 + 身高×0.3；夹 1.0..3.2。身体越沉越大，化开的滩越宽。
 *   poolTicks  酸池时长：基础 160 刻 + 等级×4；夹 120..480。等级越高，留在地上的酸越久。
 *   residue    酸滴数量：基础 24 + 体重/10×0.8；夹 20..80。身体越沉，化开时溅起的酸滴越多，粒子按它发射。
 *   tempo      起手：基础 9 刻 − 速度×0.04；夹 4..12。越快越早化开。
 *   aftercast  收招：基础 5 刻 + 身高×1.0；夹 4..9。身板越高大收得越慢。
 *   wait       冷却：基础 120 刻 − 等级×0.5；夹 80..140。PP 20 的代价。
 * 配置 slick 双向取舍：关闭＝酸池，在原地留下一滩腐蚀的酸（站进去的对手中毒），代价是自身液态窗口 ×0.8；
 *   开启＝流身，不留酸池，换成更长的液态窗口与更快的滑行——牺牲场面控制换更强的自保。
 */
namespace PokemonSkills {
    actionParameters.define("acidarmor", {
        /** 防御等级：原生 +2，本招的身份常数。 */
        gift: formula(F.const(2), "防御等级", {
            unit: " 级",
            description: "液态期间把防御抬高多少级；原生「大幅提高防御」的对位。"
        }),
        /** 液态时长：形态决定长短。 */
        window: seconds(
            F.base(180).plus(F.level().times(3)).plus(F.stat("speed").times(0.8))
                .times(F.when(F.pref("slick", text("worldcombat.skill.acidarmor.preference.slick")), F.const(1.25), F.const(0.8)))
                .clamp(120, 420).round(0),
            "液态时长", "身体化成酸能维持多久；等级与速度让它更久，流身比酸池长。凝回时这段防护抬起的等级一起收回。"),
        /** 酸池半径：身体越沉摊得越开。 */
        poolRadius: formula(
            F.base(1.2).plus(F.body("weight").div(10).times(0.8)).plus(F.body("height").times(0.3)).clamp(1.0, 3.2).round(2),
            "酸池半径", {
                unit: " 格",
                description: "化开时在脚下摊开的酸池半径；身体越沉、越高大摊得越开。表现里的酸环就是这个半径。"
            }),
        /** 酸池时长：等级决定酸能留多久。 */
        poolTicks: seconds(
            F.base(160).plus(F.level().times(4)).clamp(120, 480).round(0),
            "酸池时长", "留在原地的酸能腐蚀多久；等级越高越久。只有酸池形态会留下它。"),
        /** 酸滴数量：身体越沉溅得越多。 */
        residue: formula(
            F.base(24).plus(F.body("weight").div(10).times(0.8)).clamp(20, 80).round(0),
            "酸滴数量", {
                unit: " 滴", visible: false,
                description: "化开时溅起的酸滴数量；身体越沉越多，粒子按它发射。"
            }),
        /** 起手：速度决定化开多快。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.04)).clamp(4, 12).round(0),
            "起手", "化开成液态需要多久；速度越快越早完成。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.0)).clamp(4, 9).round(0),
            "收招", "重新凝回原形的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5)).clamp(80, 140).round(0),
            "冷却", "两次溶化之间的等待；等级越高越短。PP 20 的代价。")
    });

    stages("acidarmor", [
        { level: 30, values: { window: 220, poolTicks: 220, wait: 102 } },
        { level: 50, values: { window: 260, poolTicks: 280, wait: 90 } }
    ]);

    describe("acidarmor", [
        { key: "description.0", values: ["gift", "window"] },
        { key: "description.1", values: [] },
        { key: "acid.on", values: ["poolRadius", "poolTicks"], when: function (context) { return read(context.detail.values, ["slick"]) !== true; } },
        { key: "acid.off", values: [], when: function (context) { return read(context.detail.values, ["slick"]) === true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
