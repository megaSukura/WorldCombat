/**
 * 暗影拳 / shadowpunch —— 参数与伤害段。
 *
 * 原生事实：Ghost、物理、威力 60、命中必定（accuracy true）、PP 20、接触、拳（punch）、无次要效果（Cobblemon 1.8）。
 * 翻译：把「使出混影之拳，攻击必定会命中」翻成即时战斗里的**一道沿地面窜出去的影子**——
 *   施法者本体不动，暗影从自己脚下窜到对手脚下的影子里，再从对手的影子中立起一只拳打它。
 *   拳的起点就在对手站的地方，对手没法预判，这就是「必中」的样子。
 * 数据分散（每个参数读不同的精灵数据）：
 *   shadow  拳力随物攻；
 *   reach   暗影突袭距离随等级与物攻；
 *   seep    暗影蔓延速度随速度（决定拳升起的延迟）；
 *   fist    拳判定半径随体型高度；
 *   rise    拳升起高度随体型高度；
 *   drag    地缚拖拽距离随物攻；
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 * 配置 hold（地缚／背刺）双向取舍：地缚让拳抓住并拽住对手（沿暗影把它拖向自己）制造控制，但拳力约 −15%；
 *   背刺不放慢、不加拖拽，一拳更重（约 +18%）。
 *
 * 伤害段：shadow 是影子拳的那一下。
 */
namespace PokemonSkills {
    actionParameters.define("shadowpunch", {
        /** 拳力：物攻每比 60 多 1 加 0.13，地缚 ×0.85、背刺 ×1.18，夹在 16..52。 */
        shadow: formula(
            F.base(30, "基础").plus(F.stat("attack").minus(60).times(0.13).as("物攻"))
                .times(F.when(F.pref("hold", text("worldcombat.skill.shadowpunch.preference.hold")), F.const(0.85), F.const(1.18)).as("出拳方式"))
                .clamp(16, 52).round(1),
            "拳力", {
                unit: "威力",
                description: "影子拳一记接触打击的威力；物攻越高越重。地缚把力分给控制，拳更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 突袭距离：基础 7 格，等级每比 30 高 1 加 0.06，物攻每比 60 多 1 加 0.02，夹在 4..11。 */
        reach: formula(
            F.base(7, "基础").plus(F.level().minus(30).times(0.06).as("等级"))
                .plus(F.stat("attack").minus(60).times(0.02).as("物攻"))
                .clamp(4, 11).round(1),
            "突袭距离", {
                unit: "格",
                description: "暗影能从脚下窜到多远的对手影子里；等级与物攻越高越远。它也是本招的实际射程。"
            }),
        /** 蔓延速度：基础 1.6 格/刻，速度每比 60 快 1 加 0.008，夹在 1..2.4。 */
        seep: formula(
            F.base(1.6, "基础").plus(F.stat("speed").minus(60).times(0.008).as("速度")).clamp(1, 2.4).round(2),
            "蔓延速度", {
                unit: "格/刻",
                description: "暗影沿地面爬向对手的速度；速度快的个体拳来得更早，对手更少时间挪开影子。"
            }),
        /** 判定半径：基础 0.4 格，碰撞箱每比 1.4 高 1 格加 0.08，夹在 0.3..0.7。 */
        fist: formula(
            F.base(0.4, "基础").plus(F.body("height").minus(1.4).times(0.08).as("体型")).clamp(0.3, 0.7).round(2),
            "判定半径", {
                unit: "格",
                description: "影子拳的横向判定半径；大个子凝出的拳更宽。"
            }),
        /** 升起高度：基础 1.0 格，碰撞箱每比 1.4 高 1 格加 0.2，夹在 0.7..1.5。 */
        rise: formula(
            F.base(1.0, "基础").plus(F.body("height").minus(1.4).times(0.2).as("体型")).clamp(0.7, 1.5).round(2),
            "升起高度", {
                unit: "格",
                description: "拳从对手影子里立起多高；身形越大拳头越高。画面与判定共用它。"
            }),
        /** 拖拽距离：基础 1.2 格，物攻每比 60 多 1 加 0.01，夹在 0.8..2.2。 */
        drag: formula(
            F.base(1.2, "基础").plus(F.stat("attack").minus(60).times(0.01).as("物攻")).clamp(0.8, 2.2).round(2),
            "拖拽距离", {
                unit: "格",
                description: "地缚时把对手沿暗影拖向施法者的距离；物攻越高拽得越远。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 短 0.04，夹在 4..12。 */
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(60).times(0.04).as("速度")).clamp(4, 12).round(0),
            "起手", "脚下暗影攒到能窜出去需要多久；快个体更早出手。"),
        /** 收招：基础 7 刻，夹在 3..12。 */
        settle: seconds(F.base(7, "基础").clamp(3, 12).round(0), "收招", "影子窜出之后的收势时间。"),
        /** 冷却：基础 50 刻，等级每比 20 高 1 短 0.5，夹在 28..80。 */
        recharge: seconds(
            F.base(50, "基础").minus(F.level().minus(20).max(0).times(0.5).as("等级")).clamp(28, 80).round(0),
            "冷却", "两次出拳之间的等待；等级越高越熟练。")
    });

    defineDamage("shadowpunch", "shadow", {}, { contact: true, punch: true });

    stages("shadowpunch", [
        { level: 34, values: { shadow: 36, reach: 7.6 } },
        { level: 50, values: { shadow: 46, drag: 1.8 } }
    ]);

    describe("shadowpunch", [
        { key: "description.0", values: ["shadow"] },
        { key: "description.1", values: ["reach","seep"] },
        { key: "hold.on", values: ["drag"], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shadow", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shadow", "tier.1.drag"] }
    ]);
}
