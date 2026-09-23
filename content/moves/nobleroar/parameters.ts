/**
 * 战吼 / nobleroar 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 100、PP 30、目标 normal（单体）、boosts { atk:-1, spa:-1 }、
 *   带 sound 旗标（穿替身、隔着障碍也能听见）。
 *
 * 翻译：把「一声战吼」展开成**朝身前推出的一片锥形声压**——巨兽站定、把胸一挺，低音像一堵墙压出去，
 * 正面一片敌人都被压住气势（物攻、特攻各降）。锥的张角与长度来自施法者身板（越高越宽的喉咙），
 * 吼得越深（配置低吼）越窄、但每一级压得越狠。这是本组里唯一作用于**身前一片**、且唯一的声波招。
 * 与同族的自我激励／生长（自己 +）和装饰（把力量送给别人）分开：战吼只做减法，且是对着一片做的。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   reach   锥长：基础 4 格 + 碰撞箱高度×1.2 + 等级×0.02，低吼 ×1.15；夹 3.5..9。
 *   arc     张角：基础 65 度 + 碰撞箱高度×10 + 体重/300，怒吼 ×1.35／低吼 ×0.62；夹 35..150。
 *   cow     掉级：怒吼 1／低吼 2；夹 1..2。每级约削 33% 攻击（公共能力阶梯）。
 *   volume  粒子量：基础 24 + 体重/6；夹 24..70。越重的个体声浪越厚。
 *   falter  气短窗口：基础 120 刻 + 等级×3；夹 120..320。
 *   tempo   起手：速度每比 60 快 1 减 0.03 刻，低吼 +2；夹 6..14。
 *   aftercast 收招：基础 8 + 碰撞箱高度；夹 7..12。
 *   wait    冷却：基础 96 刻 − 等级×0.6，低吼 +12；夹 60..105。PP 30 的代价。
 * 配置 form（怒吼／低吼）：怒吼铺得更开、每级只降 1；低吼更窄更远、每级降 2——覆盖与深度之间的取舍。
 */
namespace PokemonSkills {
    actionParameters.define("nobleroar", {
        /** 锥长：身板与等级决定。 */
        reach: formula(
            F.base(4).plus(F.body("height").times(1.2)).plus(F.level().times(0.02))
                .times(F.when(F.pref("form", text("worldcombat.skill.nobleroar.preference.form")), F.const(1.15), F.const(1)))
                .clamp(3.5, 9).round(2),
            "声压长度", {
                unit: " 格",
                description: "战吼声压推出去的锥长；碰撞箱越高、等级越高推得越远，低吼再多 15%。画面里锥形铺到哪，就是会被吼到哪。"
            }),
        /** 张角：喉咙越大吼得越开。 */
        arc: formula(
            F.base(65).plus(F.body("height").times(10)).plus(F.body("weight").div(300))
                .times(F.when(F.pref("form", text("worldcombat.skill.nobleroar.preference.form")), F.const(0.62), F.const(1.35)))
                .clamp(35, 150).round(0),
            "声压张角", {
                unit: " 度",
                description: "声压锥的张角；身板越高、体重越大张得越开，怒吼再 ×1.35、低吼收到 ×0.62。"
            }),
        /** 掉级：覆盖与深度之间的取舍由配置决定。 */
        cow: formula(
            F.when(F.pref("form", text("worldcombat.skill.nobleroar.preference.form")), F.const(2), F.const(1)).clamp(1, 2).round(0),
            "掉级", {
                unit: " 级",
                description: "锥内每个敌人掉的物攻与特攻等级；怒吼 1 级铺得开，低吼 2 级压得深。"
            }),
        /** 粒子量：体重决定声浪厚度。 */
        volume: formula(
            F.base(24).plus(F.body("weight").div(6)).clamp(24, 70).round(0),
            "声浪量", {
                unit: " 点",
                description: "战吼喷出的声浪粒子数量；体重越大声浪越厚，画面里的量就是它。"
            }),
        /** 气短窗口：吼到多久。 */
        falter: seconds(
            F.base(120).plus(F.level().times(3)).clamp(120, 320).round(0),
            "气短窗口", "「气短」标记在敌人身上挂多久；等级越高吼得越久。等级下降由公共能力阶梯独立保留。"),
        /** 起手：速度决定把气吸满多快。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("form", text("worldcombat.skill.nobleroar.preference.form")), F.const(2), F.const(0))).clamp(6, 14).round(0),
            "起手", "挺胸吸气、把低音压到喉咙需要多久；速度越高越快，低吼要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(8).plus(F.body("height")).clamp(7, 12).round(0),
            "收招", "吼完的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(96).minus(F.level().times(0.6))
                .plus(F.when(F.pref("form", text("worldcombat.skill.nobleroar.preference.form")), F.const(12), F.const(0))).clamp(60, 105).round(0),
            "冷却", "两次战吼之间的等待；等级越高越短，低吼更长。PP 30 的代价。")
    });

    describe("nobleroar", [
        { key: "description.0", values: ["cow", "reach", "arc"] },
        { key: "description.1", values: ["falter"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: [] }
    ]);
}
