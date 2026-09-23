/**
 * 挠痒 / Tickle 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 100／PP 20／目标 normal（单体）／boosts={atk:-1, def:-1}（攻击、防御各降一级）／
 *       flags 含 protect、reflectable、allyanim（接触类，可被保护挡下）。
 * 世界化：不是隔空扣等级，而是**必须贴到身上挠**——本组唯一近身的一招。手指要找得到人，所以射程最短；
 *   换来的是同时打垮物攻与物防，让贴身对拼的人瞬间软下来。命中后挂共享身份 world_combat:status/ticklish
 *   的真实 MobEffect，再调用 NativeEffects.boost 分别下降攻击与防御：宝可梦损失原生等级，其他生物落到
 *   攻击与护甲属性。「轻挠」出手快、掉得浅；「猛挠」要把人按住挠到底，起手与冷却都长，但两项各再多一级、
 *   笑得更久——想快还是想狠，由玩家取舍。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach       宽度 × 1.0 + 0.8 格，夹 1.6..2.6；身体越宽，伸手够得越远。
 *   atkDrop     基础 1 级，攻击 ≥ 90 升到 2 级，猛挠再 +1，夹 1..3；力气越大挠得越狠。
 *   defDrop     基础 1 级，等级 ≥ 45 升到 2 级，猛挠再 +1，夹 1..3；越熟练越找得到软肋。
 *   giggleTicks 100 + 亲密度 × 0.6，轻挠 ×0.9／猛挠 ×1.35，夹 70..260；越亲近越放得开、笑得更久。
 *   sparks      16 + (速度 − 60) × 0.3，夹 12..44；速度越快，一次挠出的碎点越多（也是画面里的数量）。
 *   tempo       轻挠 8／猛挠 13 − (速度 − 60) × 0.05 刻，夹 5..15；速度越快越早出手，猛挠要多花几刻压住对方。
 *   recharge    轻挠 120／猛挠 170 + (等级 − 30) × 0.6 刻，夹 105..220；等级越高越熟练。
 */
namespace PokemonSkills {
    export const tickleId = "tickle";
    export const tickleEffect = "world_combat:ticklish_fit";
    export const tickleScene = "world_combat:move_tickle";
    export const tickleSpot = "world_combat:status/ticklish";

    actionParameters.define(tickleId, {
        reach: formula(F.body("width").times(1.0).plus(0.8).clamp(1.6, 2.6).round(2), "挠痒距离", {
            unit: " 格",
            description: "要贴到多近才够得着；施法者身体越宽，伸手够得越远。"
        }),
        atkDrop: formula(
            F.base(1).plus(F.when(F.stat("attack").gte(90), F.const(1), F.const(0)))
                .plus(F.when(F.pref("firm", text("worldcombat.skill.tickle.preference.firm")), F.const(1), F.const(0))).clamp(1, 3),
            "攻击下降", {
                unit: " 级",
                description: "被挠痒者损失的攻击等级；施法者攻击达到 90 时 +1，猛挠再 +1。"
            }),
        defDrop: formula(
            F.base(1).plus(F.when(F.level().gte(45), F.const(1), F.const(0)))
                .plus(F.when(F.pref("firm", text("worldcombat.skill.tickle.preference.firm")), F.const(1), F.const(0))).clamp(1, 3),
            "防御下降", {
                unit: " 级",
                description: "被挠痒者损失的防御等级；等级达到 45 时 +1，猛挠再 +1。"
            }),
        giggleTicks: seconds(
            F.base(100).plus(F.individual("friendship").times(0.6))
                .times(F.when(F.pref("firm", text("worldcombat.skill.tickle.preference.firm")), F.const(1.35), F.const(0.9)))
                .clamp(70, 260).round(0),
            "笑不停时长", "目标笑到站不稳多久；施法者越亲近越放得开，猛挠笑得更久。"),
        sparks: formula(F.base(16).plus(F.stat("speed").minus(60).times(0.3)).clamp(12, 44).round(0), "碎点数", {
            unit: " 个",
            description: "一次挠出的碎点数量；速度越快越多，画面里的碎点也按它画出。"
        }),
        tempo: seconds(
            F.when(F.pref("firm", text("worldcombat.skill.tickle.preference.firm")),
                F.base(13).minus(F.stat("speed").minus(60).max(0).times(0.05)).clamp(9, 15),
                F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.05)).clamp(5, 11)),
            "起手", "伸手挠下去需要多久；速度越快越早出手，猛挠要多花几刻把人压住。"),
        recharge: seconds(
            F.when(F.pref("firm", text("worldcombat.skill.tickle.preference.firm")),
                F.base(170).plus(F.level().minus(30).max(0).times(0.6)).clamp(150, 220),
                F.base(120).plus(F.level().minus(30).max(0).times(0.6)).clamp(105, 160)),
            "冷却", "两次挠痒之间的等待；等级越高越熟练。")
    });
    describe(tickleId, [
        { key: "description.0", values: ["atkDrop", "defDrop", "giggleTicks"] },
        { key: "description.1", values: ["reach", "range"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
