/**
 * 翅膀攻击 / wingattack —— 参数与伤害段。
 *
 * 原生事实：Flying／物理／威力 60／命中 100／PP 35／优先度 0／接触（Cobblemon 1.8 / Showdown）。
 *   描述「大大地展开美丽的翅膀，将其撞向对手进行攻击。」
 *
 * 翻译：把「展开翅膀撞过去」落成一次**展翅的宽幅横扫**——翅膀张多宽，扇面就有多宽；扇面里的对手各挨
 *   一记接触伤害，并被沿身体两侧推开。它是飞系里最基础、最便宜的一记：命中 100 翻成「稳定、无散布」，
 *   PP 35 的富余翻成「起手短、冷却低，可以反复扇」。这是它和双翼（俯冲上扬两拍、自身移动）分开的地方：
 *   翅膀攻击站定、只出一拍，宽度就是它的身份。
 *
 * 配置 `wide`（宽扫式）双向取舍：开＝扇面更宽、可同时扫到至多 3 个、推得更远，代价是单体威力 ×0.8、
 *   起手 +1 刻、收招 +2 刻；关（收翼式）＝单发更重（×1.15）、出手更利落，但只扫一人、推得近。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   bash    横扫威力 ← 物攻（力道）＋体重（身体的分量），wide ×0.8 / 收翼 ×1.15。
 *   reach   横扫长度 ← 体型高度（个子越高，翅膀探得越远）。
 *   span    扇面宽度 ← 体型宽度（翅膀展得越宽，扇面越开）。
 *   push    推开距离 ← 物攻，wide ×1.3 / 收翼 ×0.5。
 *   targets 命中人数 ← 配置（宽扫至多 3、收翼 1）。
 *   chaff   落羽量 ← 物攻。
 *   tempo／aftercast／recharge ← 速度。
 *
 * 伤害段 `bash` 与参数同名，走共享换算（原始类别 Physical），并声明为接触；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("wingattack", {
        /** 横扫威力：38 + 物攻偏移[−10,26] + 体重偏移[−2,8]；wide ×0.8 / 收翼 ×1.15；夹 24..78。 */
        bash: formula(
            F.base(38)
                .plus(F.stat("attack").minus(50).times(0.16).clamp(-10, 26))
                .plus(F.body("weight").minus(40).times(0.03).clamp(-2, 8))
                .times(F.when(F.pref("wide", text("worldcombat.skill.wingattack.preference.wide")), F.const(0.8), F.const(1.15)))
                .clamp(24, 78).round(1),
            "横扫威力", {
                unit: "威力",
                description: "翅膀扫实那一下的威力；物攻越高越有力，身体越沉带的分量越多。宽扫式把力道摊给更多人。对手防御、相性与暴击在命中时另算。"
            }),
        /** 横扫长度：3.2 + 体型高度偏移[−0.2,1.0]；夹 2.6..4.8。 */
        reach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 1.0)).clamp(2.6, 4.8).round(2),
            "横扫长度", {
                unit: "格",
                description: "翅膀能扫到多远的对手；个子越高翅膀探得越远。它也是本招的实际射程来源，画出的扇面半径与它一致。"
            }),
        /** 扇面宽度：150 + 体型宽度偏移[−20,60]；夹 110..220。 */
        span: formula(
            F.base(150).plus(F.body("width").minus(0.9).times(40).clamp(-20, 60)).clamp(110, 220).round(0),
            "扇面宽度", {
                unit: "°",
                description: "翅膀展开的宽度决定了扇面有多开；体宽越大扇得越广。判定与表现共用这同一个扇面角度。"
            }),
        /** 推开距离：0.5 + 物攻偏移[−0.1,0.5]；wide ×1.3 / 收翼 ×0.5；夹 0.25..1.1。 */
        push: formula(
            F.base(0.5).plus(F.stat("attack").minus(50).times(0.004).clamp(-0.1, 0.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.wingattack.preference.wide")), F.const(1.3), F.const(0.5)))
                .clamp(0.25, 1.1).round(2),
            "推开距离", {
                unit: "格",
                description: "被扫中的对手沿背离施法者的方向被推开多远；物攻越高推得越远。宽扫式推得更开，收翼式几乎只留在原地。"
            }),
        /** 命中人数：1 + 宽扫 2；夹 1..3。 */
        targets: formula(
            F.base(1).plus(F.when(F.pref("wide", text("worldcombat.skill.wingattack.preference.wide")), F.const(2), F.const(0))).clamp(1, 3).round(0),
            "命中人数", {
                unit: "人",
                description: "这一次展翅最多扫到几个非友方；宽扫式可同时扫到 3 个，收翼式只扫一个。表现里的扇面填充量按它派生。"
            }),
        /** 落羽量：10 + 物攻偏移[−2,8]；夹 8..20。 */
        chaff: formula(
            F.base(10).plus(F.stat("attack").minus(50).times(0.1).clamp(-2, 8)).clamp(8, 20).round(0),
            "落羽量", {
                unit: "根",
                description: "翅膀扫过时抖落的羽毛数量，由物攻换算；它驱动横扫与命中的羽毛表现，不是独立伤害。"
            }),
        /** 起手：4 刻 − 速度偏移[0,1.2]；wide +1；夹 2..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.2))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.wingattack.preference.wide")), F.const(1), F.const(0)))
                .clamp(2, 7).round(0),
            "起手", "展开双翼、把身体拧进扇面的时间；速度越快越短，宽扫式要多张一下。"),
        /** 收招：6 刻 − 速度偏移[0,1]；wide +2；夹 3..9。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.5, 1))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.wingattack.preference.wide")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "扫完之后把展开的翅膀收拢的时间；宽扫式张得大、收得更慢。"),
        /** 冷却：13 刻 − 速度偏移[0,2]；夹 8..20。 */
        recharge: seconds(
            F.base(13).minus(F.stat("speed").minus(50).times(0.03).clamp(-1.5, 2)).clamp(8, 20).round(0),
            "冷却", "再展一次翅前的等待；这一记便宜、回得快。")
    });

    defineDamage("wingattack", "bash", {}, { contact: true });

    stages("wingattack", [
        { level: 25, values: { bash: 48 } },
        { level: 42, values: { bash: 60, reach: 4.0 } }
    ]);

    describe("wingattack", [
        { key: "description.0", values: ["bash","targets"] },
        { key: "description.1", values: ["reach", "span", "push"] },
        { key: "description.2", values: [] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bash", "tier.1.reach"] }
    ]);
}
