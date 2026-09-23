/**
 * 抓 / scratch 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 40／命中 100／PP 35／优先度 0／接触，无追加效果（Cobblemon 1.8，111 位学习者）。
 * 描述「用坚硬且无比锋利的爪子抓对手进行攻击」。它是全招最基础、最便宜的一记近身招。
 *
 * 翻译：把「一爪」翻成**一次掠过的爪击撕出一排平行爪痕**——每一道痕扫过身前一段短距，命中它的东西各挨一道浅割。
 * 它的身份是**便宜与排数**：抬手就挠、冷却最短、单道最低，但一道爪击会同时划出多道痕；对手体型越宽、站得越近，
 * 同时被抓中的痕越多。它也是本族唯一没有位移、没有状态、不设蓄势的一记。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   claw       每道爪痕的深浅：物攻定刃口，等级给熟练度；宽搔摊薄、直搔更重。
 *   lines      爪痕道数：速度决定这一爪划出几道。
 *   span       爪痕张角：宽搔铺得更开。
 *   reach      爪痕探出多远：身高给前肢舒展的长度，也是实际射程。
 *   line       单道爪痕半宽：体宽定爪面多厚，决定多宽的对手会被同一道扫到。
 *   step       出手时垫前的一小步：速度给起手的冲量。
 *   notes      命中崩屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏，冷却随等级缩短；宽搔多花一点。
 *
 * 配置 `sweep`（宽搔式，默认关）双向取舍：开启＝爪痕道数 +2、张角放宽、每道覆盖更宽，适合扫一排或扫大体型；
 * 代价是每道威力 ×0.86、探出更近、起手与冷却更久。关闭（直搔式）＝痕少而长、每道更重、出手更快，适合点杀小目标。
 *
 * 伤害段 `claw` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("scratch", {
        /** 每道爪痕深浅：10.5 + 物攻偏移[−3,9] + 等级偏移[−2,5]；宽搔 ×0.86 / 直搔 ×1.12；夹 6..30。 */
        claw: formula(
            F.base(10.5).plus(F.stat("attack").minus(55).times(0.11).clamp(-3, 9))
                .plus(F.level().minus(15).times(0.05).clamp(-2, 5))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(0.86), F.const(1.12)))
                .clamp(6, 30).round(1),
            "每道爪痕", {
                unit: "威力",
                description: "每一道爪痕扫中对手那一下的基础威力；物攻定刃口、等级给熟练度。一次爪击有多道痕，同一目标被抓中几道就结算几道。对手防御、相性与暴击在命中时另算。"
            }),
        /** 爪痕道数：4 + 速度偏移[−0.8,2.4] ×0.014 + 宽搔 +2 / 直搔 −1；夹 2..7。 */
        lines: formula(
            F.base(4).plus(F.stat("speed").minus(60).times(0.014).clamp(-0.8, 2.4))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(2), F.const(-1)))
                .clamp(2, 7).round(0),
            "爪痕道数", {
                unit: "道",
                description: "这一爪同时划出几道痕；速度快的个体抬手更快、多划一道。道数是真实判定次数，画面里的爪痕数量与它一致。"
            }),
        /** 爪痕张角：52 + 宽搔 +24 / 直搔 −14；夹 28..92 度。 */
        span: formula(
            F.base(52).plus(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(24), F.const(-14)))
                .clamp(28, 92).round(0),
            "爪痕张角", {
                unit: "度",
                description: "一整排爪痕铺开多大扇面；宽搔式更开、能罩住并排或大体型的对手，直搔式收拢成一道窄弧。"
            }),
        /** 爪痕探出距离：2.05 + 身高偏移[−0.3,0.8] ×0.5；宽搔 −0.15 / 直搔 +0.28；夹 1.6..2.9。 */
        reach: formula(
            F.base(2.05).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 0.8))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(-0.15), F.const(0.28)))
                .clamp(1.6, 2.9).round(2),
            "爪痕探距", {
                unit: "格",
                description: "爪痕从身体探出多远；身高给前肢舒展的长度。它也是本招的实际射程来源。"
            }),
        /** 单道爪痕半宽：0.21 + 体宽偏移[−0.03,0.13] ×0.13；夹 0.16..0.42。 */
        line: formula(
            F.base(0.21).plus(F.body("width").minus(0.9).times(0.13).clamp(-0.03, 0.13)).clamp(0.16, 0.42).round(2),
            "爪痕半宽", {
                unit: "格",
                description: "单道爪痕的判定半宽；身板越宽爪面越厚，多宽的对手会被同一道痕扫到。画面里每道痕的粗细就是它。"
            }),
        /** 垫前一步：0.42 + 速度偏移[−0.2,0.5] ×0.006；夹 0.1..0.9。 */
        step: formula(
            F.base(0.42).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.5)).clamp(0.1, 0.9).round(2),
            "垫前一步", {
                unit: "格",
                description: "出爪时朝目标垫前的一小步；速度快的个体起手更冲。垫前只到判定边缘，不会冲过头。"
            }),
        /** 崩屑量：16 + 物攻偏移[−3,12] ×0.14；夹 10..42。 */
        notes: formula(
            F.base(16).plus(F.stat("attack").minus(55).times(0.14).clamp(-3, 12)).clamp(10, 42).round(0),
            "崩屑量", {
                unit: "个",
                description: "每一道爪痕命中处崩出的细屑数量，由物攻换算；表现按它发射，不是独立伤害。"
            }),
        /** 起手：6 − 速度偏移[−1,2] ×0.02 + 宽搔 +1 / 直搔 −1；夹 3..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(1), F.const(-1)))
                .clamp(3, 10).round(0),
            "起手", "抬爪到挥出的时间；速度越快越短，宽搔式多花一拍。"),
        /** 收招：5 − 速度偏移[−1,1.5] ×0.012 + 宽搔 +1；夹 3..9。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.012).clamp(-1, 1.5))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "挥完收回爪势的时间；速度越快越短。"),
        /** 冷却：20 − 速度偏移[−2,3] ×0.03 − 等级偏移[0,4] ×0.08 + 宽搔 +4；夹 12..34。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .minus(F.level().minus(15).times(0.08).clamp(0, 4))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.scratch.preference.sweep")), F.const(4), F.const(0)))
                .clamp(12, 34).round(0),
            "冷却", "两爪之间的等待；速度与等级让它回得更快，宽搔式更费。它也是全族最短的冷却。")
    });

    stages("scratch", [
        { level: 15, values: { claw: 12 } },
        { level: 33, values: { claw: 13.5, lines: 5 } }
    ]);

    defineDamage("scratch", "claw", {}, { contact: true, slice: true });

    describe("scratch", [
        { key: "description.0", values: ["claw", "lines"] },
        { key: "description.1", values: ["reach", "span", "line"] },
        { key: "approach", values: ["step"] },
        { key: "sweep.on", values: ["lines","span","claw"], when: function (context) { return read(context.detail.values, ["sweep"]) === true; } },
        { key: "sweep.off", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.claw"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.claw", "tier.1.lines"] }
    ]);
}
