/**
 * 十万马力 / highhorsepower 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Ground／物理／威力 95／命中 95／PP 10／优先度 0／接触／单体，
 *   `secondary: null`，没有任何附加效果；103 位学习者。原生描述「使出全身力量，猛攻对手」。
 *
 * 翻译：把「整个身体就是武器」落成一记**压低重心、用全身质量压上去的平地冲撞**。它没有自伤、没有地形、
 *   没有附带状态——这一招的全部内容就是「份量」：身体越重压得越沉、起步越快冲得越急。为了让这份份量
 *   成为看得见的东西，本招把体重与速度算成一个「马力」数（`might`），在撞击点上方浮出，并直接驱动撞击
 *   扬尘的数量；两只精灵放同一招时，画面里的尘量和那个数字都会不同。
 *
 * 与同族分开：蛮力（superpower）是一记舍身突进、收招后自身攻防各降一级并在地面留坑；直冲钻（drillrun）
 *   旋转钻穿一条线、在地面犁沟；泰山压顶（bodyslam）从上方砸落、可能压麻。十万马力只有一次贴地的正面
 *   冲撞，撞完自己站住、什么也不留下——辨识点是「用体重的平地冲撞 + 一个马力数」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   drive   冲撞威力：物攻给狠度，体重给份量，等级拾级抬升；压身式更重、顶头式更轻。
 *   charge  冲程：速度决定起步冲多远、身高决定步幅；同时是本招实际射程。
 *   rush    冲速：速度决定每刻推进的距离。
 *   hoof    踏地判定：碰撞箱宽度决定正面撞面，身高决定竖直覆盖。
 *   shove   顶开距离：自身体重给推力，**目标体重**把顶开距离压下来；压身式把力往下用、顶头式把人送远。
 *   might   马力数：体重与速度换算出的份量读数，浮在撞击点上方，并驱动扬尘的数量。
 *   dust    扬尘量：物攻与体重换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏；压身式更慢更贵，顶头式更快更便宜。
 *
 * 配置 `press`（压身式，默认关）双向取舍：
 *   开（压身式）：威力 ×1.08、撞击点向下压出一圈更重的尘环，但顶开 ×0.6（把目标留在身边）、冲程 ×0.9、
 *     冷却 +6 刻——适合把对手钉在自己近身继续打。
 *   关（顶头式）：顶开 ×1.25、冲程 ×1.1、冷却 −4 刻，但威力 ×0.95——适合把目标撞离阵地、拉开距离。
 *
 * 伤害段 `drive` 与参数同名，`contact: true`，原始类别 Physical（Ground）；对手物防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    export const highhorsepowerId = "highhorsepower";
    export const highhorsepowerScene = "world_combat:move_highhorsepower";
    export const highhorsepowerMightText = "world_combat.move.highhorsepower.text.might";
    export const highhorsepowerMissText = "world_combat.move.highhorsepower.text.miss";

    actionParameters.define(highhorsepowerId, {
        /** 冲撞威力：基础 95；物攻每比 55 多 1 加 0.28（夹 −14..42）；体重每比 300 重 1 加 0.018（夹 −6..40）；
         *  等级每比 20 高 1 加 0.3（夹 0..18）；压身 ×1.08 / 顶头 ×0.95；夹 62..190。 */
        drive: formula(
            F.base(95).plus(F.stat("attack").minus(55).times(0.28).clamp(-14, 42))
                .plus(F.body("weight").minus(300).times(0.018).clamp(-6, 40))
                .plus(F.level().minus(20).times(0.3).clamp(0, 18))
                .times(F.when(F.pref("press", text("worldcombat.skill.highhorsepower.preference.press")), F.const(1.08), F.const(0.95)))
                .clamp(62, 190).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "整个身体压上去这一下的基础威力；物攻给狠度、体重给份量、等级拾级抬升。压身式把力压在近处、顶头式略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 3.4 格；速度每比 55 快 1 加 0.016（夹 −0.5..1.1）；身高每比 1.4 高 1 格加 0.6（夹 −0.2..1.0）；
         *  压身 ×0.9 / 顶头 ×1.1；夹 2.6..5.4。 */
        charge: formula(
            F.base(3.4).plus(F.stat("speed").minus(55).times(0.016).clamp(-0.5, 1.1))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.2, 1.0))
                .times(F.when(F.pref("press", text("worldcombat.skill.highhorsepower.preference.press")), F.const(0.9), F.const(1.1)))
                .clamp(2.6, 5.4).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到撞上的总位移，也是本招的实际射程；腿快、个子大的个体够得到更远，压身式收得更短。"
            }),
        /** 冲速：基础 0.5 格/刻；速度每比 55 快 1 加 0.005（夹 −0.12..0.3）；夹 0.34..0.95。 */
        rush: formula(
            F.base(0.5).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.3)).clamp(0.34, 0.95).round(2),
            "冲速", {
                unit: "格/刻",
                description: "冲撞时每刻前进的距离；速度快的个体更急，越快贴上越难被走位让开。"
            }),
        /** 踏地判定：基础 0.45 格；碰撞箱每比 0.9 宽 1 加 0.3（夹 −0.06..0.3）；身高每比 1.4 高 1 加 0.12（夹 −0.05..0.24）；
         *  夹 0.36..0.95。 */
        hoof: formula(
            F.base(0.45).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.06, 0.3))
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.24)).clamp(0.36, 0.95).round(2),
            "踏地判定", {
                unit: "格",
                description: "整个人撞出去时正面扫过的判定半径；身板越宽越大撞面越宽、身高决定竖直覆盖。"
            }),
        /** 顶开距离：基础 0.7 格；自身体重每比 300 重 1 加 0.0006（夹 −0.2..0.9）；
         *  减去目标体重超出 300 的部分每 1 单位 0.0005（最多减 0.7）；压身 ×0.6 / 顶头 ×1.25；夹 0.25..1.8。 */
        shove: formula(
            F.base(0.7).plus(F.body("weight").minus(300).times(0.0006).clamp(-0.2, 0.9))
                .minus(F.target("body.weight").minus(300).times(0.0005).clamp(0, 0.7))
                .times(F.when(F.pref("press", text("worldcombat.skill.highhorsepower.preference.press")), F.const(0.6), F.const(1.25)))
                .clamp(0.25, 1.8).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞中后把目标沿冲撞方向顶开多远；自己越重推得越远，目标越重越推不动。压身式把力往下用、留人在近处，顶头式把人送出去。"
            }),
        /** 马力数：体重×0.35 + 速度×2 + 物攻×0.5，再 ×20 后取整到百位；夹 1000..99000。 */
        might: formula(
            F.body("weight").times(0.35).as("体重")
                .plus(F.stat("speed").times(2).as("速度"))
                .plus(F.stat("attack").times(0.5).as("物攻"))
                .times(20).div(100).round().times(100).clamp(1000, 99000),
            "马力", {
                unit: "马力",
                description: "把这次冲撞的份量换算成一个读数：体重给出质量、速度给出冲势、物攻给出蹬地的力。它浮在撞击点上方，并决定撞击扬尘的数量——两只精灵放同一招时这个数字不一样。"
            }),
        /** 扬尘量：基础 16；物攻每比 55 多 1 加 0.3（夹 −4..28）；体重每比 300 重 1 加 0.006（夹 −3..20）；夹 12..56。 */
        dust: formula(
            F.base(16).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 28))
                .plus(F.body("weight").minus(300).times(0.006).clamp(-3, 20)).clamp(12, 56).round(0),
            "扬尘量", {
                unit: "个",
                description: "冲撞与撞击扬起的尘屑数量，随物攻与体重增长；粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：基础 7 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2.5）；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "起手", "压低重心、把力气沉进腿里的时间；速度越快越干脆。"),
        /** 收招：基础 8 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；夹 4..13。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(4, 13).round(0),
            "收招", "撞完刹住、重新站稳的时间；速度越快收得越利落。"),
        /** 冷却：基础 30 刻；速度每比 55 快 1 减 0.05（夹 −4..7）；压身 +6 / 顶头 −4；夹 16..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7))
                .plus(F.when(F.pref("press", text("worldcombat.skill.highhorsepower.preference.press")), F.const(6), F.const(-4)))
                .clamp(16, 44).round(0),
            "冷却", "两次全身冲撞之间等待多久；速度快的个体回气更快，压身式更沉更久。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.04)
    });

    stages(highhorsepowerId, [
        { level: 35, values: { drive: 108, charge: 3.9 } },
        { level: 55, values: { drive: 122, shove: 0.95 } }
    ]);

    defineDamage(highhorsepowerId, "drive", {}, { contact: true });

    describe(highhorsepowerId, [
        { key: "description.0", values: ["drive","shove"] },
        { key: "description.1", values: ["charge","rush","hoof"] },
        { key: "press.on", values: [], when: function (context) { return read(context.detail.values, ["press"]) === true; } },
        { key: "press.off", values: [], when: function (context) { return read(context.detail.values, ["press"]) !== true; } },
        { key: "description.aim", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drive", "tier.0.charge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drive", "tier.1.shove"] }
    ]);
}
