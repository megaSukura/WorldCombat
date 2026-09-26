/**
 * 出奇一击 / feintattack —— 参数与伤害段。
 *
 * 原生事实：Dark、物理、威力 60、命中必定（accuracy true）、PP 20、接触、无次要效果（Cobblemon 1.8）。
 * 翻译：把「悄悄地靠近对手，趁其不备进行殴打」翻成即时战斗里的**一次绕背偷袭**——施法者先隐去身影，
 *   在对手注意力之外闪到它背后，贴着背打出一记接触重拳；不是打得更准，而是对手根本没在看那一侧。
 * 数据分散（每个参数读不同的精灵数据）：
 *   strike   拳力随物攻；
 *   behind   背后落点距离随体型高度（大个子站得更靠后）；
 *   reach    突进距离随速度与等级；
 *   decoyTicks佯攻持续随等级；
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 * 配置 decoy（佯攻／潜袭）双向取舍：佯攻在对手正面留一个暗影替身短暂引开它的注意力，自己从背后打，
 *   但起手多 4 刻、冷却多 8 刻；潜袭不设替身，来得更快更省，但少了牵制。
 *
 * 伤害段：strike 是绕背后的一记接触拳。
 */
namespace PokemonSkills {
    actionParameters.define("feintattack", {
        /** 拳力：物攻每比 60 多 1 加 0.12，夹在 16..48。 */
        strike: formula(
            F.base(28, "基础").plus(F.stat("attack").minus(60).times(0.12).as("物攻")).clamp(16, 48).round(1),
            "拳力", {
                unit: "威力",
                description: "绕背后一记接触拳的威力；物攻越高越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 背后落点距离：基础 0.85 格，碰撞箱每比 1.4 高 1 格加 0.15，夹在 0.7..1.4。 */
        behind: formula(
            F.base(0.85, "基础").plus(F.body("height").minus(1.4).times(0.15).as("体型")).clamp(0.7, 1.4).round(2),
            "背后落点", {
                unit: "格",
                description: "闪到对手背后时站得多远；身形越大站得越靠后。"
            }),
        /** 突进距离：基础 6.5 格，速度每比 60 快 1 加 0.04，等级每比 30 高 1 加 0.05，夹在 4..10。 */
        reach: formula(
            F.base(6.5, "基础").plus(F.stat("speed").minus(60).times(0.04).as("速度"))
                .plus(F.level().minus(30).times(0.05).as("等级"))
                .clamp(4, 10).round(1),
            "突进距离", {
                unit: "格",
                description: "能闪到多远的对手背后；速度与等级越高闪得越远。它也是本招的实际射程。"
            }),
        /** 佯攻持续：基础 50 刻，等级每比 20 高 1 加 1.2，夹在 30..110。 */
        decoyTicks: seconds(
            F.base(50, "基础").plus(F.level().minus(20).max(0).times(1.2).as("等级")).clamp(30, 110).round(0),
            "佯攻持续", "暗影替身能撑多久；等级越高引开注意力的时间越长。"),
        /** 起手：基础 7 刻，速度每比 60 快 1 短 0.05，夹在 3..11。 */
        tempo: seconds(
            F.base(7, "基础").minus(F.stat("speed").minus(60).times(0.05).as("速度")).clamp(3, 11).round(0),
            "起手", "隐去身影并绕到背后需要多久；快个体更早出手。"),
        /** 收招：基础 6 刻，夹在 3..10。 */
        settle: seconds(F.base(6, "基础").clamp(3, 10).round(0), "收招", "绕背后收势的时间。"),
        /** 冷却：基础 45 刻，等级每比 20 高 1 短 0.4，夹在 25..70。 */
        recharge: seconds(
            F.base(45, "基础").minus(F.level().minus(20).max(0).times(0.4).as("等级")).clamp(25, 70).round(0),
            "冷却", "两次绕背之间的等待；等级越高越熟练。")
    });

    defineDamage("feintattack", "strike", {}, { contact: true });

    stages("feintattack", [
        { level: 34, values: { strike: 34, reach: 7.4 } },
        { level: 50, values: { strike: 44, decoyTicks: 80 } }
    ]);

    describe("feintattack", [
        { key: "description.0", values: ["strike"] },
        { key: "description.1", values: ["reach", "behind"] },
        { key: "description.2", values: ["decoyTicks"] },
        { key: "description.aim", values: [] },
        { key: "decoy.on", values: [], when: function (context) { return read(context.detail.values, ["decoy"]) === true; } },
        { key: "decoy.off", values: [], when: function (context) { return read(context.detail.values, ["decoy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.strike", "tier.1.decoyTicks"] }
    ]);
}
