/**
 * 描绘 / doodle — 参数与机制数值来源。
 *
 * 核心念头：把对手的本质描成一张图样，摊开盖到自己和每一只够近的同伴身上。同族里只有它一次作用于多个目标，
 *   而且是“给”：把对手的特性复制给整支队伍。
 * 原生：Normal／变化／命中 100／PP 10／单体；`onHit` 在目标特性带 failroleplay 时失败，否则遍历
 *   `source.alliesAndSelf()`，把每个特性不同且没带 cantsuppress 的队友换成目标特性。即时化把“换特性”实现成
 *   共享 `NativeModifiers` 的 ability 层（与扮演同一机制），并给每个被盖印的宝可梦挂上共享身份
 *   `world_combat:status/doodle` 的“已描绘”标记。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     读稿距离：体型与等级决定能描到多远的本质。
 *   tempo     起手：速度决定描得多快。
 *   aftercast 收势：特防决定盖印后站得多稳。
 *   canvas    画幅半径：配置值加上施法者体型，决定哪些同伴会被一起描上；画幅越大冷却越长。
 *   hold      描绘时长：等级与特防支撑这层特性维持多久。
 *   recharge  冷却：速度决定多快能再描一次，画幅越大越久。
 *   marks     盖印数量：特攻决定画面里铺开的图样数量。
 * 配置项 canvas（画幅半径）是数值项：向大调覆盖更多同伴、冷却更长；向小调覆盖更少、冷却更短。
 */

namespace PokemonSkills {
    actionParameters.define("doodle", {
        reach: formula(
            F.base(8, "基础")
                .plus(F.body("height").minus(1.4).times(1.4).as("体型"))
                .plus(F.level().minus(30).times(0.06).clamp(0, 2.4).as("等级"))
                .clamp(6, 15).round(1),
            "读稿距离", { unit: "格", description: "能描到多远之外的本质；个头越高、等级越高看得越远。它也是本招实际射程的来源。" }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 6).as("速度")).clamp(4, 12).round(),
            "起手", "描摹并摊开图样所需时间；速度越快落笔越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(45).clamp(-1.2, 2.5).as("特防")).clamp(5, 12).round(),
            "收势", "盖印后的收势；特防越高压得越稳。"),
        canvas: formula(
            F.pref("canvas")
                .plus(F.body("height").minus(1.4).times(0.8).as("体型"))
                .clamp(2, 9),
            "画幅半径", { unit: " 格", description: "同伴要多近才会被一起描上；这是配置画幅加上施法者体型的合计。" }),
        hold: seconds(
            F.base(130, "基础")
                .plus(F.level().times(3).as("等级"))
                .plus(F.stat("specialDefence").div(3.5).as("特防"))
                .clamp(90, 900).round(),
            "描绘时长", "被盖印的临时特性维持多久；等级与特防越高越久。"),
        recharge: seconds(
            F.base(70, "基础")
                .minus(F.stat("speed").times(0.3).as("速度"))
                .plus(F.pref("canvas").minus(4.5).times(9).as("画幅"))
                .clamp(30, 150).round(),
            "冷却", "重新描绘需要多久；速度越快恢复越快，画幅越大越久。"),
        marks: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(55).as("特攻")).clamp(6, 18).round(),
            "盖印数量", { unit: "枚", description: "画面里铺开的图样数量；特攻越高越密。" }),
        squad: formula(
            F.base(2, "基础").plus(F.level().div(25).as("等级")).clamp(2, 6).round(),
            "同行上限", { unit: "只", description: "一次最多把图样盖到几只同伴身上；等级越高一次能带上越多。" })
    });

    stages("doodle", [{ level: 35, values: { cooldown: 80 } }, { level: 50, values: { cooldown: 68 } }]);

    describe("doodle", [
        { key: "world", values: ["hold", "canvas", "squad"] },
        { key: "description.0", values: ["reach", "tempo"] },
        { key: "description.1", values: ["canvas", "squad", "hold"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
