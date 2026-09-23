/**
 * 棉花防守 / cottonguard — 参数与数值来源。
 *
 * 原生事实：Grass、变化、威力 —、命中必中、PP 10、目标 self、boosts { def: +3 }（巨幅提高防御）。
 *
 * 翻译：把「用软绵绵的绒毛包裹住自己的身体」翻成**一层层鼓出来、把自己裹住的绒衣**——白绒从身上一圈圈炸开，
 *   越裹越厚，防御大幅提高；裹厚了就迈不开步。取原生「+3 防御、10 PP、纯自我防护」；放弃回合制里永久保留的等级 →
 *   即时交战里防御等级立刻写入公共能力阶梯，绒衣是一段可见窗口，被撕光/到期时等级一起收回（对手有一次磨掉它的反制）。
 *   本族里它与三招速度提升相对：它是唯一的防护，也是唯一会让自己变慢的一招（厚裹时）。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift      防御等级：厚裹 3 级／轻裹 2 级；夹 2..3。原生「巨幅」的对位，厚裹拉满。
 *   bloom     鼓开半径：基础 1.0 格 + 碰撞箱宽度×1.0；夹 0.9..2.6。体型越宽，绒层铺得越开。
 *   coatTicks 绒衣时长：基础 180 刻 + 等级×3；夹 150..420。等级越高绒衣撑得越久，厚裹再 ×1.2。
 *   fluff     绒团数量：基础 26 + 体重（kg）×0.25；夹 26..90。身体越沉，一次鼓出的绒团越多（也是画面里的数量）。
 *   layers    绒层数：基础 3 + 等级/12；夹 3..6。等级越高，裹的层数越多。
 *   tempo     起手：基础 8 刻 + 体重（kg）×0.01，厚裹再 +2；夹 7..16。越沉、裹得越厚，鼓起来越慢。
 *   aftercast 收招：基础 6 刻 + 碰撞箱高度×1.4；夹 6..12。身板越高大收得越慢。
 *   wait      冷却：基础 110 刻 − 等级×0.4，厚裹 ×1.15；夹 75..130。PP 10 的代价。
 * 配置 cocoon（绒层）双向取舍：厚裹防御 3 级、但期间移动速度下降、起手与冷却更长；轻裹防御 2 级、但不拖慢移动、更快。
 *   两向各有局面（硬吃爆发 vs 保持走位）。
 */
namespace PokemonSkills {
    actionParameters.define("cottonguard", {
        /** 防御等级：原生「巨幅」的对位。 */
        gift: formula(
            F.when(F.pref("cocoon", text("worldcombat.skill.cottonguard.preference.cocoon")), F.const(3), F.const(2)).clamp(2, 3).round(0),
            "防御等级", {
                unit: " 级",
                description: "绒衣抬高的防御等级；厚裹 3 级，轻裹 2 级。"
            }),
        /** 鼓开半径：体型越宽铺得越开。 */
        bloom: formula(
            F.base(1.0).plus(F.body("width").times(1.0))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.cottonguard.preference.cocoon")), F.const(1.15), F.const(1)))
                .clamp(0.9, 2.6).round(2),
            "鼓开半径", {
                unit: " 格",
                description: "白绒从身上鼓开的半径；碰撞箱越宽铺得越开，厚裹再 ×1.15。画面里的绒环就是这个半径。"
            }),
        /** 绒衣时长：窗口走完防御等级收回。 */
        coatTicks: seconds(
            F.base(180).plus(F.level().times(3))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.cottonguard.preference.cocoon")), F.const(1.2), F.const(0.85)))
                .clamp(150, 420).round(0),
            "绒衣时长", "绒衣在身上撑多久；等级越高越久，厚裹再 ×1.2。绒衣被撕光或到期时这段防护抬起的等级一起收回。"),
        /** 绒团数量：身体越沉鼓得越多。 */
        fluff: formula(
            F.base(26).plus(F.body("weight").div(10).times(0.25)).clamp(26, 90).round(0),
            "绒团数量", {
                unit: " 团",
                description: "一次鼓开的绒团数量；身体越沉鼓得越多，粒子按它发射。"
            }),
        /** 绒层数：等级越高裹得越多层。 */
        layers: formula(
            F.base(3).plus(F.level().div(12)).clamp(3, 6).round(0),
            "绒层数", {
                unit: " 层",
                description: "绒衣裹了几层；等级越高层数越多，表现里的绒环按它一圈圈推开。"
            }),
        /** 起手：越沉、裹得越厚，鼓得越慢。 */
        tempo: seconds(
            F.base(8).plus(F.body("weight").div(10).times(0.01))
                .plus(F.when(F.pref("cocoon", text("worldcombat.skill.cottonguard.preference.cocoon")), F.const(2), F.const(0)))
                .clamp(7, 16).round(0),
            "起手", "白绒鼓满全身需要多久；身体越沉越慢，厚裹再 +2 刻（也更容易被打断）。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.4)).clamp(6, 12).round(0),
            "收招", "裹好之后站定的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，厚裹更长。 */
        wait: seconds(
            F.base(110).minus(F.level().times(0.4))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.cottonguard.preference.cocoon")), F.const(1.15), F.const(0.85)))
                .clamp(75, 130).round(0),
            "冷却", "两次裹身之间的等待；等级越高越短，厚裹更长。PP 10 的代价。")
    });

    stages("cottonguard", [
        { level: 45, values: { coatTicks: 240, wait: 95 } },
        { level: 60, values: { coatTicks: 280, wait: 85 } }
    ]);

    describe("cottonguard", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["coatTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "cocoon.on", values: [], when: function (context) { return read(context.detail.values, ["cocoon"]) === 1; } },
        { key: "cocoon.off", values: [], when: function (context) { return read(context.detail.values, ["cocoon"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.coatTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.coatTicks", "tier.1.wait"] }
    ]);
}
