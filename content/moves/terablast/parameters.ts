/**
 * 太晶爆发 / terablast —— 参数与伤害段。
 *
 * 核心念头：把使用者自己凝成一块太晶，用它最强的那一面打出去。物攻更高就化成晶矛
 * （物理，一支厚重的单发晶弹，撞上第一个目标即碎并把目标顶开），特攻更高就放出晶束
 * （特殊，一条固定方向的窄线从身前逐段推进，线内每个敌人各只挨一次总威力，被方块截断）。
 * 伤害属性就是这只个体的主属性（原生「太晶属性」在世界里的读法），分类由物攻/特攻实时比较决定。
 *
 * 数值来源：原生 basePower 80、命中 100、单一目标、无次要效果；原生「太晶化后取太晶属性、
 * 比较物攻与特攻取较高一项」翻成运行时读取（伤害段的 resolve 读原生属性与六维）。
 * 原生固定 80 只作公式起点：威力、矛速、束速、判定、顶开全部由精灵数据派生。
 */
namespace PokemonSkills {
    actionParameters.define("terablast", {
        // 用最强的一面出手：越强的那一项越高，这一下越重。
        power: formula(
            F.base(80).plus(F.stat("attack").max(F.stat("specialAttack")).minus(80).max(0).times(0.2)).clamp(48, 150).round(1),
            "威力", { unit: "威力", description: "由物攻与特攻中较高的一项成长。" }),
        // 形态选择量：>0 走晶矛（物理），<0 走晶束（特殊）。玩家在悬浮里读到这次会用哪一面。
        edge: formula(
            F.stat("attack").minus(F.stat("specialAttack")),
            "物攻与特攻之差", { unit: "点", description: "大于 0 为晶矛，小于 0 为晶束。" }),
        // 晶矛的推进速度：厚重单发，速度越高略快，但整体比晶束慢。
        ramSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(40).max(0).times(0.005)).clamp(0.9, 1.9).round(2),
            "晶矛速度", { unit: " 格/刻", description: "越快投出的晶矛略急。" }),
        // 晶束每刻推进的段长：速度越高，窄线铺得越快。
        beamSpeed: formula(
            F.base(2.2).plus(F.stat("speed").minus(40).max(0).times(0.010)).clamp(1.5, 3.4).round(2),
            "晶束推进", { unit: " 格/刻", description: "越快线头推进越急，整条线更早铺满。" }),
        // 晶矛判定粗细：体型越高，晶体越粗。
        collisionRadius: formula(
            F.base(0.30).plus(F.body("height").minus(1.4).max(0).times(0.10)).clamp(0.22, 0.55).round(2),
            "晶矛判定半径", { unit: " 格", description: "大个子凝出的晶矛更粗。" }),
        // 晶束线宽：比晶矛细得多，是稳定的一条窄线。
        beamWidth: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).max(0).times(0.06)).clamp(0.12, 0.32).round(2),
            "晶束线宽", { unit: " 格", description: "大个子放出的晶束略宽，但始终是一条窄线。" }),
        // 晶矛命中把目标顶开多远：体重越重顶得越开。
        push: formula(
            F.base(0.35).plus(F.body("weight").div(10).times(0.03)).clamp(0.2, 1.1).round(2),
            "晶矛顶开", { unit: " 格", description: "体重越大，撞开越远。" }),
        // 晶束扫描步长：越小，被方块截断的位置越贴近真实墙面。
        beamScan: hidden(0.5)
    });
    // 伤害属性与分类在命中/预览时由同一读取器决定：属性取原生主属性，分类取物攻/特攻较高者。
    defineDamage("terablast", "power", { defenceCoefficient: 0.005, rationale: "太晶能量穿透略强，让最强一面的成长更明显。" }, {
        resolve: function (context) {
            var native = context.sourceFacts && context.sourceFacts.data.native;
            var pokemon = native && native.pokemon;
            if (!pokemon)
                return undefined;
            var stats = context.sourceFacts.stats, attack = stats.atk || 0, special = stats.spa || 0;
            return { type: String(pokemon.type(0)), category: attack > special ? "physical" : "special" };
        }
    });
    describe("terablast", [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["edge"] },
        { key: "description.2", values: ["collisionRadius", "beamWidth", "beamSpeed"] },
        { key: "description.additional", values: ["range"] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] }
    ]);
}
